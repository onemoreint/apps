-- =============================================================================
-- OptiConsulta · Migración 0009 · Funciones RPC clínicas
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilidades
-- -----------------------------------------------------------------------------
create or replace function private.sha256_json(p jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(p::text, 'sha256'), 'hex');
$$;
revoke all on function private.sha256_json(jsonb) from public;

create or replace function private.require_professional(p_org uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_prof uuid := private.current_professional_id(p_org);
begin
  if v_prof is null then
    raise exception 'Tu usuario no está vinculado a un profesional activo de esta óptica. Pide que te registren en Profesionales.'
      using errcode = '42501';
  end if;
  return v_prof;
end;
$$;
revoke all on function private.require_professional(uuid) from public;

create or replace function private.require_data_consent(p_org uuid, p_patient uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_data_consent(p_org, p_patient) then
    raise exception 'El paciente no tiene autorización vigente de tratamiento de datos. Regístrala en su ficha antes de continuar.'
      using errcode = '23514';
  end if;
end;
$$;
revoke all on function private.require_data_consent(uuid, uuid) from public;

-- Valida la agudeza visual según la notación configurada (si existe).
create or replace function private.check_visual_acuity(p_org uuid, p_value text, p_label text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_notation text;
  v_pattern  text;
begin
  if p_value is null then
    return;
  end if;
  if char_length(p_value) > 20 then
    raise exception '%: máximo 20 caracteres', p_label using errcode = '22023';
  end if;
  select av_notation into v_notation from public.org_settings where organization_id = p_org;
  -- Abreviaturas de baja visión aceptadas en cualquier notación.
  if v_notation is null or upper(p_value) ~ '^(CD|MM|PL|NPL)(\s|$)' then
    return;
  end if;
  v_pattern := case v_notation
    when 'snellen_pies'   then '^20/[0-9]{1,3}([+-][0-9])?$'
    when 'snellen_metros' then '^6/[0-9]{1,3}(\.[0-9])?([+-][0-9])?$'
    when 'decimal'        then '^[0-9](\.[0-9]{1,2})?$'
    when 'logmar'         then '^-?[0-9](\.[0-9]{1,2})?$'
  end;
  if p_value !~ v_pattern then
    raise exception '%: "%" no corresponde a la notación configurada (%)', p_label, p_value, v_notation using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.check_visual_acuity(uuid, text, text) from public;

-- -----------------------------------------------------------------------------
-- Consulta
-- -----------------------------------------------------------------------------
create or replace function public.start_encounter(p_patient uuid, p_location uuid, p_appointment uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org  uuid;
  v_prof uuid;
  v_appt public.appointments%rowtype;
  v_id   uuid;
begin
  select organization_id into v_org from public.patients where id = p_patient;
  if v_org is null then
    raise exception 'Paciente no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'clinical.write');
  v_prof := private.require_professional(v_org);
  perform private.require_data_consent(v_org, p_patient);

  if not exists (select 1 from public.locations where id = p_location and organization_id = v_org and is_active) then
    raise exception 'Sede no válida' using errcode = '22023';
  end if;

  if p_appointment is not null then
    select * into v_appt from public.appointments
     where id = p_appointment and organization_id = v_org for update;
    if v_appt.id is null or v_appt.patient_id <> p_patient then
      raise exception 'La cita no corresponde a este paciente' using errcode = '22023';
    end if;
    if v_appt.status not in ('programada', 'confirmada') then
      raise exception 'La cita ya fue atendida, cancelada o marcada como inasistencia' using errcode = '22023';
    end if;
    if v_appt.professional_id <> v_prof then
      raise exception 'La cita está asignada a otro profesional' using errcode = '42501';
    end if;
    update public.appointments set status = 'atendida' where id = p_appointment;
  end if;

  insert into public.clinical_encounters (
    organization_id, location_id, patient_id, professional_id, appointment_id, template_snapshot, created_by
  )
  select v_org, p_location, p_patient, v_prof, p_appointment, s.encounter_template, (select auth.uid())
    from public.org_settings s where s.organization_id = v_org
  returning id into v_id;

  perform private.write_audit(v_org, 'encounter.start', 'clinical_encounters', v_id::text);
  return v_id;
end;
$$;

-- Bloquea y devuelve un borrador propio, verificando permiso, autoría y versión.
create or replace function private.lock_own_encounter_draft(p_encounter uuid, p_version integer)
returns public.clinical_encounters
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.clinical_encounters%rowtype;
begin
  select * into v from public.clinical_encounters where id = p_encounter for update;
  if v.id is null then
    raise exception 'Consulta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(v.organization_id, 'clinical.write');
  if v.professional_id is distinct from private.current_professional_id(v.organization_id) then
    raise exception 'Solo el profesional autor puede editar esta consulta' using errcode = '42501';
  end if;
  if v.status <> 'borrador' then
    raise exception 'La consulta está % y no se puede modificar; registra una adenda', v.status using errcode = '42501';
  end if;
  if p_version is distinct from v.version then
    raise exception 'La consulta cambió desde que la abriste. Recarga para ver la versión actual.' using errcode = '40001';
  end if;
  return v;
end;
$$;
revoke all on function private.lock_own_encounter_draft(uuid, integer) from public;

create or replace function public.save_encounter_draft(p_encounter uuid, p_version integer, p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v       public.clinical_encounters%rowtype;
  v_org   uuid;
  v_item  jsonb;
  v_key   text;
  v_val   jsonb;
  v_pos   integer := 0;
  v_keys  text[];
  v_label text;
begin
  v := private.lock_own_encounter_draft(p_encounter, p_version);
  v_org := v.organization_id;

  if jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Contenido no válido' using errcode = '22023';
  end if;

  -- Contexto de la atención
  perform private.assert_ref_code('modalidad',         p_payload ->> 'modality_code',            'Modalidad');
  perform private.assert_ref_code('grupo_servicio',    p_payload ->> 'service_group_code',       'Grupo de servicio');
  perform private.assert_ref_code('entorno_atencion',  p_payload ->> 'environment_code',         'Entorno de atención');
  perform private.assert_ref_code('via_ingreso',       p_payload ->> 'admission_route_code',     'Vía de ingreso');
  perform private.assert_ref_code('causa_atencion',    p_payload ->> 'care_cause_code',          'Causa de la atención');
  perform private.assert_ref_code('condicion_destino', p_payload ->> 'discharge_condition_code', 'Condición y destino');

  -- Listas estructuradas de antecedentes
  if jsonb_array_length(coalesce(p_payload -> 'allergies', '[]')) > 30
     or jsonb_array_length(coalesce(p_payload -> 'family_history', '[]')) > 30
     or jsonb_array_length(coalesce(p_payload -> 'risk_factors', '[]')) > 30 then
    raise exception 'Máximo 30 elementos por lista de antecedentes' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'allergies', '[]')) loop
    perform private.assert_ref_code('tipo_alergia', v_item ->> 'type_code', 'Tipo de alergia');
    if v_item ->> 'type_code' is null or coalesce(char_length(v_item ->> 'allergen'), 0) not between 1 and 120 then
      raise exception 'Cada alergia necesita tipo y nombre del alérgeno (máximo 120 caracteres)' using errcode = '22023';
    end if;
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'family_history', '[]')) loop
    perform private.assert_ref_code('cie10', v_item ->> 'cie10_code', 'Antecedente familiar (CIE-10)');
    perform private.assert_ref_code('parentesco', v_item ->> 'relationship_code', 'Parentesco');
    if v_item ->> 'cie10_code' is null or v_item ->> 'relationship_code' is null then
      raise exception 'Cada antecedente familiar necesita diagnóstico CIE-10 y parentesco' using errcode = '22023';
    end if;
  end loop;
  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'risk_factors', '[]')) loop
    perform private.assert_ref_code('tipo_factor_riesgo', v_item ->> 'type_code', 'Tipo de factor de riesgo');
    if v_item ->> 'type_code' is null or coalesce(char_length(v_item ->> 'name'), 0) not between 1 and 120 then
      raise exception 'Cada factor de riesgo necesita tipo y nombre (máximo 120 caracteres)' using errcode = '22023';
    end if;
  end loop;

  -- Hallazgos: solo secciones de la plantilla con que se abrió la consulta.
  select coalesce(array_agg(t ->> 'key'), '{}') into v_keys from jsonb_array_elements(v.template_snapshot) t;
  for v_key, v_val in select * from jsonb_each(coalesce(p_payload -> 'findings', '{}')) loop
    continue when coalesce(v_val #>> '{}', '') = '';
    if not v_key = any(v_keys) then
      raise exception 'Sección de examen desconocida: %', v_key using errcode = '22023';
    end if;
    if jsonb_typeof(v_val) not in ('string', 'null') or char_length(v_val #>> '{}') > 4000 then
      raise exception 'La sección % admite texto de hasta 4000 caracteres', v_key using errcode = '22023';
    end if;
  end loop;

  update public.clinical_encounters set
    modality_code            = p_payload ->> 'modality_code',
    service_group_code       = p_payload ->> 'service_group_code',
    environment_code         = p_payload ->> 'environment_code',
    admission_route_code     = p_payload ->> 'admission_route_code',
    care_cause_code          = p_payload ->> 'care_cause_code',
    discharge_condition_code = p_payload ->> 'discharge_condition_code',
    referral_provider_code   = nullif(p_payload ->> 'referral_provider_code', ''),
    reason_for_visit         = nullif(p_payload ->> 'reason_for_visit', ''),
    current_illness          = nullif(p_payload ->> 'current_illness', ''),
    personal_history         = nullif(p_payload ->> 'personal_history', ''),
    ocular_history           = nullif(p_payload ->> 'ocular_history', ''),
    medications              = nullif(p_payload ->> 'medications', ''),
    allergies                = coalesce(p_payload -> 'allergies', '[]'),
    family_history           = coalesce(p_payload -> 'family_history', '[]'),
    risk_factors             = coalesce(p_payload -> 'risk_factors', '[]'),
    findings                 = (select coalesce(jsonb_object_agg(key, value), '{}')
                                  from jsonb_each(coalesce(p_payload -> 'findings', '{}'))
                                 where jsonb_typeof(value) = 'string' and value #>> '{}' <> ''),
    assessment               = nullif(p_payload ->> 'assessment', ''),
    plan                     = nullif(p_payload ->> 'plan', ''),
    version                  = v.version + 1
  where id = v.id;

  -- Filas hijas: se reemplazan completas dentro de la misma transacción.
  delete from public.encounter_visual_acuity where encounter_id = v.id;
  delete from public.encounter_refractions   where encounter_id = v.id;
  delete from public.encounter_diagnoses     where encounter_id = v.id;
  delete from public.encounter_procedures    where encounter_id = v.id;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'visual_acuity', '[]')) loop
    v_label := format('Agudeza visual %s %s %s', v_item ->> 'eye', v_item ->> 'distance', v_item ->> 'correction');
    perform private.check_visual_acuity(v_org, nullif(v_item ->> 'value', ''), v_label);
    if nullif(v_item ->> 'value', '') is not null then
      insert into public.encounter_visual_acuity (organization_id, encounter_id, eye, distance, correction, value)
      values (v_org, v.id, v_item ->> 'eye', v_item ->> 'distance', v_item ->> 'correction', v_item ->> 'value');
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'refractions', '[]')) loop
    v_label := initcap(v_item ->> 'method') || ' ' || (v_item ->> 'eye');
    perform private.check_eye_values(
      v_org, v_label,
      (v_item ->> 'sphere')::numeric, (v_item ->> 'cylinder')::numeric, (v_item ->> 'axis')::integer,
      (v_item ->> 'addition')::numeric, (v_item ->> 'prism')::numeric, nullif(v_item ->> 'prism_base', ''));
    perform private.check_visual_acuity(v_org, nullif(v_item ->> 'visual_acuity', ''), v_label || ' · agudeza');
    if coalesce(v_item ->> 'sphere', v_item ->> 'cylinder', v_item ->> 'addition', v_item ->> 'prism',
                nullif(v_item ->> 'visual_acuity', '')) is not null then
      insert into public.encounter_refractions (
        organization_id, encounter_id, method, eye, sphere, cylinder, axis, addition, prism, prism_base, visual_acuity)
      values (
        v_org, v.id, v_item ->> 'method', v_item ->> 'eye',
        (v_item ->> 'sphere')::numeric, (v_item ->> 'cylinder')::numeric, (v_item ->> 'axis')::smallint,
        (v_item ->> 'addition')::numeric, (v_item ->> 'prism')::numeric, nullif(v_item ->> 'prism_base', ''),
        nullif(v_item ->> 'visual_acuity', ''));
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'diagnoses', '[]')) loop
    v_pos := v_pos + 1;
    perform private.assert_ref_code('cie10', v_item ->> 'cie10_code', 'Diagnóstico CIE-10');
    perform private.assert_ref_code('tipo_diagnostico', v_item ->> 'diagnosis_type_code', 'Tipo de diagnóstico');
    insert into public.encounter_diagnoses (organization_id, encounter_id, position, kind, cie10_code, diagnosis_type_code)
    values (v_org, v.id, v_pos, v_item ->> 'kind', v_item ->> 'cie10_code', v_item ->> 'diagnosis_type_code');
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_payload -> 'procedures', '[]')) loop
    perform private.assert_ref_code('cups', v_item ->> 'cups_code', 'Procedimiento CUPS');
    insert into public.encounter_procedures (organization_id, encounter_id, cups_code, mode, notes)
    values (v_org, v.id, v_item ->> 'cups_code', v_item ->> 'mode', nullif(v_item ->> 'notes', ''));
  end loop;

  return v.version + 1;
end;
$$;

-- Documento canónico de la consulta para el sello de integridad.
create or replace function private.encounter_document(p_encounter uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'encounter', to_jsonb(e) - array['status', 'version', 'finalized_at', 'finalized_by', 'content_hash',
                                     'annul_reason', 'created_at', 'updated_at'],
    'visual_acuity', coalesce((select jsonb_agg(to_jsonb(x) - 'id' order by x.eye, x.distance, x.correction)
                                 from public.encounter_visual_acuity x where x.encounter_id = e.id), '[]'),
    'refractions', coalesce((select jsonb_agg(to_jsonb(x) - 'id' order by x.method, x.eye)
                               from public.encounter_refractions x where x.encounter_id = e.id), '[]'),
    'diagnoses', coalesce((select jsonb_agg(to_jsonb(x) - 'id' order by x.position)
                             from public.encounter_diagnoses x where x.encounter_id = e.id), '[]'),
    'procedures', coalesce((select jsonb_agg(to_jsonb(x) - 'id' order by x.mode, x.cups_code)
                              from public.encounter_procedures x where x.encounter_id = e.id), '[]')
  )
  from public.clinical_encounters e where e.id = p_encounter;
$$;
revoke all on function private.encounter_document(uuid) from public;

create or replace function public.finalize_encounter(p_encounter uuid, p_version integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v         public.clinical_encounters%rowtype;
  v_missing text[] := '{}';
  v_section jsonb;
  v_require boolean;
begin
  v := private.lock_own_encounter_draft(p_encounter, p_version);

  if v.modality_code is null then v_missing := array_append(v_missing, 'modalidad'); end if;
  if v.service_group_code is null then v_missing := array_append(v_missing, 'grupo de servicio'); end if;
  if v.environment_code is null then v_missing := array_append(v_missing, 'entorno de atención'); end if;
  if v.reason_for_visit is null then v_missing := array_append(v_missing, 'motivo de consulta'); end if;

  select require_principal_diagnosis into v_require from public.org_settings where organization_id = v.organization_id;
  if coalesce(v_require, true) and not exists (
    select 1 from public.encounter_diagnoses where encounter_id = v.id and kind = 'principal'
  ) then
    v_missing := array_append(v_missing, 'diagnóstico principal');
  end if;

  for v_section in select * from jsonb_array_elements(v.template_snapshot) loop
    if (v_section ->> 'required')::boolean and coalesce(v.findings ->> (v_section ->> 'key'), '') = '' then
      v_missing := array_append(v_missing, v_section ->> 'label');
    end if;
  end loop;

  if array_length(v_missing, 1) > 0 then
    raise exception 'Para finalizar falta: %', array_to_string(v_missing, ', ') using errcode = '23514';
  end if;

  update public.clinical_encounters set ended_at = coalesce(ended_at, now()) where id = v.id;
  update public.clinical_encounters
     set status = 'finalizada',
         finalized_at = now(),
         finalized_by = (select auth.uid()),
         content_hash = private.sha256_json(private.encounter_document(v.id))
   where id = v.id;

  perform private.write_audit(v.organization_id, 'encounter.finalize', 'clinical_encounters', v.id::text);
end;
$$;

create or replace function public.annul_encounter_draft(p_encounter uuid, p_version integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.clinical_encounters%rowtype;
begin
  v := private.lock_own_encounter_draft(p_encounter, p_version);
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica por qué se anula el borrador (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  update public.clinical_encounters set status = 'anulada', annul_reason = left(trim(p_reason), 300) where id = v.id;
  perform private.write_audit(v.organization_id, 'encounter.annul', 'clinical_encounters', v.id::text);
end;
$$;

create or replace function public.add_encounter_amendment(p_encounter uuid, p_reason text, p_content text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org    uuid;
  v_status public.encounter_status;
  v_prof   uuid;
  v_id     uuid;
begin
  select organization_id, status into v_org, v_status from public.clinical_encounters where id = p_encounter;
  if v_org is null then
    raise exception 'Consulta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'clinical.write');
  v_prof := private.require_professional(v_org);
  if v_status <> 'finalizada' then
    raise exception 'Las adendas se registran sobre consultas finalizadas; un borrador se edita directamente' using errcode = '22023';
  end if;

  insert into public.encounter_amendments (organization_id, encounter_id, professional_id, reason, content, created_by)
  values (v_org, p_encounter, v_prof, trim(p_reason), trim(p_content), (select auth.uid()))
  returning id into v_id;

  perform private.write_audit(v_org, 'encounter.amend', 'clinical_encounters', p_encounter::text);
  return v_id;
end;
$$;

-- Comprueba que el contenido de una consulta finalizada no cambió.
create or replace function public.verify_encounter_integrity(p_encounter uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.clinical_encounters%rowtype;
begin
  select * into v from public.clinical_encounters where id = p_encounter;
  if v.id is null then
    raise exception 'Consulta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(v.organization_id, 'clinical.read');
  if v.status <> 'finalizada' then
    return null;
  end if;
  return v.content_hash = private.sha256_json(private.encounter_document(v.id));
end;
$$;

-- -----------------------------------------------------------------------------
-- Fórmulas
-- -----------------------------------------------------------------------------
create or replace function private.prescription_document(p_prescription uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'prescription', to_jsonb(p) - array['status', 'draft_version', 'content_hash', 'annul_reason',
                                        'created_at', 'updated_at'],
    'eyes', coalesce((select jsonb_agg(to_jsonb(e) order by e.eye)
                        from public.prescription_eyes e where e.prescription_id = p.id), '[]')
  )
  from public.prescriptions p where p.id = p_prescription;
$$;
revoke all on function private.prescription_document(uuid) from public;

-- Verifica que quien actúa puede editar la fórmula según su origen.
create or replace function private.assert_prescription_editor(p public.prescriptions)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p.origin = 'interna' then
    perform private.require_permission(p.organization_id, 'prescription.write');
    if p.professional_id is distinct from private.current_professional_id(p.organization_id) then
      raise exception 'Solo el profesional autor puede editar o validar esta fórmula' using errcode = '42501';
    end if;
  else
    perform private.require_permission(p.organization_id, 'prescription.external');
    if p.transcribed_by is distinct from (select auth.uid()) then
      raise exception 'Solo quien transcribió la fórmula externa puede editarla o confirmarla' using errcode = '42501';
    end if;
  end if;
end;
$$;
revoke all on function private.assert_prescription_editor(public.prescriptions) from public;

create or replace function private.write_prescription_eyes(p public.prescriptions, p_eyes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_label text;
begin
  if jsonb_typeof(coalesce(p_eyes, '[]')) <> 'array' or jsonb_array_length(coalesce(p_eyes, '[]')) > 2 then
    raise exception 'La fórmula admite como máximo OD y OI' using errcode = '22023';
  end if;
  delete from public.prescription_eyes where prescription_id = p.id;
  for v_item in select * from jsonb_array_elements(coalesce(p_eyes, '[]')) loop
    v_label := v_item ->> 'eye';
    perform private.check_eye_values(
      p.organization_id, v_label,
      (v_item ->> 'sphere')::numeric, (v_item ->> 'cylinder')::numeric, (v_item ->> 'axis')::integer,
      (v_item ->> 'addition')::numeric, (v_item ->> 'prism')::numeric, nullif(v_item ->> 'prism_base', ''));
    perform private.check_range(p.organization_id, 'dnp', (v_item ->> 'dnp')::numeric, v_label || ' · DNP');
    perform private.check_range(p.organization_id, 'height', (v_item ->> 'height')::numeric, v_label || ' · altura');
    perform private.check_visual_acuity(p.organization_id, nullif(v_item ->> 'visual_acuity', ''), v_label || ' · agudeza');
    insert into public.prescription_eyes (
      prescription_id, organization_id, eye, sphere, cylinder, axis, addition, prism, prism_base, dnp, height, visual_acuity)
    values (
      p.id, p.organization_id, v_item ->> 'eye',
      (v_item ->> 'sphere')::numeric, (v_item ->> 'cylinder')::numeric, (v_item ->> 'axis')::smallint,
      (v_item ->> 'addition')::numeric, (v_item ->> 'prism')::numeric, nullif(v_item ->> 'prism_base', ''),
      (v_item ->> 'dnp')::numeric, (v_item ->> 'height')::numeric, nullif(v_item ->> 'visual_acuity', ''));
  end loop;
end;
$$;
revoke all on function private.write_prescription_eyes(public.prescriptions, jsonb) from public;

create or replace function public.save_prescription_draft(
  p_prescription  uuid,
  p_draft_version integer,
  p_payload       jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p          public.prescriptions%rowtype;
  v_org      uuid;
  v_patient  uuid;
  v_origin   text;
  v_prof     uuid;
  v_enc      public.clinical_encounters%rowtype;
  v_id       uuid;
begin
  if p_prescription is null then
    v_patient := (p_payload ->> 'patient_id')::uuid;
    v_origin := p_payload ->> 'origin';
    select organization_id into v_org from public.patients where id = v_patient;
    if v_org is null then
      raise exception 'Paciente no encontrado' using errcode = 'P0002';
    end if;
    if v_origin = 'interna' then
      perform private.require_permission(v_org, 'prescription.write');
      v_prof := private.require_professional(v_org);
    elsif v_origin = 'externa' then
      perform private.require_permission(v_org, 'prescription.external');
    else
      raise exception 'Origen de fórmula no válido' using errcode = '22023';
    end if;
    perform private.require_data_consent(v_org, v_patient);

    if p_payload ->> 'encounter_id' is not null then
      select * into v_enc from public.clinical_encounters
       where id = (p_payload ->> 'encounter_id')::uuid and organization_id = v_org;
      if v_enc.id is null or v_enc.patient_id <> v_patient or v_origin <> 'interna' or v_enc.professional_id <> v_prof
         or v_enc.status = 'anulada' then
        raise exception 'La consulta indicada no es una consulta propia de este paciente' using errcode = '22023';
      end if;
    end if;

    v_id := gen_random_uuid();
    insert into public.prescriptions (
      id, organization_id, patient_id, encounter_id, origin, professional_id,
      external_issuer_name, external_issuer_card, external_issued_on, transcribed_by,
      series_id, version, cylinder_convention, created_by)
    select
      v_id, v_org, v_patient, v_enc.id, v_origin, v_prof,
      case when v_origin = 'externa' then trim(p_payload ->> 'external_issuer_name') end,
      case when v_origin = 'externa' then nullif(trim(p_payload ->> 'external_issuer_card'), '') end,
      case when v_origin = 'externa' then (p_payload ->> 'external_issued_on')::date end,
      case when v_origin = 'externa' then (select auth.uid()) end,
      v_id, 1,
      case when v_origin = 'externa' then nullif(p_payload ->> 'cylinder_convention', '') else s.cylinder_convention end,
      (select auth.uid())
    from public.org_settings s where s.organization_id = v_org;

    select * into p from public.prescriptions where id = v_id for update;
    perform private.write_audit(v_org, 'prescription.create', 'prescriptions', v_id::text,
                                jsonb_build_object('origin', v_origin));
  else
    select * into p from public.prescriptions where id = p_prescription for update;
    if p.id is null then
      raise exception 'Fórmula no encontrada' using errcode = 'P0002';
    end if;
    perform private.assert_prescription_editor(p);
    if p.status <> 'borrador' then
      raise exception 'La fórmula está % y no se puede modificar; crea una versión nueva', p.status using errcode = '42501';
    end if;
    if p_draft_version is distinct from p.draft_version then
      raise exception 'La fórmula cambió desde que la abriste. Recarga para ver la versión actual.' using errcode = '40001';
    end if;
    if p.origin = 'externa' then
      update public.prescriptions set
        external_issuer_name = trim(p_payload ->> 'external_issuer_name'),
        external_issuer_card = nullif(trim(p_payload ->> 'external_issuer_card'), ''),
        external_issued_on   = (p_payload ->> 'external_issued_on')::date,
        cylinder_convention  = nullif(p_payload ->> 'cylinder_convention', '')
      where id = p.id;
    end if;
  end if;

  perform private.check_range(p.organization_id, 'pd', (p_payload ->> 'pd_far')::numeric, 'DP lejos');
  perform private.check_range(p.organization_id, 'pd', (p_payload ->> 'pd_near')::numeric, 'DP cerca');

  update public.prescriptions set
    lens_type     = nullif(p_payload ->> 'lens_type', ''),
    usage         = nullif(trim(p_payload ->> 'usage'), ''),
    pd_far        = (p_payload ->> 'pd_far')::numeric,
    pd_near       = (p_payload ->> 'pd_near')::numeric,
    observations  = nullif(trim(p_payload ->> 'observations'), ''),
    draft_version = p.draft_version + case when p_prescription is null then 0 else 1 end
  where id = p.id;

  perform private.write_prescription_eyes(p, p_payload -> 'eyes');
  return p.id;
end;
$$;

create or replace function public.validate_prescription(p_prescription uuid, p_draft_version integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p        public.prescriptions%rowtype;
  v_prev   public.prescriptions%rowtype;
  v_author jsonb;
begin
  select * into p from public.prescriptions where id = p_prescription for update;
  if p.id is null then
    raise exception 'Fórmula no encontrada' using errcode = 'P0002';
  end if;
  perform private.assert_prescription_editor(p);
  if p.status <> 'borrador' then
    raise exception 'Solo se valida una fórmula en borrador' using errcode = '22023';
  end if;
  if p_draft_version is distinct from p.draft_version then
    raise exception 'La fórmula cambió desde que la abriste. Recarga para ver la versión actual.' using errcode = '40001';
  end if;
  perform private.require_data_consent(p.organization_id, p.patient_id);
  if not exists (select 1 from public.prescription_eyes where prescription_id = p.id and sphere is not null) then
    raise exception 'Registra al menos la esfera de un ojo antes de validar' using errcode = '23514';
  end if;
  if p.lens_type is null then
    raise exception 'Indica el tipo de lente antes de validar' using errcode = '23514';
  end if;

  if p.supersedes_id is not null then
    select * into v_prev from public.prescriptions where id = p.supersedes_id for update;
    if v_prev.status <> 'validada' then
      raise exception 'La versión anterior ya no está vigente' using errcode = '22023';
    end if;
    update public.prescriptions set status = 'reemplazada' where id = v_prev.id;
  end if;

  if p.origin = 'interna' then
    -- La tarjeta profesional solo se incluye si fue verificada.
    select jsonb_build_object(
             'full_name', pr.full_name,
             'profession', pr.profession,
             'professional_card', case when pr.verified_at is not null then pr.professional_card end,
             'credential_verified', pr.verified_at is not null)
      into v_author
      from public.professionals pr where pr.id = p.professional_id;
  else
    select jsonb_build_object(
             'external_issuer_name', p.external_issuer_name,
             'external_issuer_card', p.external_issuer_card,
             'external_issued_on', p.external_issued_on,
             'transcribed_by_name', coalesce(nullif(pf.full_name, ''), pf.email))
      into v_author
      from public.profiles pf where pf.id = p.transcribed_by;
  end if;

  update public.prescriptions
     set author_snapshot = v_author, validated_at = now(), validated_by = (select auth.uid())
   where id = p.id;
  update public.prescriptions
     set status = 'validada', content_hash = private.sha256_json(private.prescription_document(p.id))
   where id = p.id;

  perform private.write_audit(p.organization_id, 'prescription.validate', 'prescriptions', p.id::text,
                              jsonb_build_object('version', p.version));
end;
$$;

create or replace function public.new_prescription_version(p_prescription uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p      public.prescriptions%rowtype;
  v_prof uuid;
  v_id   uuid := gen_random_uuid();
begin
  select * into p from public.prescriptions where id = p_prescription for update;
  if p.id is null then
    raise exception 'Fórmula no encontrada' using errcode = 'P0002';
  end if;
  if p.origin = 'interna' then
    perform private.require_permission(p.organization_id, 'prescription.write');
    v_prof := private.require_professional(p.organization_id);
  else
    perform private.require_permission(p.organization_id, 'prescription.external');
  end if;
  if p.status <> 'validada' then
    raise exception 'Solo se crea una versión nueva a partir de la fórmula vigente' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica el motivo de la corrección (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  if exists (select 1 from public.prescriptions where series_id = p.series_id and status = 'borrador') then
    raise exception 'Ya hay una versión en borrador de esta fórmula' using errcode = '23505';
  end if;

  -- La versión nueva de una fórmula interna queda a nombre de quien corrige.
  insert into public.prescriptions (
    id, organization_id, patient_id, encounter_id, origin, professional_id,
    external_issuer_name, external_issuer_card, external_issued_on, transcribed_by,
    series_id, version, supersedes_id, version_reason, lens_type, usage, pd_far, pd_near,
    observations, cylinder_convention, created_by)
  values (
    v_id, p.organization_id, p.patient_id,
    case when p.origin = 'interna' and p.professional_id = v_prof then p.encounter_id end,
    p.origin, v_prof,
    p.external_issuer_name, p.external_issuer_card, p.external_issued_on,
    case when p.origin = 'externa' then (select auth.uid()) end,
    p.series_id, (select max(version) + 1 from public.prescriptions where series_id = p.series_id),
    p.id, left(trim(p_reason), 300), p.lens_type, p.usage, p.pd_far, p.pd_near,
    p.observations, p.cylinder_convention, (select auth.uid()));

  insert into public.prescription_eyes (
    prescription_id, organization_id, eye, sphere, cylinder, axis, addition, prism, prism_base, dnp, height, visual_acuity)
  select v_id, organization_id, eye, sphere, cylinder, axis, addition, prism, prism_base, dnp, height, visual_acuity
    from public.prescription_eyes where prescription_id = p.id;

  perform private.write_audit(p.organization_id, 'prescription.new_version', 'prescriptions', v_id::text,
                              jsonb_build_object('supersedes', p.id));
  return v_id;
end;
$$;

create or replace function public.annul_prescription(p_prescription uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.prescriptions%rowtype;
begin
  select * into p from public.prescriptions where id = p_prescription for update;
  if p.id is null then
    raise exception 'Fórmula no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(p.organization_id,
    case when p.origin = 'interna' then 'prescription.write' else 'prescription.external' end);
  if p.status = 'borrador' then
    perform private.assert_prescription_editor(p);
  elsif p.status <> 'validada' then
    raise exception 'La fórmula ya está %', p.status using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica por qué se anula (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  update public.prescriptions set status = 'anulada', annul_reason = left(trim(p_reason), 300) where id = p.id;
  perform private.write_audit(p.organization_id, 'prescription.annul', 'prescriptions', p.id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- Privilegios
-- -----------------------------------------------------------------------------
revoke all on function public.start_encounter(uuid, uuid, uuid)                from public, anon, authenticated;
revoke all on function public.save_encounter_draft(uuid, integer, jsonb)        from public, anon, authenticated;
revoke all on function public.finalize_encounter(uuid, integer)                 from public, anon, authenticated;
revoke all on function public.annul_encounter_draft(uuid, integer, text)        from public, anon, authenticated;
revoke all on function public.add_encounter_amendment(uuid, text, text)         from public, anon, authenticated;
revoke all on function public.verify_encounter_integrity(uuid)                  from public, anon, authenticated;
revoke all on function public.save_prescription_draft(uuid, integer, jsonb)     from public, anon, authenticated;
revoke all on function public.validate_prescription(uuid, integer)              from public, anon, authenticated;
revoke all on function public.new_prescription_version(uuid, text)              from public, anon, authenticated;
revoke all on function public.annul_prescription(uuid, text)                    from public, anon, authenticated;

grant execute on function public.start_encounter(uuid, uuid, uuid)             to authenticated;
grant execute on function public.save_encounter_draft(uuid, integer, jsonb)     to authenticated;
grant execute on function public.finalize_encounter(uuid, integer)              to authenticated;
grant execute on function public.annul_encounter_draft(uuid, integer, text)     to authenticated;
grant execute on function public.add_encounter_amendment(uuid, text, text)      to authenticated;
grant execute on function public.verify_encounter_integrity(uuid)               to authenticated;
grant execute on function public.save_prescription_draft(uuid, integer, jsonb)  to authenticated;
grant execute on function public.validate_prescription(uuid, integer)           to authenticated;
grant execute on function public.new_prescription_version(uuid, text)           to authenticated;
grant execute on function public.annul_prescription(uuid, text)                 to authenticated;

revoke all on all functions in schema private from anon;

-- =============================================================================
-- OptiConsulta · Migración 0008 · Consulta optométrica y fórmulas
-- -----------------------------------------------------------------------------
-- Principios:
--   * Solo un profesional vinculado al usuario de la sesión, con clinical.write
--     o prescription.write, crea y edita registros clínicos, y solo los propios.
--   * Ningún valor clínico se autocompleta ni se infiere.
--   * Un registro finalizado o validado no se modifica: las correcciones son
--     adendas (consulta) o versiones nuevas (fórmula). Lo imponen triggers que
--     aplican a cualquier rol.
--   * authenticated no tiene INSERT/UPDATE/DELETE sobre tablas clínicas: todo
--     pasa por funciones RPC que validan en una sola transacción.
--   * Estructura alineada con el RDA de consulta externa (Res. 1888 de 2025):
--     modalidad, grupo de servicio, entorno, vía de ingreso, causa, alergias,
--     antecedentes familiares, factores de riesgo, diagnósticos CIE-10 con tipo
--     y procedimientos CUPS. La generación y el envío del RDA no están aquí.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Configuración clínica (la define el optómetra; sin valores clínicos por defecto)
-- -----------------------------------------------------------------------------
alter table public.org_settings
  add column av_notation text check (av_notation in ('snellen_pies', 'snellen_metros', 'decimal', 'logmar')),
  add column require_principal_diagnosis boolean not null default true,
  -- Secciones de examen: [{ "key": "biomicroscopia", "label": "Biomicroscopía", "required": false }]
  -- Las etiquetas sugeridas son solo nombres de sección; el optómetra decide cuáles usar y cuáles exigir.
  add column encounter_template jsonb not null default '[
    {"key": "examen_externo",   "label": "Examen externo",          "required": false},
    {"key": "motilidad",        "label": "Motilidad ocular",        "required": false},
    {"key": "biomicroscopia",   "label": "Biomicroscopía",          "required": false},
    {"key": "oftalmoscopia",    "label": "Oftalmoscopía",           "required": false},
    {"key": "queratometria",    "label": "Queratometría",           "required": false},
    {"key": "tonometria",       "label": "Tonometría",              "required": false}
  ]'::jsonb check (jsonb_typeof(encounter_template) = 'array');

create or replace function public.update_clinical_settings(
  p_org                 uuid,
  p_av_notation         text,
  p_cylinder_convention text,
  p_require_principal   boolean,
  p_template            jsonb,
  p_ranges              jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item  jsonb;
  v_key   text;
  v_range jsonb;
  v_keys  text[] := '{}';
begin
  perform private.require_permission(p_org, 'clinical.configure');

  if jsonb_typeof(p_template) <> 'array' or jsonb_array_length(p_template) > 30 then
    raise exception 'La plantilla debe ser una lista de hasta 30 secciones' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_template) loop
    v_key := v_item ->> 'key';
    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{1,39}$' then
      raise exception 'Clave de sección no válida: %', coalesce(v_key, '(vacía)') using errcode = '22023';
    end if;
    if v_key = any(v_keys) then
      raise exception 'Sección repetida: %', v_key using errcode = '22023';
    end if;
    if coalesce(char_length(v_item ->> 'label'), 0) not between 2 and 60
       or jsonb_typeof(v_item -> 'required') <> 'boolean' then
      raise exception 'La sección % necesita un nombre de 2 a 60 caracteres y si es obligatoria', v_key using errcode = '22023';
    end if;
    v_keys := v_keys || v_key;
  end loop;

  if jsonb_typeof(p_ranges) <> 'object' then
    raise exception 'Rangos no válidos' using errcode = '22023';
  end if;
  for v_key, v_range in select * from jsonb_each(p_ranges) loop
    if v_key not in ('sphere', 'cylinder', 'axis', 'addition', 'prism', 'dnp', 'height', 'pd') then
      raise exception 'Campo de rango desconocido: %', v_key using errcode = '22023';
    end if;
    if jsonb_typeof(v_range) <> 'object'
       or (v_range ? 'min' and jsonb_typeof(v_range -> 'min') <> 'number')
       or (v_range ? 'max' and jsonb_typeof(v_range -> 'max') <> 'number')
       or (v_range ? 'step' and (jsonb_typeof(v_range -> 'step') <> 'number' or (v_range ->> 'step')::numeric <= 0))
       or (v_range ? 'min' and v_range ? 'max' and (v_range ->> 'min')::numeric >= (v_range ->> 'max')::numeric) then
      raise exception 'Rango de % no válido: el mínimo debe ser menor que el máximo y el paso mayor que cero', v_key
        using errcode = '22023';
    end if;
  end loop;

  update public.org_settings
     set av_notation = p_av_notation,
         cylinder_convention = p_cylinder_convention,
         require_principal_diagnosis = coalesce(p_require_principal, true),
         encounter_template = p_template,
         clinical_ranges = p_ranges
   where organization_id = p_org;

  perform private.write_audit(p_org, 'clinical_settings.update', 'org_settings', p_org::text);
end;
$$;
revoke all on function public.update_clinical_settings(uuid, text, text, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.update_clinical_settings(uuid, text, text, boolean, jsonb, jsonb) to authenticated;

-- -----------------------------------------------------------------------------
-- Validación de valores ópticos: reglas de notación siempre; rangos y pasos
-- solo si la organización los configuró.
-- -----------------------------------------------------------------------------
create or replace function private.check_range(p_org uuid, p_field text, p_value numeric, p_label text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_range jsonb;
  v_min   numeric;
begin
  if p_value is null then
    return;
  end if;
  select s.clinical_ranges -> p_field into v_range from public.org_settings s where s.organization_id = p_org;
  if v_range is null then
    return;
  end if;
  if v_range ? 'min' and p_value < (v_range ->> 'min')::numeric then
    raise exception '%: % está por debajo del mínimo configurado (%)', p_label, p_value, v_range ->> 'min' using errcode = '22023';
  end if;
  if v_range ? 'max' and p_value > (v_range ->> 'max')::numeric then
    raise exception '%: % supera el máximo configurado (%)', p_label, p_value, v_range ->> 'max' using errcode = '22023';
  end if;
  if v_range ? 'step' then
    v_min := coalesce((v_range ->> 'min')::numeric, 0);
    if mod(p_value - v_min, (v_range ->> 'step')::numeric) <> 0 then
      raise exception '%: % no respeta el paso configurado (%)', p_label, p_value, v_range ->> 'step' using errcode = '22023';
    end if;
  end if;
end;
$$;
revoke all on function private.check_range(uuid, text, numeric, text) from public;

create or replace function private.check_eye_values(
  p_org uuid, p_label text,
  p_sphere numeric, p_cylinder numeric, p_axis integer, p_addition numeric,
  p_prism numeric, p_prism_base text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_cylinder is not null and p_cylinder <> 0 and p_axis is null then
    raise exception '%: un cilindro distinto de cero requiere eje', p_label using errcode = '22023';
  end if;
  if p_axis is not null and (p_cylinder is null or p_cylinder = 0) then
    raise exception '%: hay eje sin cilindro', p_label using errcode = '22023';
  end if;
  if p_axis is not null and (p_axis < 0 or p_axis > 180) then
    raise exception '%: el eje debe estar entre 0 y 180 grados', p_label using errcode = '22023';
  end if;
  if (p_prism is not null and p_prism <> 0) <> (p_prism_base is not null) then
    raise exception '%: el prisma y su base van juntos', p_label using errcode = '22023';
  end if;
  perform private.check_range(p_org, 'sphere',   p_sphere,   p_label || ' · esfera');
  perform private.check_range(p_org, 'cylinder', p_cylinder, p_label || ' · cilindro');
  perform private.check_range(p_org, 'axis',     p_axis,     p_label || ' · eje');
  perform private.check_range(p_org, 'addition', p_addition, p_label || ' · adición');
  perform private.check_range(p_org, 'prism',    p_prism,    p_label || ' · prisma');
end;
$$;
revoke all on function private.check_eye_values(uuid, text, numeric, numeric, integer, numeric, numeric, text) from public;

-- -----------------------------------------------------------------------------
-- Consulta optométrica
-- -----------------------------------------------------------------------------
create type public.encounter_status as enum ('borrador', 'finalizada', 'anulada');

create table public.clinical_encounters (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid not null references public.organizations(id) on delete restrict,
  location_id               uuid not null,
  patient_id                uuid not null,
  professional_id           uuid not null,
  appointment_id            uuid,
  status                    public.encounter_status not null default 'borrador',
  started_at                timestamptz not null default now(),
  ended_at                  timestamptz,
  -- Contexto de la atención (RDA)
  modality_code             text,
  service_group_code        text,
  environment_code          text,
  admission_route_code      text,
  care_cause_code           text,
  discharge_condition_code  text,
  referral_provider_code    text check (referral_provider_code is null or referral_provider_code ~ '^[0-9]{10,12}$'),
  -- Anamnesis y análisis (texto clínico)
  reason_for_visit          text check (reason_for_visit is null or char_length(reason_for_visit) <= 2000),
  current_illness           text check (current_illness is null or char_length(current_illness) <= 4000),
  personal_history          text check (personal_history is null or char_length(personal_history) <= 4000),
  ocular_history            text check (ocular_history is null or char_length(ocular_history) <= 4000),
  medications               text check (medications is null or char_length(medications) <= 2000),
  allergies                 jsonb not null default '[]'::jsonb check (jsonb_typeof(allergies) = 'array'),
  family_history            jsonb not null default '[]'::jsonb check (jsonb_typeof(family_history) = 'array'),
  risk_factors              jsonb not null default '[]'::jsonb check (jsonb_typeof(risk_factors) = 'array'),
  findings                  jsonb not null default '{}'::jsonb check (jsonb_typeof(findings) = 'object'),
  template_snapshot         jsonb not null default '[]'::jsonb,
  assessment                text check (assessment is null or char_length(assessment) <= 4000),
  plan                      text check (plan is null or char_length(plan) <= 4000),
  -- Control
  version                   integer not null default 1,
  finalized_at              timestamptz,
  finalized_by              uuid references auth.users(id) on delete set null,
  content_hash              text,
  annul_reason              text check (annul_reason is null or char_length(annul_reason) <= 300),
  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (id, organization_id),
  check (ended_at is null or ended_at >= started_at),
  check (status <> 'finalizada' or (finalized_at is not null and content_hash is not null)),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict,
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (professional_id, organization_id) references public.professionals (id, organization_id) on delete restrict,
  foreign key (appointment_id, organization_id) references public.appointments (id, organization_id) on delete restrict
);
create index encounters_patient_idx on public.clinical_encounters (organization_id, patient_id, started_at desc);
create index encounters_professional_idx on public.clinical_encounters (organization_id, professional_id, started_at desc);
create unique index encounters_one_per_appointment on public.clinical_encounters (appointment_id)
  where appointment_id is not null and status <> 'anulada';

create table public.encounter_visual_acuity (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  encounter_id    uuid not null,
  eye             text not null check (eye in ('OD', 'OI', 'AO')),
  distance        text not null check (distance in ('lejos', 'intermedia', 'cerca')),
  correction      text not null check (correction in ('sin', 'con', 'estenopeico')),
  value           text not null check (char_length(value) between 1 and 20),
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  unique (encounter_id, eye, distance, correction)
);
create index visual_acuity_org_idx on public.encounter_visual_acuity (organization_id, encounter_id);

create table public.encounter_refractions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  encounter_id    uuid not null,
  method          text not null check (method in ('lensometria', 'autorrefraccion', 'retinoscopia', 'subjetivo', 'cicloplegia')),
  eye             text not null check (eye in ('OD', 'OI')),
  sphere          numeric(5,2),
  cylinder        numeric(5,2),
  axis            smallint check (axis between 0 and 180),
  addition        numeric(4,2) check (addition is null or addition >= 0),
  prism           numeric(4,2) check (prism is null or prism >= 0),
  prism_base      text check (prism_base in ('arriba', 'abajo', 'nasal', 'temporal')),
  visual_acuity   text check (visual_acuity is null or char_length(visual_acuity) <= 20),
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  unique (encounter_id, method, eye)
);
create index refractions_org_idx on public.encounter_refractions (organization_id, encounter_id);

create table public.encounter_diagnoses (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null,
  encounter_id        uuid not null,
  position            smallint not null check (position between 1 and 20),
  kind                text not null check (kind in ('principal', 'relacionado')),
  cie10_code          text not null,
  diagnosis_type_code text not null,
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  unique (encounter_id, position),
  unique (encounter_id, cie10_code)
);
create unique index diagnoses_one_principal on public.encounter_diagnoses (encounter_id) where kind = 'principal';
create index diagnoses_org_idx on public.encounter_diagnoses (organization_id, cie10_code);

create table public.encounter_procedures (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  encounter_id    uuid not null,
  cups_code       text not null,
  mode            text not null check (mode in ('realizado', 'ordenado')),
  notes           text check (notes is null or char_length(notes) <= 300),
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  unique (encounter_id, cups_code, mode)
);
create index procedures_org_idx on public.encounter_procedures (organization_id, encounter_id);

create table public.encounter_amendments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  encounter_id    uuid not null,
  professional_id uuid not null,
  reason          text not null check (char_length(reason) between 5 and 300),
  content         text not null check (char_length(content) between 1 and 4000),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  foreign key (professional_id, organization_id) references public.professionals (id, organization_id) on delete restrict
);
create index amendments_org_idx on public.encounter_amendments (organization_id, encounter_id, created_at);

-- Inmutabilidad: una consulta finalizada o anulada no cambia; sus filas hijas
-- solo cambian mientras la consulta está en borrador. Aplica a todos los roles.
create or replace function private.guard_encounter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Las consultas no se eliminan' using errcode = '42501';
  end if;
  if old.status <> 'borrador' then
    raise exception 'La consulta está % y no se puede modificar; registra una adenda', old.status using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_encounter() from public;

create trigger clinical_encounters_guard
  before update or delete on public.clinical_encounters
  for each row execute function private.guard_encounter();
create trigger clinical_encounters_updated_at
  before update on public.clinical_encounters
  for each row execute function private.set_updated_at();

create or replace function private.guard_encounter_child()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.encounter_status;
begin
  select status into v_status from public.clinical_encounters
   where id = coalesce(new.encounter_id, old.encounter_id);
  if v_status is distinct from 'borrador' then
    raise exception 'La consulta está % y no se puede modificar; registra una adenda', v_status using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_encounter_child() from public;

create trigger visual_acuity_guard before insert or update or delete on public.encounter_visual_acuity
  for each row execute function private.guard_encounter_child();
create trigger refractions_guard before insert or update or delete on public.encounter_refractions
  for each row execute function private.guard_encounter_child();
create trigger diagnoses_guard before insert or update or delete on public.encounter_diagnoses
  for each row execute function private.guard_encounter_child();
create trigger procedures_guard before insert or update or delete on public.encounter_procedures
  for each row execute function private.guard_encounter_child();

create trigger amendments_immutable before update or delete on public.encounter_amendments
  for each row execute function private.forbid_audit_mutation();

-- -----------------------------------------------------------------------------
-- Fórmulas (con versiones)
-- -----------------------------------------------------------------------------
create type public.prescription_status as enum ('borrador', 'validada', 'reemplazada', 'anulada');

create table public.prescriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete restrict,
  patient_id            uuid not null,
  encounter_id          uuid,
  origin                text not null check (origin in ('interna', 'externa')),
  -- Interna: profesional autor de la óptica. Externa: nunca se atribuye a uno.
  professional_id       uuid,
  external_issuer_name  text check (external_issuer_name is null or char_length(external_issuer_name) between 3 and 160),
  external_issuer_card  text check (external_issuer_card is null or char_length(external_issuer_card) <= 40),
  external_issued_on    date,
  transcribed_by        uuid references auth.users(id) on delete set null,
  series_id             uuid not null,
  version               integer not null default 1 check (version >= 1),
  supersedes_id         uuid references public.prescriptions(id) on delete restrict,
  version_reason        text check (version_reason is null or char_length(version_reason) <= 300),
  status                public.prescription_status not null default 'borrador',
  lens_type             text check (lens_type in ('monofocal', 'bifocal', 'progresivo', 'ocupacional', 'otro')),
  usage                 text check (usage is null or char_length(usage) <= 200),
  pd_far                numeric(4,1) check (pd_far is null or pd_far > 0),
  pd_near               numeric(4,1) check (pd_near is null or pd_near > 0),
  observations          text check (observations is null or char_length(observations) <= 1000),
  cylinder_convention   text check (cylinder_convention in ('negativo', 'positivo')),
  draft_version         integer not null default 1,
  validated_at          timestamptz,
  validated_by          uuid references auth.users(id) on delete set null,
  author_snapshot       jsonb,
  content_hash          text,
  annul_reason          text check (annul_reason is null or char_length(annul_reason) <= 300),
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, organization_id),
  unique (series_id, version),
  check ((origin = 'interna' and professional_id is not null and external_issuer_name is null)
      or (origin = 'externa' and professional_id is null and external_issuer_name is not null)),
  check (status in ('borrador', 'anulada') or (validated_at is not null and content_hash is not null)),
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (encounter_id, organization_id) references public.clinical_encounters (id, organization_id) on delete restrict,
  foreign key (professional_id, organization_id) references public.professionals (id, organization_id) on delete restrict
);
create index prescriptions_patient_idx on public.prescriptions (organization_id, patient_id, created_at desc);
-- Una sola versión abierta (borrador) por serie.
create unique index prescriptions_one_draft_per_series on public.prescriptions (series_id) where status = 'borrador';

create table public.prescription_eyes (
  prescription_id uuid not null,
  organization_id uuid not null,
  eye             text not null check (eye in ('OD', 'OI')),
  sphere          numeric(5,2),
  cylinder        numeric(5,2),
  axis            smallint check (axis between 0 and 180),
  addition        numeric(4,2) check (addition is null or addition >= 0),
  prism           numeric(4,2) check (prism is null or prism >= 0),
  prism_base      text check (prism_base in ('arriba', 'abajo', 'nasal', 'temporal')),
  dnp             numeric(4,1) check (dnp is null or dnp > 0),
  height          numeric(4,1) check (height is null or height > 0),
  visual_acuity   text check (visual_acuity is null or char_length(visual_acuity) <= 20),
  primary key (prescription_id, eye),
  foreign key (prescription_id, organization_id) references public.prescriptions (id, organization_id) on delete restrict
);
create index prescription_eyes_org_idx on public.prescription_eyes (organization_id, prescription_id);

-- Una fórmula validada solo puede pasar a reemplazada o anulada; nada más cambia.
create or replace function private.guard_prescription()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fixed text[] := array['status', 'annul_reason', 'updated_at'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Las fórmulas no se eliminan' using errcode = '42501';
  end if;
  if old.status = 'borrador' then
    return new;
  end if;
  if old.status = 'validada'
     and new.status in ('reemplazada', 'anulada')
     and (to_jsonb(new) - v_fixed) = (to_jsonb(old) - v_fixed) then
    return new;
  end if;
  raise exception 'La fórmula está % y no se puede modificar; crea una versión nueva', old.status using errcode = '42501';
end;
$$;
revoke all on function private.guard_prescription() from public;

create trigger prescriptions_guard
  before update or delete on public.prescriptions
  for each row execute function private.guard_prescription();
create trigger prescriptions_updated_at
  before update on public.prescriptions
  for each row execute function private.set_updated_at();

create or replace function private.guard_prescription_eye()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status public.prescription_status;
begin
  select status into v_status from public.prescriptions
   where id = coalesce(new.prescription_id, old.prescription_id);
  if v_status is distinct from 'borrador' then
    raise exception 'La fórmula está % y no se puede modificar; crea una versión nueva', v_status using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;
revoke all on function private.guard_prescription_eye() from public;

create trigger prescription_eyes_guard
  before insert or update or delete on public.prescription_eyes
  for each row execute function private.guard_prescription_eye();

-- -----------------------------------------------------------------------------
-- RLS y privilegios: solo lectura directa; escritura por RPC.
-- -----------------------------------------------------------------------------
alter table public.clinical_encounters     enable row level security;
alter table public.encounter_visual_acuity enable row level security;
alter table public.encounter_refractions   enable row level security;
alter table public.encounter_diagnoses     enable row level security;
alter table public.encounter_procedures    enable row level security;
alter table public.encounter_amendments    enable row level security;
alter table public.prescriptions           enable row level security;
alter table public.prescription_eyes       enable row level security;

revoke all on table
  public.clinical_encounters, public.encounter_visual_acuity, public.encounter_refractions,
  public.encounter_diagnoses, public.encounter_procedures, public.encounter_amendments,
  public.prescriptions, public.prescription_eyes
from anon, authenticated;

grant select on
  public.clinical_encounters, public.encounter_visual_acuity, public.encounter_refractions,
  public.encounter_diagnoses, public.encounter_procedures, public.encounter_amendments,
  public.prescriptions, public.prescription_eyes
to authenticated;

create policy encounters_select on public.clinical_encounters for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));
create policy visual_acuity_select on public.encounter_visual_acuity for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));
create policy refractions_select on public.encounter_refractions for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));
create policy diagnoses_select on public.encounter_diagnoses for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));
create policy procedures_select on public.encounter_procedures for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));
create policy amendments_select on public.encounter_amendments for select to authenticated
  using ((select private.has_permission(organization_id, 'clinical.read')));

-- Los valores de la fórmula los necesitan ventas y laboratorio (prescription.read).
create policy prescriptions_select on public.prescriptions for select to authenticated
  using ((select private.has_permission(organization_id, 'prescription.read'))
      or (select private.has_permission(organization_id, 'clinical.read')));
create policy prescription_eyes_select on public.prescription_eyes for select to authenticated
  using ((select private.has_permission(organization_id, 'prescription.read'))
      or (select private.has_permission(organization_id, 'clinical.read')));

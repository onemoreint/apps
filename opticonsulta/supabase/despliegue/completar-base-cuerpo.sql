-- =============================================================================
-- OptiConsulta · Completar la base en Supabase (SQL Editor)
-- -----------------------------------------------------------------------------
-- Las migraciones 0001–0004 y las partes 1 y 2 de la 0005 ya están aplicadas.
-- Este archivo aplica el resto (0005 parte 3 y 0006–0012), en ese orden, en UNA
-- sola transacción: si algo falla, no queda nada a medias.
-- Esta variante no lleva BEGIN/COMMIT: la ejecuta un bloque DO (ya atómico)
-- desde el SQL Editor; ver docs/despliegue.md.
-- Generado desde supabase/migrations; no editar a mano.
-- =============================================================================
-- 0005 (parte 3): funciones con DELETE que la integración no pudo aplicar
-- -----------------------------------------------------------------------------
-- Permisos por rol (solo propietario mediante roles.manage)
-- -----------------------------------------------------------------------------
create or replace function public.set_role_permission(
  p_org     uuid,
  p_role    public.membership_role,
  p_perm    text,
  p_granted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_permission(p_org, 'roles.manage');

  if p_role = 'propietario' then
    raise exception 'Los permisos del propietario no se modifican' using errcode = '42501';
  end if;
  if not exists (select 1 from public.permissions where code = p_perm) then
    raise exception 'Permiso inexistente: %', p_perm using errcode = '22023';
  end if;

  if p_granted then
    insert into public.role_permissions (organization_id, role, permission_code)
    values (p_org, p_role, p_perm)
    on conflict do nothing;
  else
    delete from public.role_permissions
     where organization_id = p_org and role = p_role and permission_code = p_perm;
  end if;
end;
$$;

create or replace function public.record_login_failure(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := private.email_hash(p_email);
begin
  -- Tope por correo para que la tabla no pueda inflarse sin límite.
  if (select count(*) from private.login_failures
       where email_hash = v_hash and created_at > now() - interval '15 minutes') < 20 then
    insert into private.login_failures (email_hash) values (v_hash);
  end if;
  delete from private.login_failures where created_at < now() - interval '1 day';
end;
$$;

-- Solo un usuario autenticado puede limpiar sus propios fallos: un atacante
-- sin la contraseña no puede reiniciar el contador.
create or replace function public.clear_login_failures()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = (select auth.uid());
  if v_email is not null then
    delete from private.login_failures where email_hash = private.email_hash(v_email);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privilegios de ejecución. Supabase concede EXECUTE a anon y authenticated por
-- defecto en el esquema public: se revoca todo y se concede explícitamente.
-- -----------------------------------------------------------------------------
revoke all on function public.create_organization(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.invite_member(uuid, text, public.membership_role)           from public, anon, authenticated;
revoke all on function public.revoke_invitation(uuid)                                     from public, anon, authenticated;
revoke all on function public.accept_invitation(text)                                     from public, anon, authenticated;
revoke all on function public.update_member_role(uuid, public.membership_role)            from public, anon, authenticated;
revoke all on function public.set_member_status(uuid, public.membership_status)           from public, anon, authenticated;
revoke all on function public.set_role_permission(uuid, public.membership_role, text, boolean) from public, anon, authenticated;
revoke all on function public.my_permissions(uuid)                                        from public, anon, authenticated;
revoke all on function public.login_guard(text)                                           from public, anon, authenticated;
revoke all on function public.record_login_failure(text)                                  from public, anon, authenticated;
revoke all on function public.clear_login_failures()                                      from public, anon, authenticated;

grant execute on function public.create_organization(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.invite_member(uuid, text, public.membership_role)           to authenticated;
grant execute on function public.revoke_invitation(uuid)                                     to authenticated;
grant execute on function public.accept_invitation(text)                                     to authenticated;
grant execute on function public.update_member_role(uuid, public.membership_role)            to authenticated;
grant execute on function public.set_member_status(uuid, public.membership_status)           to authenticated;
grant execute on function public.set_role_permission(uuid, public.membership_role, text, boolean) to authenticated;
grant execute on function public.my_permissions(uuid)                                        to authenticated;
grant execute on function public.login_guard(text)                                           to anon, authenticated;
grant execute on function public.record_login_failure(text)                                  to anon, authenticated;
grant execute on function public.clear_login_failures()                                      to authenticated;

-- Las funciones de triggers y auxiliares privadas tampoco deben ser invocables.
revoke all on all functions in schema private from anon;

-- ====================== 20261010000006_catalogs_professionals.sql ======================
-- =============================================================================
-- OptiConsulta · Migración 0006 · Catálogos de referencia (RDA), código REPS,
-- profesionales y permisos clínicos de configuración
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Catálogos de referencia globales (no pertenecen a una organización).
-- Fuentes:
--   * Valores enumerados en el texto de la Res. 866 de 2021 tal como los
--     reproduce el anexo técnico de la Res. 1888 de 2025 (sembrados aquí).
--   * Tablas SISPRO (tipo de documento, sexo, municipios, CIE-10, CUPS, etc.):
--     se cargan con scripts/import-ref-codes.mjs desde el archivo oficial.
--     Los pocos valores sembrados para operar quedan con is_provisional = true.
-- -----------------------------------------------------------------------------
create table public.ref_codes (
  catalog         text not null check (catalog in (
                    'tipo_documento', 'sexo_biologico', 'identidad_genero', 'etnia',
                    'categoria_discapacidad', 'pais', 'municipio', 'zona_territorial',
                    'ocupacion', 'eapb', 'modalidad', 'grupo_servicio', 'entorno_atencion',
                    'via_ingreso', 'causa_atencion', 'tipo_diagnostico', 'tipo_alergia',
                    'parentesco', 'tipo_factor_riesgo', 'condicion_destino', 'cie10', 'cups')),
  code            text not null check (code ~ '^[A-Za-z0-9.\-]{1,12}$'),
  label           text not null check (char_length(label) between 1 and 300),
  source          text not null,
  is_provisional  boolean not null default false,
  is_active       boolean not null default true,
  updated_at      timestamptz not null default now(),
  primary key (catalog, code)
);
create index ref_codes_label_trgm on public.ref_codes using gin (label extensions.gin_trgm_ops);

alter table public.ref_codes enable row level security;
revoke all on table public.ref_codes from anon, authenticated;
grant select on public.ref_codes to authenticated;
create policy ref_codes_select on public.ref_codes for select to authenticated using (true);

insert into public.ref_codes (catalog, code, label, source) values
  ('modalidad', '01', 'Intramural', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '02', 'Extramural unidad móvil', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '03', 'Extramural domiciliaria', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '04', 'Extramural jornada de salud', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '05', 'Extramural (atención prehospitalaria o transporte asistencial)', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '06', 'Telemedicina interactiva', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '07', 'Telemedicina no interactiva', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '08', 'Telemedicina - Telexperticia', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('modalidad', '09', 'Telemedicina - Telemonitoreo', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('grupo_servicio', '01', 'Consulta externa', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('grupo_servicio', '02', 'Apoyo diagnóstico y complementación terapéutica', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('grupo_servicio', '03', 'Internación', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('grupo_servicio', '04', 'Quirúrgico', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('grupo_servicio', '05', 'Atención inmediata', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('entorno_atencion', '01', 'Hogar', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('entorno_atencion', '02', 'Comunitario', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('entorno_atencion', '03', 'Escolar', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('entorno_atencion', '04', 'Laboral', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('entorno_atencion', '05', 'Institucional', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_diagnostico', '01', 'Impresión diagnóstica', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_diagnostico', '02', 'Confirmado nuevo', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_diagnostico', '03', 'Confirmado repetido', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '01', 'Medicamento', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '02', 'Alimento', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '03', 'Sustancia del ambiente', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '04', 'Sustancia que entra en contacto con la piel', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '05', 'Picadura de insectos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_alergia', '06', 'Otra', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('parentesco', '01', 'Padres', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('parentesco', '02', 'Hermanos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('parentesco', '03', 'Tíos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('parentesco', '04', 'Abuelos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '01', 'Químicos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '02', 'Físicos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '03', 'Biomecánicos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '04', 'Psicosociales', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '05', 'Biológicos', 'Res. 866/2021 (anexo Res. 1888/2025)'),
  ('tipo_factor_riesgo', '06', 'Otro', 'Res. 866/2021 (anexo Res. 1888/2025)');

-- Provisionales: permiten operar antes de importar las tablas SISPRO oficiales.
-- El importador las reemplaza; ver docs/catalogos.md.
insert into public.ref_codes (catalog, code, label, source, is_provisional) values
  ('tipo_documento', 'CC', 'Cédula de ciudadanía', 'provisional: verificar con SISPRO', true),
  ('tipo_documento', 'CE', 'Cédula de extranjería', 'provisional: verificar con SISPRO', true),
  ('tipo_documento', 'TI', 'Tarjeta de identidad', 'provisional: verificar con SISPRO', true),
  ('tipo_documento', 'RC', 'Registro civil', 'provisional: verificar con SISPRO', true),
  ('tipo_documento', 'PA', 'Pasaporte', 'provisional: verificar con SISPRO', true),
  ('sexo_biologico', 'H', 'Hombre', 'provisional: verificar con SISPRO', true),
  ('sexo_biologico', 'M', 'Mujer', 'provisional: verificar con SISPRO', true),
  ('sexo_biologico', 'I', 'Indeterminado', 'provisional: verificar con SISPRO', true);

-- Validación de códigos usada por los triggers de las tablas que los referencian.
create or replace function private.assert_ref_code(p_catalog text, p_code text, p_label text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_code is null then
    return;
  end if;
  if not exists (
    select 1 from public.ref_codes r
     where r.catalog = p_catalog and r.code = p_code and r.is_active
  ) then
    raise exception '% no válido: %', p_label, p_code using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.assert_ref_code(text, text, text) from public;
-- Lo invocan triggers que se ejecutan con el rol del usuario; solo valida códigos.
grant execute on function private.assert_ref_code(text, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Código de habilitación REPS por sede (elemento 16 del RDA). Declarado por el
-- cliente; OptiConsulta no lo verifica contra el REPS.
-- -----------------------------------------------------------------------------
alter table public.locations
  add column reps_code text check (reps_code is null or reps_code ~ '^[0-9]{10,12}$');
grant insert (reps_code), update (reps_code) on public.locations to authenticated;

-- Necesario para FKs compuestas que fuerzan la misma organización.
alter table public.memberships add constraint memberships_id_org_key unique (id, organization_id);

-- -----------------------------------------------------------------------------
-- Nuevos permisos
-- -----------------------------------------------------------------------------
insert into public.permissions (code, area, description, is_clinical) values
  ('clinical.configure', 'Clínica', 'Configurar la plantilla de consulta, la notación de agudeza visual y los rangos de las fórmulas', false),
  ('professionals.manage', 'Usuarios', 'Registrar profesionales y verificar sus credenciales', false);

insert into private.default_role_permissions (role, permission_code) values
  ('optometra', 'clinical.configure'),
  ('propietario', 'professionals.manage'),
  ('administrador', 'professionals.manage');

-- Propaga a las organizaciones existentes.
insert into public.role_permissions (organization_id, role, permission_code)
select o.id, d.role, d.permission_code
  from public.organizations o
  cross join private.default_role_permissions d
 where d.permission_code in ('clinical.configure', 'professionals.manage')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Profesionales de la salud de la óptica.
-- El número de tarjeta profesional es DECLARADO. Solo se imprime en documentos
-- cuando alguien con professionals.manage registra que lo verificó (ReTHUS).
-- -----------------------------------------------------------------------------
create table public.professionals (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete restrict,
  membership_id         uuid,
  full_name             text not null check (char_length(full_name) between 3 and 120),
  doc_type              text not null,
  doc_number            text not null check (doc_number ~ '^[A-Za-z0-9]{3,20}$'),
  profession            text not null default 'optometra'
                          check (profession in ('optometra', 'oftalmologo', 'otro')),
  professional_card     text check (professional_card is null or professional_card ~ '^[A-Za-z0-9\-]{3,30}$'),
  verified_at           timestamptz,
  verified_by           uuid references auth.users(id) on delete set null,
  verification_note     text check (verification_note is null or char_length(verification_note) <= 300),
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, doc_type, doc_number),
  unique (membership_id),
  foreign key (membership_id, organization_id)
    references public.memberships (id, organization_id) on delete restrict
);
create index professionals_org_idx on public.professionals (organization_id);

create or replace function private.professionals_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_ref_code('tipo_documento', new.doc_type, 'Tipo de documento');
  -- Cambiar identidad o tarjeta invalida la verificación previa.
  if tg_op = 'UPDATE' and (
       new.doc_type is distinct from old.doc_type
    or new.doc_number is distinct from old.doc_number
    or new.professional_card is distinct from old.professional_card
    or new.full_name is distinct from old.full_name) then
    new.verified_at := null;
    new.verified_by := null;
    new.verification_note := null;
  end if;
  return new;
end;
$$;
revoke all on function private.professionals_before_write() from public;

create trigger professionals_before_write
  before insert or update on public.professionals
  for each row execute function private.professionals_before_write();
create trigger professionals_updated_at
  before update on public.professionals
  for each row execute function private.set_updated_at();
create trigger professionals_audit
  after insert or update on public.professionals
  for each row execute function private.audit_row_change();

alter table public.professionals enable row level security;
revoke all on table public.professionals from anon, authenticated;
grant select on public.professionals to authenticated;
grant insert (organization_id, membership_id, full_name, doc_type, doc_number, profession, professional_card)
  on public.professionals to authenticated;
grant update (membership_id, full_name, doc_type, doc_number, profession, professional_card, is_active)
  on public.professionals to authenticated;

create policy professionals_select on public.professionals
  for select to authenticated using ((select private.is_member(organization_id)));
create policy professionals_insert on public.professionals
  for insert to authenticated with check ((select private.has_permission(organization_id, 'professionals.manage')));
create policy professionals_update on public.professionals
  for update to authenticated
  using ((select private.has_permission(organization_id, 'professionals.manage')))
  with check ((select private.has_permission(organization_id, 'professionals.manage')));

-- Profesional vinculado al usuario de la sesión en una organización.
create or replace function private.current_professional_id(p_org uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
    from public.professionals p
    join public.memberships m on m.id = p.membership_id
   where p.organization_id = p_org
     and p.is_active
     and m.user_id = (select auth.uid())
     and m.status = 'activa';
$$;
revoke all on function private.current_professional_id(uuid) from public;
grant execute on function private.current_professional_id(uuid) to authenticated;

create or replace function public.verify_professional(p_professional uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.professionals where id = p_professional;
  if v_org is null then
    raise exception 'Profesional no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'professionals.manage');
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Indica cómo verificaste la credencial (por ejemplo, consulta ReTHUS y fecha)' using errcode = '22023';
  end if;

  update public.professionals
     set verified_at = now(), verified_by = (select auth.uid()), verification_note = left(trim(p_note), 300)
   where id = p_professional and professional_card is not null;
  if not found then
    raise exception 'Registra primero el número de tarjeta profesional' using errcode = '22023';
  end if;
  perform private.write_audit(v_org, 'professional.verify', 'professionals', p_professional::text);
end;
$$;
revoke all on function public.verify_professional(uuid, text) from public, anon, authenticated;
grant execute on function public.verify_professional(uuid, text) to authenticated;

-- ====================== 20261010000007_patients_consents_agenda.sql ======================
-- =============================================================================
-- OptiConsulta · Migración 0007 · Pacientes (identificación RDA),
-- consentimientos y agenda
-- =============================================================================

-- Minúsculas sin tildes, para búsquedas. IMMUTABLE: apta para columnas generadas.
create or replace function private.fold(p text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    translate(lower(coalesce(p, '')), 'áàäâéèëêíìïîóòöôúùüûñç', 'aaaaeeeeiiiioooouuuunc'),
    '\s+', ' ', 'g'));
$$;
revoke all on function private.fold(text) from public;
grant execute on function private.fold(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Pacientes. Los nombres de campo siguen los elementos de dato del RDA
-- (Res. 866 de 2021); los códigos se validan contra public.ref_codes.
-- -----------------------------------------------------------------------------
create table public.patients (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references public.organizations(id) on delete restrict,
  -- Identificación (elementos 2.1 a 3.4)
  doc_type                    text not null,
  doc_number                  text not null check (doc_number ~ '^[A-Za-z0-9]{3,20}$'),
  first_name                  text not null check (char_length(first_name) between 1 and 60),
  second_name                 text check (second_name is null or char_length(second_name) <= 60),
  first_surname               text not null check (char_length(first_surname) between 1 and 60),
  second_surname              text check (second_surname is null or char_length(second_surname) <= 60),
  -- Demografía (elementos 4, 1, 5, 6, 13, 10, 7, 11, 12, 14)
  birth_date                  date check (birth_date is null or birth_date between date '1900-01-01' and current_date),
  sex_code                    text,
  gender_identity_code        text,
  nationality_code            text,
  ethnicity_code              text,
  ethnic_community            text check (ethnic_community is null or char_length(ethnic_community) <= 120),
  disability_code             text,
  occupation_code             text,
  residence_country_code      text,
  residence_municipality_code text check (residence_municipality_code is null or residence_municipality_code ~ '^[0-9]{5}$'),
  residence_zone_code         text,
  -- Entidad responsable del plan de beneficios (elementos 15.1 y 15.2)
  payer_code                  text check (payer_code is null or payer_code ~ '^[A-Za-z0-9]{3,12}$'),
  payer_name                  text check (payer_name is null or char_length(payer_name) <= 160),
  -- Contacto y acudiente (datos administrativos)
  phone                       text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  email                       extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address                     text check (address is null or char_length(address) <= 200),
  guardian_name               text check (guardian_name is null or char_length(guardian_name) <= 120),
  guardian_doc                text check (guardian_doc is null or guardian_doc ~ '^[A-Za-z0-9]{3,20}$'),
  guardian_relationship       text check (guardian_relationship is null or char_length(guardian_relationship) <= 60),
  search_text                 text generated always as (
                                private.fold(first_name || ' ' || coalesce(second_name, '') || ' ' ||
                                             first_surname || ' ' || coalesce(second_surname, '') || ' ' || doc_number)
                              ) stored,
  version                     integer not null default 1,
  created_by                  uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, doc_type, doc_number)
);
create index patients_org_idx on public.patients (organization_id, first_surname, first_name);
create index patients_search_trgm on public.patients using gin (search_text extensions.gin_trgm_ops);

create or replace function private.patients_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform private.assert_ref_code('tipo_documento', new.doc_type, 'Tipo de documento');
  perform private.assert_ref_code('sexo_biologico', new.sex_code, 'Sexo biológico');
  perform private.assert_ref_code('identidad_genero', new.gender_identity_code, 'Identidad de género');
  perform private.assert_ref_code('pais', new.nationality_code, 'Nacionalidad');
  perform private.assert_ref_code('etnia', new.ethnicity_code, 'Etnia');
  perform private.assert_ref_code('categoria_discapacidad', new.disability_code, 'Categoría de discapacidad');
  perform private.assert_ref_code('ocupacion', new.occupation_code, 'Ocupación');
  perform private.assert_ref_code('pais', new.residence_country_code, 'País de residencia');
  perform private.assert_ref_code('zona_territorial', new.residence_zone_code, 'Zona territorial');
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.version := 1;
  else
    -- Control de concurrencia optimista: el cliente envía la versión que leyó.
    if new.version is distinct from old.version then
      raise exception 'Otra persona modificó esta ficha. Recarga la página y vuelve a intentarlo.'
        using errcode = '40001';
    end if;
    new.version := old.version + 1;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
revoke all on function private.patients_before_write() from public;

create trigger patients_before_write
  before insert or update on public.patients
  for each row execute function private.patients_before_write();
create trigger patients_updated_at
  before update on public.patients
  for each row execute function private.set_updated_at();
create trigger patients_audit
  after insert or update on public.patients
  for each row execute function private.audit_row_change();

alter table public.patients enable row level security;
revoke all on table public.patients from anon, authenticated;
grant select on public.patients to authenticated;
grant insert (organization_id, doc_type, doc_number, first_name, second_name, first_surname, second_surname,
              birth_date, sex_code, gender_identity_code, nationality_code, ethnicity_code, ethnic_community,
              disability_code, occupation_code, residence_country_code, residence_municipality_code,
              residence_zone_code, payer_code, payer_name, phone, email, address,
              guardian_name, guardian_doc, guardian_relationship)
  on public.patients to authenticated;
grant update (doc_type, doc_number, first_name, second_name, first_surname, second_surname,
              birth_date, sex_code, gender_identity_code, nationality_code, ethnicity_code, ethnic_community,
              disability_code, occupation_code, residence_country_code, residence_municipality_code,
              residence_zone_code, payer_code, payer_name, phone, email, address,
              guardian_name, guardian_doc, guardian_relationship, version)
  on public.patients to authenticated;

create policy patients_select on public.patients
  for select to authenticated using ((select private.has_permission(organization_id, 'patients.read')));
create policy patients_insert on public.patients
  for insert to authenticated with check ((select private.has_permission(organization_id, 'patients.write')));
create policy patients_update on public.patients
  for update to authenticated
  using ((select private.has_permission(organization_id, 'patients.write')))
  with check ((select private.has_permission(organization_id, 'patients.write')));

-- -----------------------------------------------------------------------------
-- Textos de autorización (versionados e inmutables) y consentimientos.
-- La redacción la aporta la óptica con su asesor jurídico.
-- -----------------------------------------------------------------------------
create table public.consent_texts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind            text not null check (kind in ('tratamiento_datos', 'atencion_optometrica', 'otro')),
  version         integer not null,
  title           text not null check (char_length(title) between 3 and 160),
  body            text not null check (char_length(body) between 20 and 20000),
  is_active       boolean not null default true,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, kind, version)
);
create index consent_texts_org_idx on public.consent_texts (organization_id, kind);

create or replace function private.consent_texts_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Bloquea la combinación para asignar la versión siguiente sin carreras.
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(new.organization_id::text || new.kind));
    select coalesce(max(version), 0) + 1 into new.version
      from public.consent_texts where organization_id = new.organization_id and kind = new.kind;
    new.created_by := (select auth.uid());
    -- Solo una versión activa por tipo.
    update public.consent_texts set is_active = false
     where organization_id = new.organization_id and kind = new.kind and is_active;
    new.is_active := true;
    return new;
  end if;
  -- Un texto publicado no cambia: solo puede desactivarse.
  if (to_jsonb(new) - 'is_active') is distinct from (to_jsonb(old) - 'is_active') then
    raise exception 'Un texto de autorización publicado no se modifica; crea una versión nueva' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.consent_texts_before_write() from public;

create trigger consent_texts_before_write
  before insert or update on public.consent_texts
  for each row execute function private.consent_texts_before_write();
create trigger consent_texts_audit
  after insert or update on public.consent_texts
  for each row execute function private.audit_row_change();

create table public.consents (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references public.organizations(id) on delete restrict,
  patient_id         uuid not null,
  consent_text_id    uuid not null,
  decision           text not null check (decision in ('otorgado', 'negado')),
  channel            text not null check (channel in ('firma_presencial', 'documento_escaneado', 'firma_electronica')),
  -- Quien firma cuando el titular es menor o no puede hacerlo.
  signed_by_guardian boolean not null default false,
  recorded_by        uuid references auth.users(id) on delete set null,
  recorded_at        timestamptz not null default now(),
  revoked_at         timestamptz,
  revoked_by         uuid references auth.users(id) on delete set null,
  revocation_reason  text check (revocation_reason is null or char_length(revocation_reason) <= 300),
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (consent_text_id, organization_id) references public.consent_texts (id, organization_id) on delete restrict
);
create index consents_patient_idx on public.consents (organization_id, patient_id, recorded_at desc);

create or replace function private.consents_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.recorded_by := (select auth.uid());
    new.recorded_at := now();
    new.revoked_at := null;
    new.revoked_by := null;
    new.revocation_reason := null;
    return new;
  end if;
  -- Solo se permite registrar la revocación, una vez.
  if old.revoked_at is not null
     or (to_jsonb(new) - array['revoked_at','revoked_by','revocation_reason'])
        is distinct from (to_jsonb(old) - array['revoked_at','revoked_by','revocation_reason']) then
    raise exception 'Un consentimiento registrado no se modifica; solo puede revocarse' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.consents_before_write() from public;

create trigger consents_before_write
  before insert or update on public.consents
  for each row execute function private.consents_before_write();
create trigger consents_audit
  after insert or update on public.consents
  for each row execute function private.audit_row_change();

alter table public.consent_texts enable row level security;
alter table public.consents      enable row level security;
revoke all on table public.consent_texts, public.consents from anon, authenticated;
grant select on public.consent_texts, public.consents to authenticated;
grant insert (organization_id, kind, title, body) on public.consent_texts to authenticated;
grant update (is_active) on public.consent_texts to authenticated;
grant insert (organization_id, patient_id, consent_text_id, decision, channel, signed_by_guardian)
  on public.consents to authenticated;

create policy consent_texts_select on public.consent_texts
  for select to authenticated using ((select private.is_member(organization_id)));
create policy consent_texts_insert on public.consent_texts
  for insert to authenticated with check ((select private.has_permission(organization_id, 'privacy.manage')));
create policy consent_texts_update on public.consent_texts
  for update to authenticated
  using ((select private.has_permission(organization_id, 'privacy.manage')))
  with check ((select private.has_permission(organization_id, 'privacy.manage')));

create policy consents_select on public.consents
  for select to authenticated using ((select private.has_permission(organization_id, 'patients.read')));
create policy consents_insert on public.consents
  for insert to authenticated with check ((select private.has_permission(organization_id, 'patients.write')));

create or replace function public.revoke_consent(p_consent uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.consents where id = p_consent;
  if v_org is null then
    raise exception 'Consentimiento no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'patients.write');
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'Indica el motivo de la revocación' using errcode = '22023';
  end if;
  update public.consents
     set revoked_at = now(), revoked_by = (select auth.uid()), revocation_reason = left(trim(p_reason), 300)
   where id = p_consent and revoked_at is null;
end;
$$;
revoke all on function public.revoke_consent(uuid, text) from public, anon, authenticated;
grant execute on function public.revoke_consent(uuid, text) to authenticated;

-- ¿El paciente tiene autorización vigente de tratamiento de datos?
create or replace function private.has_data_consent(p_org uuid, p_patient uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.consents c
      join public.consent_texts t on t.id = c.consent_text_id
     where c.organization_id = p_org
       and c.patient_id = p_patient
       and t.kind = 'tratamiento_datos'
       and c.decision = 'otorgado'
       and c.revoked_at is null
  );
$$;
revoke all on function private.has_data_consent(uuid, uuid) from public;
grant execute on function private.has_data_consent(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Agenda
-- -----------------------------------------------------------------------------
create type public.appointment_status as enum ('programada', 'confirmada', 'atendida', 'cancelada', 'no_asistio');

create table public.appointments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id     uuid not null,
  patient_id      uuid not null,
  professional_id uuid not null,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  status          public.appointment_status not null default 'programada',
  reason          text check (reason is null or char_length(reason) <= 200),
  cancel_reason   text check (cancel_reason is null or char_length(cancel_reason) <= 200),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  check (ends_at > starts_at and ends_at - starts_at <= interval '8 hours'),
  check (status <> 'cancelada' or cancel_reason is not null),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict,
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (professional_id, organization_id) references public.professionals (id, organization_id) on delete restrict,
  -- Un profesional no puede tener dos citas vigentes que se crucen.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('programada', 'confirmada', 'atendida'))
);
create index appointments_org_start_idx on public.appointments (organization_id, starts_at);
create index appointments_patient_idx on public.appointments (organization_id, patient_id, starts_at desc);

create or replace function private.appointments_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    if new.status not in ('programada', 'confirmada') then
      raise exception 'Una cita nueva debe estar programada o confirmada' using errcode = '22023';
    end if;
  elsif old.status in ('atendida', 'cancelada', 'no_asistio')
        and (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    raise exception 'Una cita atendida, cancelada o con inasistencia ya no se modifica' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.appointments_before_write() from public;

create trigger appointments_before_write
  before insert or update on public.appointments
  for each row execute function private.appointments_before_write();
create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function private.set_updated_at();
create trigger appointments_audit
  after insert or update on public.appointments
  for each row execute function private.audit_row_change();

alter table public.appointments enable row level security;
revoke all on table public.appointments from anon, authenticated;
grant select on public.appointments to authenticated;
grant insert (organization_id, location_id, patient_id, professional_id, starts_at, ends_at, status, reason)
  on public.appointments to authenticated;
grant update (location_id, professional_id, starts_at, ends_at, status, reason, cancel_reason)
  on public.appointments to authenticated;

create policy appointments_select on public.appointments
  for select to authenticated using ((select private.has_permission(organization_id, 'agenda.read')));
create policy appointments_insert on public.appointments
  for insert to authenticated with check ((select private.has_permission(organization_id, 'agenda.write')));
-- 'atendida' solo la asigna start_encounter(); el resto con agenda.write.
create policy appointments_update on public.appointments
  for update to authenticated
  using ((select private.has_permission(organization_id, 'agenda.write')))
  with check ((select private.has_permission(organization_id, 'agenda.write')) and status <> 'atendida');

-- ====================== 20261010000008_clinical.sql ======================
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

-- ====================== 20261010000009_clinical_rpc.sql ======================
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

-- ====================== 20261010000010_commerce.sql ======================
-- =============================================================================
-- OptiConsulta · Migración 0010 · Catálogo, inventario, cotizaciones, ventas,
-- pagos, reversiones y caja
-- -----------------------------------------------------------------------------
-- Principios:
--   * Importes en numeric(14,2) calculados en SQL; el cliente solo muestra.
--   * Ventas, pagos, reversiones, movimientos de inventario y de caja son de
--     solo inserción. Una venta se anula (no se borra); un pago se revierte con
--     un registro propio que conserva la trazabilidad.
--   * El saldo se deriva: total − pagos sin reversión. Nunca se edita.
--   * Las existencias se mantienen dentro de la misma transacción del
--     movimiento y no pueden quedar negativas.
--   * Recibo interno ≠ factura electrónica: la facturación DIAN está fuera del MVP.
-- =============================================================================

insert into public.permissions (code, area, description, is_clinical) values
  ('catalog.manage', 'Inventario', 'Crear y editar productos, precios, proveedores y medios de pago', false);
insert into private.default_role_permissions (role, permission_code) values
  ('propietario', 'catalog.manage'), ('administrador', 'catalog.manage');
insert into public.role_permissions (organization_id, role, permission_code)
select o.id, d.role, d.permission_code
  from public.organizations o cross join private.default_role_permissions d
 where d.permission_code = 'catalog.manage'
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Consecutivos por organización (cotización, venta, recibo, orden de laboratorio)
-- -----------------------------------------------------------------------------
create table private.document_sequences (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  kind            text not null check (kind in ('cotizacion', 'venta', 'recibo', 'orden_lab')),
  next_value      bigint not null default 1,
  primary key (organization_id, kind)
);
revoke all on table private.document_sequences from public, authenticated;

create or replace function private.next_number(p_org uuid, p_kind text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v bigint;
begin
  insert into private.document_sequences (organization_id, kind) values (p_org, p_kind)
  on conflict do nothing;
  -- UPDATE … RETURNING bloquea la fila: dos ventas simultáneas no comparten número.
  update private.document_sequences set next_value = next_value + 1
   where organization_id = p_org and kind = p_kind
  returning next_value - 1 into v;
  return v;
end;
$$;
revoke all on function private.next_number(uuid, text) from public;

-- -----------------------------------------------------------------------------
-- Proveedores y productos
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name            text not null check (char_length(name) between 2 and 160),
  nit             text check (nit is null or nit ~ '^[0-9]{5,12}(-[0-9])?$'),
  contact_name    text check (contact_name is null or char_length(contact_name) <= 120),
  phone           text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  email           extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);
create index suppliers_org_idx on public.suppliers (organization_id);

create type public.product_kind as enum ('montura', 'lente_oftalmico', 'lente_contacto', 'accesorio', 'servicio', 'otro');

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sku             extensions.citext not null check (sku ~ '^[A-Za-z0-9._\-]{1,40}$'),
  name            text not null check (char_length(name) between 2 and 160),
  kind            public.product_kind not null,
  brand           text check (brand is null or char_length(brand) <= 80),
  description     text check (description is null or char_length(description) <= 500),
  -- Precio final de venta en pesos. 0 = precio variable (se fija en cada venta).
  unit_price      numeric(14,2) not null check (unit_price >= 0),
  cost            numeric(14,2) check (cost is null or cost >= 0),
  tracks_stock    boolean not null default true,
  stock_min       integer not null default 0 check (stock_min >= 0),
  supplier_id     uuid,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, sku),
  check (kind <> 'servicio' or not tracks_stock),
  foreign key (supplier_id, organization_id) references public.suppliers (id, organization_id) on delete restrict
);
create index products_org_name_idx on public.products (organization_id, name);

create trigger suppliers_updated_at before update on public.suppliers for each row execute function private.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger suppliers_audit after insert or update on public.suppliers for each row execute function private.audit_row_change();
create trigger products_audit after insert or update on public.products for each row execute function private.audit_row_change();

-- -----------------------------------------------------------------------------
-- Inventario
-- -----------------------------------------------------------------------------
create type public.movement_type as enum ('entrada', 'salida_venta', 'devolucion_venta', 'ajuste_positivo', 'ajuste_negativo');

create table public.inventory_stock (
  organization_id uuid not null,
  product_id      uuid not null,
  location_id     uuid not null,
  quantity        integer not null default 0,
  updated_at      timestamptz not null default now(),
  primary key (product_id, location_id),
  foreign key (product_id, organization_id) references public.products (id, organization_id) on delete restrict,
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict
);
create index inventory_stock_org_idx on public.inventory_stock (organization_id, location_id);

create table public.inventory_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  location_id     uuid not null,
  product_id      uuid not null,
  movement_type   public.movement_type not null,
  quantity        integer not null check (quantity > 0),
  unit_cost       numeric(14,2) check (unit_cost is null or unit_cost >= 0),
  reason          text check (reason is null or char_length(reason) <= 300),
  sale_item_id    uuid,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (product_id, organization_id) references public.products (id, organization_id) on delete restrict,
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict
);
create index inventory_movements_org_idx on public.inventory_movements (organization_id, product_id, created_at desc);
-- Una venta descuenta inventario una sola vez por ítem (criterio 8), y se devuelve una sola vez.
create unique index inventory_movements_once_per_sale_item
  on public.inventory_movements (sale_item_id, movement_type) where sale_item_id is not null;

-- Mantiene las existencias en la misma transacción; impide existencias negativas.
create or replace function private.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sign   integer := case when new.movement_type in ('entrada', 'devolucion_venta', 'ajuste_positivo') then 1 else -1 end;
  v_qty    integer;
  v_name   text;
  v_tracks boolean;
begin
  select tracks_stock, name into v_tracks, v_name from public.products where id = new.product_id;
  if not v_tracks then
    raise exception 'El producto % no maneja existencias', v_name using errcode = '22023';
  end if;

  insert into public.inventory_stock (organization_id, product_id, location_id, quantity)
  values (new.organization_id, new.product_id, new.location_id, 0)
  on conflict (product_id, location_id) do nothing;

  update public.inventory_stock
     set quantity = quantity + v_sign * new.quantity, updated_at = now()
   where product_id = new.product_id and location_id = new.location_id
  returning quantity into v_qty;

  if v_qty < 0 then
    raise exception 'Existencias insuficientes de %: faltan % unidades en esta sede', v_name, -v_qty using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.apply_inventory_movement() from public;

create trigger inventory_movements_apply
  after insert on public.inventory_movements
  for each row execute function private.apply_inventory_movement();
create trigger inventory_movements_immutable
  before update or delete on public.inventory_movements
  for each row execute function private.forbid_audit_mutation();

-- -----------------------------------------------------------------------------
-- Medios de pago
-- -----------------------------------------------------------------------------
create type public.payment_kind as enum ('efectivo', 'tarjeta', 'transferencia', 'otro');

create table public.payment_methods (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 60),
  kind            public.payment_kind not null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);
create index payment_methods_org_idx on public.payment_methods (organization_id);
create trigger payment_methods_audit after insert or update on public.payment_methods for each row execute function private.audit_row_change();

create or replace function private.seed_payment_methods()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.payment_methods (organization_id, name, kind) values
    (new.id, 'Efectivo', 'efectivo'),
    (new.id, 'Tarjeta débito', 'tarjeta'),
    (new.id, 'Tarjeta crédito', 'tarjeta'),
    (new.id, 'Transferencia', 'transferencia')
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.seed_payment_methods() from public;
create trigger organizations_seed_payment_methods after insert on public.organizations
  for each row execute function private.seed_payment_methods();
insert into public.payment_methods (organization_id, name, kind)
select o.id, m.name, m.kind::public.payment_kind
  from public.organizations o
  cross join (values ('Efectivo', 'efectivo'), ('Tarjeta débito', 'tarjeta'), ('Tarjeta crédito', 'tarjeta'), ('Transferencia', 'transferencia')) m(name, kind)
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Cotizaciones
-- -----------------------------------------------------------------------------
create table public.quotes (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete restrict,
  location_id          uuid not null,
  number               bigint not null,
  patient_id           uuid,
  prescription_id      uuid,
  status               text not null default 'abierta' check (status in ('abierta', 'convertida', 'anulada')),
  valid_until          date not null,
  notes                text check (notes is null or char_length(notes) <= 500),
  subtotal             numeric(14,2) not null default 0,
  discount_total       numeric(14,2) not null default 0,
  total                numeric(14,2) not null default 0,
  discount_status      text not null default 'no_requiere'
                         check (discount_status in ('no_requiere', 'pendiente', 'aprobado', 'rechazado')),
  discount_reviewed_by uuid references auth.users(id) on delete set null,
  discount_reviewed_at timestamptz,
  annul_reason         text check (annul_reason is null or char_length(annul_reason) <= 300),
  version              integer not null default 1,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, number),
  check (total = subtotal - discount_total and total >= 0),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict,
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (prescription_id, organization_id) references public.prescriptions (id, organization_id) on delete restrict
);
create index quotes_org_created_idx on public.quotes (organization_id, created_at desc);
create trigger quotes_updated_at before update on public.quotes for each row execute function private.set_updated_at();

create table public.quote_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  quote_id        uuid not null,
  position        smallint not null,
  product_id      uuid not null,
  description     text not null,
  quantity        integer not null check (quantity between 1 and 999),
  unit_price      numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total      numeric(14,2) not null,
  check (discount_amount <= quantity * unit_price and line_total = quantity * unit_price - discount_amount),
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id) on delete restrict,
  foreign key (product_id, organization_id) references public.products (id, organization_id) on delete restrict,
  unique (quote_id, position)
);
create index quote_items_org_idx on public.quote_items (organization_id, quote_id);

-- -----------------------------------------------------------------------------
-- Ventas
-- -----------------------------------------------------------------------------
create table public.sales (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references public.organizations(id) on delete restrict,
  location_id          uuid not null,
  number               bigint not null,
  patient_id           uuid,
  prescription_id      uuid,
  quote_id             uuid unique,
  status               text not null default 'confirmada' check (status in ('confirmada', 'anulada')),
  subtotal             numeric(14,2) not null,
  discount_total       numeric(14,2) not null,
  total                numeric(14,2) not null,
  discount_approved_by uuid references auth.users(id) on delete set null,
  seller_id            uuid not null references auth.users(id) on delete restrict,
  notes                text check (notes is null or char_length(notes) <= 500),
  annulled_at          timestamptz,
  annulled_by          uuid references auth.users(id) on delete set null,
  annul_reason         text check (annul_reason is null or char_length(annul_reason) <= 300),
  created_at           timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, number),
  check (total = subtotal - discount_total and total >= 0),
  check (status <> 'anulada' or (annulled_at is not null and annul_reason is not null)),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict,
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (prescription_id, organization_id) references public.prescriptions (id, organization_id) on delete restrict,
  foreign key (quote_id, organization_id) references public.quotes (id, organization_id) on delete restrict
);
create index sales_org_created_idx on public.sales (organization_id, created_at desc);
create index sales_patient_idx on public.sales (organization_id, patient_id);

create table public.sale_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  sale_id         uuid not null,
  position        smallint not null,
  product_id      uuid not null,
  description     text not null,
  quantity        integer not null check (quantity between 1 and 999),
  unit_price      numeric(14,2) not null check (unit_price >= 0),
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  line_total      numeric(14,2) not null,
  unique (id, organization_id),
  unique (sale_id, position),
  check (discount_amount <= quantity * unit_price and line_total = quantity * unit_price - discount_amount),
  foreign key (sale_id, organization_id) references public.sales (id, organization_id) on delete restrict,
  foreign key (product_id, organization_id) references public.products (id, organization_id) on delete restrict
);
create index sale_items_org_idx on public.sale_items (organization_id, sale_id);
create index sale_items_product_idx on public.sale_items (organization_id, product_id);

alter table public.inventory_movements
  add constraint inventory_movements_sale_item_fk foreign key (sale_item_id) references public.sale_items (id) on delete restrict;

-- Una venta solo puede pasar de confirmada a anulada; sus ítems no cambian.
create or replace function private.guard_sale()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fixed text[] := array['status', 'annulled_at', 'annulled_by', 'annul_reason'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Las ventas no se eliminan; se anulan' using errcode = '42501';
  end if;
  if old.status = 'confirmada' and new.status = 'anulada' and (to_jsonb(new) - v_fixed) = (to_jsonb(old) - v_fixed) then
    return new;
  end if;
  raise exception 'Una venta registrada no se modifica; se anula con motivo' using errcode = '42501';
end;
$$;
revoke all on function private.guard_sale() from public;
create trigger sales_guard before update or delete on public.sales for each row execute function private.guard_sale();
create trigger sale_items_immutable before update or delete on public.sale_items for each row execute function private.forbid_audit_mutation();

-- -----------------------------------------------------------------------------
-- Caja
-- -----------------------------------------------------------------------------
create table public.cash_sessions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  location_id     uuid not null,
  opened_by       uuid not null references auth.users(id) on delete restrict,
  opened_at       timestamptz not null default now(),
  opening_amount  numeric(14,2) not null check (opening_amount >= 0),
  status          text not null default 'abierta' check (status in ('abierta', 'cerrada')),
  closed_at       timestamptz,
  closed_by       uuid references auth.users(id) on delete set null,
  close_notes     text check (close_notes is null or char_length(close_notes) <= 500),
  unique (id, organization_id),
  check (status <> 'cerrada' or closed_at is not null),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict
);
create unique index cash_sessions_one_open_per_user on public.cash_sessions (opened_by) where status = 'abierta';
create index cash_sessions_org_idx on public.cash_sessions (organization_id, opened_at desc);

create or replace function private.guard_cash_session()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_fixed text[] := array['status', 'closed_at', 'closed_by', 'close_notes'];
begin
  if tg_op = 'DELETE' then
    raise exception 'Las cajas no se eliminan' using errcode = '42501';
  end if;
  if old.status = 'abierta' and new.status = 'cerrada' and (to_jsonb(new) - v_fixed) = (to_jsonb(old) - v_fixed) then
    return new;
  end if;
  raise exception 'Una caja cerrada no se modifica' using errcode = '42501';
end;
$$;
revoke all on function private.guard_cash_session() from public;
create trigger cash_sessions_guard before update or delete on public.cash_sessions for each row execute function private.guard_cash_session();

create table public.cash_movements (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  session_id      uuid not null,
  kind            text not null check (kind in ('ingreso', 'egreso')),
  amount          numeric(14,2) not null check (amount > 0),
  reason          text not null check (char_length(reason) between 3 and 300),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  foreign key (session_id, organization_id) references public.cash_sessions (id, organization_id) on delete restrict
);
create index cash_movements_org_idx on public.cash_movements (organization_id, session_id);
create trigger cash_movements_immutable before update or delete on public.cash_movements for each row execute function private.forbid_audit_mutation();

create table public.cash_session_counts (
  session_id        uuid not null,
  organization_id   uuid not null,
  payment_method_id uuid not null,
  expected          numeric(14,2) not null,
  counted           numeric(14,2) not null check (counted >= 0),
  difference        numeric(14,2) not null,
  primary key (session_id, payment_method_id),
  check (difference = counted - expected),
  foreign key (session_id, organization_id) references public.cash_sessions (id, organization_id) on delete restrict,
  foreign key (payment_method_id, organization_id) references public.payment_methods (id, organization_id) on delete restrict
);
create index cash_session_counts_org_idx on public.cash_session_counts (organization_id, session_id);
create trigger cash_session_counts_immutable before update or delete on public.cash_session_counts for each row execute function private.forbid_audit_mutation();

-- -----------------------------------------------------------------------------
-- Pagos y reversiones
-- -----------------------------------------------------------------------------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null,
  sale_id           uuid not null,
  cash_session_id   uuid not null,
  payment_method_id uuid not null,
  amount            numeric(14,2) not null check (amount > 0),
  reference         text check (reference is null or char_length(reference) <= 60),
  receipt_number    bigint not null,
  received_by       uuid not null references auth.users(id) on delete restrict,
  created_at        timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, receipt_number),
  foreign key (sale_id, organization_id) references public.sales (id, organization_id) on delete restrict,
  foreign key (cash_session_id, organization_id) references public.cash_sessions (id, organization_id) on delete restrict,
  foreign key (payment_method_id, organization_id) references public.payment_methods (id, organization_id) on delete restrict
);
create index payments_org_created_idx on public.payments (organization_id, created_at desc);
create index payments_sale_idx on public.payments (sale_id);
create trigger payments_immutable before update or delete on public.payments for each row execute function private.forbid_audit_mutation();

create table public.payment_reversals (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  payment_id      uuid not null unique,
  reason          text not null check (char_length(reason) between 5 and 300),
  cash_session_id uuid,
  reversed_by     uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  foreign key (payment_id, organization_id) references public.payments (id, organization_id) on delete restrict,
  foreign key (cash_session_id, organization_id) references public.cash_sessions (id, organization_id) on delete restrict
);
create index payment_reversals_org_idx on public.payment_reversals (organization_id, created_at desc);
create trigger payment_reversals_immutable before update or delete on public.payment_reversals for each row execute function private.forbid_audit_mutation();

create table public.payment_reversal_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  payment_id      uuid not null,
  reason          text not null check (char_length(reason) between 5 and 300),
  requested_by    uuid not null references auth.users(id) on delete restrict,
  status          text not null default 'pendiente' check (status in ('pendiente', 'aprobada', 'rechazada')),
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz,
  resolution_note text check (resolution_note is null or char_length(resolution_note) <= 300),
  created_at      timestamptz not null default now(),
  foreign key (payment_id, organization_id) references public.payments (id, organization_id) on delete restrict
);
create unique index reversal_requests_one_pending on public.payment_reversal_requests (payment_id) where status = 'pendiente';
create index reversal_requests_org_idx on public.payment_reversal_requests (organization_id, status);

-- Saldo de cada venta derivado de los pagos válidos. security_invoker: aplica RLS.
create view public.sale_balances with (security_invoker = true) as
select s.id as sale_id,
       s.organization_id,
       s.total,
       coalesce(sum(p.amount) filter (where r.id is null), 0)::numeric(14,2) as paid,
       (s.total - coalesce(sum(p.amount) filter (where r.id is null), 0))::numeric(14,2) as balance
  from public.sales s
  left join public.payments p on p.sale_id = s.id
  left join public.payment_reversals r on r.payment_id = p.id
 group by s.id;

create or replace function private.sale_balance(p_sale uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select s.total - coalesce((
    select sum(p.amount) from public.payments p
     where p.sale_id = s.id
       and not exists (select 1 from public.payment_reversals r where r.payment_id = p.id)
  ), 0)
  from public.sales s where s.id = p_sale;
$$;
revoke all on function private.sale_balance(uuid) from public;

-- -----------------------------------------------------------------------------
-- RLS y privilegios
-- -----------------------------------------------------------------------------
alter table public.suppliers                  enable row level security;
alter table public.products                   enable row level security;
alter table public.inventory_stock            enable row level security;
alter table public.inventory_movements        enable row level security;
alter table public.payment_methods            enable row level security;
alter table public.quotes                     enable row level security;
alter table public.quote_items                enable row level security;
alter table public.sales                      enable row level security;
alter table public.sale_items                 enable row level security;
alter table public.cash_sessions              enable row level security;
alter table public.cash_movements             enable row level security;
alter table public.cash_session_counts        enable row level security;
alter table public.payments                   enable row level security;
alter table public.payment_reversals          enable row level security;
alter table public.payment_reversal_requests  enable row level security;

revoke all on table
  public.suppliers, public.products, public.inventory_stock, public.inventory_movements, public.payment_methods,
  public.quotes, public.quote_items, public.sales, public.sale_items, public.cash_sessions, public.cash_movements,
  public.cash_session_counts, public.payments, public.payment_reversals, public.payment_reversal_requests,
  public.sale_balances
from anon, authenticated;

grant select on
  public.suppliers, public.products, public.inventory_stock, public.inventory_movements, public.payment_methods,
  public.quotes, public.quote_items, public.sales, public.sale_items, public.cash_sessions, public.cash_movements,
  public.cash_session_counts, public.payments, public.payment_reversals, public.payment_reversal_requests,
  public.sale_balances
to authenticated;

grant insert (organization_id, name, nit, contact_name, phone, email) on public.suppliers to authenticated;
grant update (name, nit, contact_name, phone, email, is_active) on public.suppliers to authenticated;
grant insert (organization_id, sku, name, kind, brand, description, unit_price, cost, tracks_stock, stock_min, supplier_id)
  on public.products to authenticated;
grant update (name, brand, description, unit_price, cost, stock_min, supplier_id, is_active) on public.products to authenticated;
grant insert (organization_id, name, kind) on public.payment_methods to authenticated;
grant update (name, is_active) on public.payment_methods to authenticated;

create policy suppliers_select on public.suppliers for select to authenticated
  using ((select private.has_permission(organization_id, 'inventory.read')));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check ((select private.has_permission(organization_id, 'catalog.manage')));
create policy suppliers_update on public.suppliers for update to authenticated
  using ((select private.has_permission(organization_id, 'catalog.manage')))
  with check ((select private.has_permission(organization_id, 'catalog.manage')));

create policy products_select on public.products for select to authenticated
  using ((select private.has_permission(organization_id, 'inventory.read'))
      or (select private.has_permission(organization_id, 'sales.read')));
create policy products_insert on public.products for insert to authenticated
  with check ((select private.has_permission(organization_id, 'catalog.manage')));
create policy products_update on public.products for update to authenticated
  using ((select private.has_permission(organization_id, 'catalog.manage')))
  with check ((select private.has_permission(organization_id, 'catalog.manage')));

create policy inventory_stock_select on public.inventory_stock for select to authenticated
  using ((select private.has_permission(organization_id, 'inventory.read')));
create policy inventory_movements_select on public.inventory_movements for select to authenticated
  using ((select private.has_permission(organization_id, 'inventory.read')));

create policy payment_methods_select on public.payment_methods for select to authenticated
  using ((select private.is_member(organization_id)));
create policy payment_methods_insert on public.payment_methods for insert to authenticated
  with check ((select private.has_permission(organization_id, 'catalog.manage')));
create policy payment_methods_update on public.payment_methods for update to authenticated
  using ((select private.has_permission(organization_id, 'catalog.manage')))
  with check ((select private.has_permission(organization_id, 'catalog.manage')));

create policy quotes_select on public.quotes for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read')));
create policy quote_items_select on public.quote_items for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read')));
create policy sales_select on public.sales for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read')));
create policy sale_items_select on public.sale_items for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read')));
create policy payments_select on public.payments for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read'))
      or (select private.has_permission(organization_id, 'payments.register')));
create policy payment_reversals_select on public.payment_reversals for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read'))
      or (select private.has_permission(organization_id, 'payments.register')));
create policy reversal_requests_select on public.payment_reversal_requests for select to authenticated
  using ((select private.has_permission(organization_id, 'payments.reverse'))
      or (select private.has_permission(organization_id, 'payments.reverse_request')));

-- Caja: cada quien ve la suya; cash.read_all ve todas.
create policy cash_sessions_select on public.cash_sessions for select to authenticated
  using ((select private.has_permission(organization_id, 'cash.read_all'))
      or (opened_by = (select auth.uid()) and (select private.is_member(organization_id))));
create policy cash_movements_select on public.cash_movements for select to authenticated
  using (exists (select 1 from public.cash_sessions s where s.id = session_id));
create policy cash_session_counts_select on public.cash_session_counts for select to authenticated
  using (exists (select 1 from public.cash_sessions s where s.id = session_id));

-- -----------------------------------------------------------------------------
-- Funciones RPC
-- -----------------------------------------------------------------------------

-- Valida y normaliza ítems. Precio: el del catálogo; si es 0 (precio variable),
-- el indicado en el ítem, que debe ser mayor que 0.
create or replace function private.build_items(p_org uuid, p_items jsonb)
returns table (pos smallint, product_id uuid, description text, quantity integer,
               unit_price numeric, discount_amount numeric, line_total numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item  jsonb;
  v_prod  public.products%rowtype;
  v_pos   smallint := 0;
  v_qty   integer;
  v_price numeric;
  v_disc  numeric;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Agrega al menos un producto' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Máximo 50 ítems' using errcode = '22023';
  end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;
    select * into v_prod from public.products
     where id = (v_item ->> 'product_id')::uuid and organization_id = p_org and is_active;
    if v_prod.id is null then
      raise exception 'Producto no disponible en la línea %', v_pos using errcode = '22023';
    end if;
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 999 then
      raise exception 'Cantidad no válida en la línea %', v_pos using errcode = '22023';
    end if;
    if v_prod.unit_price > 0 then
      v_price := v_prod.unit_price;
    else
      v_price := round((v_item ->> 'unit_price')::numeric, 2);
      if v_price is null or v_price <= 0 then
        raise exception '% tiene precio variable: indica el precio en la línea %', v_prod.name, v_pos using errcode = '22023';
      end if;
    end if;
    v_disc := round(coalesce((v_item ->> 'discount_amount')::numeric, 0), 2);
    if v_disc < 0 or v_disc > v_qty * v_price then
      raise exception 'El descuento de la línea % no puede superar su valor', v_pos using errcode = '22023';
    end if;
    pos := v_pos;
    product_id := v_prod.id;
    description := v_prod.name;
    quantity := v_qty;
    unit_price := v_price;
    discount_amount := v_disc;
    line_total := v_qty * v_price - v_disc;
    return next;
  end loop;
end;
$$;
revoke all on function private.build_items(uuid, jsonb) from public;

create or replace function private.check_rx_for_sale(p_org uuid, p_patient uuid, p_prescription uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_prescription is null then
    return;
  end if;
  if not exists (
    select 1 from public.prescriptions
     where id = p_prescription and organization_id = p_org and status = 'validada'
       and patient_id is not distinct from p_patient
  ) then
    raise exception 'La fórmula debe estar vigente y ser del mismo paciente' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.check_rx_for_sale(uuid, uuid, uuid) from public;

create or replace function public.save_quote(p_quote uuid, p_version integer, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  q          public.quotes%rowtype;
  v_org      uuid;
  v_sub      numeric;
  v_disc     numeric;
  v_thr      numeric;
  v_status   text;
  v_patient  uuid := nullif(p_payload ->> 'patient_id', '')::uuid;
  v_rx       uuid := nullif(p_payload ->> 'prescription_id', '')::uuid;
  v_location uuid := (p_payload ->> 'location_id')::uuid;
begin
  if p_quote is null then
    select organization_id into v_org from public.locations where id = v_location and is_active;
    if v_org is null then
      raise exception 'Sede no válida' using errcode = '22023';
    end if;
  else
    select * into q from public.quotes where id = p_quote for update;
    if q.id is null then
      raise exception 'Cotización no encontrada' using errcode = 'P0002';
    end if;
    v_org := q.organization_id;
  end if;
  perform private.require_permission(v_org, 'sales.manage');
  if p_quote is not null then
    if q.status <> 'abierta' then
      raise exception 'La cotización está % y no se modifica', q.status using errcode = '42501';
    end if;
    if p_version is distinct from q.version then
      raise exception 'La cotización cambió desde que la abriste. Recarga la página.' using errcode = '40001';
    end if;
  end if;
  perform private.check_rx_for_sale(v_org, v_patient, v_rx);

  create temporary table if not exists pg_temp.tmp_items (
    pos smallint, product_id uuid, description text, quantity integer, unit_price numeric, discount_amount numeric, line_total numeric
  ) on commit drop;
  delete from pg_temp.tmp_items;
  insert into pg_temp.tmp_items select * from private.build_items(v_org, p_payload -> 'items');
  select sum(quantity * unit_price), sum(discount_amount) into v_sub, v_disc from pg_temp.tmp_items;

  select discount_threshold_pct into v_thr from public.org_settings where organization_id = v_org;
  v_status := case
    when v_disc = 0 then 'no_requiere'
    when v_sub > 0 and v_disc * 100 / v_sub <= v_thr then 'no_requiere'
    when private.has_permission(v_org, 'discount.approve') then 'aprobado'
    else 'pendiente'
  end;

  if p_quote is null then
    insert into public.quotes (organization_id, location_id, number, patient_id, prescription_id, valid_until, notes,
                               subtotal, discount_total, total, discount_status, discount_reviewed_by, discount_reviewed_at, created_by)
    values (v_org, v_location, private.next_number(v_org, 'cotizacion'), v_patient, v_rx,
            coalesce((p_payload ->> 'valid_until')::date, current_date + 15), nullif(trim(p_payload ->> 'notes'), ''),
            v_sub, v_disc, v_sub - v_disc, v_status,
            case when v_status = 'aprobado' then (select auth.uid()) end,
            case when v_status = 'aprobado' then now() end,
            (select auth.uid()))
    returning * into q;
  else
    delete from public.quote_items where quote_id = q.id;
    update public.quotes set
      location_id = v_location, patient_id = v_patient, prescription_id = v_rx,
      valid_until = coalesce((p_payload ->> 'valid_until')::date, valid_until),
      notes = nullif(trim(p_payload ->> 'notes'), ''),
      subtotal = v_sub, discount_total = v_disc, total = v_sub - v_disc,
      discount_status = v_status,
      discount_reviewed_by = case when v_status = 'aprobado' then (select auth.uid()) end,
      discount_reviewed_at = case when v_status = 'aprobado' then now() end,
      version = version + 1
    where id = q.id
    returning * into q;
  end if;

  insert into public.quote_items (organization_id, quote_id, position, product_id, description, quantity, unit_price, discount_amount, line_total)
  select v_org, q.id, t.pos, t.product_id, t.description, t.quantity, t.unit_price, t.discount_amount, t.line_total
    from pg_temp.tmp_items t;

  perform private.write_audit(v_org, case when p_quote is null then 'quote.create' else 'quote.update' end, 'quotes', q.id::text,
                              jsonb_build_object('discount_status', v_status));
  return q.id;
end;
$$;

create or replace function public.review_quote_discount(p_quote uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes where id = p_quote for update;
  if q.id is null then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(q.organization_id, 'discount.approve');
  if q.status <> 'abierta' or q.discount_status <> 'pendiente' then
    raise exception 'La cotización no tiene un descuento pendiente de aprobación' using errcode = '22023';
  end if;
  update public.quotes
     set discount_status = case when p_approve then 'aprobado' else 'rechazado' end,
         discount_reviewed_by = (select auth.uid()), discount_reviewed_at = now()
   where id = p_quote;
  perform private.write_audit(q.organization_id, case when p_approve then 'discount.approve' else 'discount.reject' end,
                              'quotes', p_quote::text);
end;
$$;

create or replace function public.annul_quote(p_quote uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q public.quotes%rowtype;
begin
  select * into q from public.quotes where id = p_quote for update;
  if q.id is null then
    raise exception 'Cotización no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(q.organization_id, 'sales.manage');
  if q.status <> 'abierta' then
    raise exception 'La cotización ya está %', q.status using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica el motivo (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  update public.quotes set status = 'anulada', annul_reason = left(trim(p_reason), 300) where id = p_quote;
end;
$$;

create or replace function public.create_sale(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  q          public.quotes%rowtype;
  v_org      uuid;
  v_location uuid;
  v_patient  uuid;
  v_rx       uuid;
  v_sub      numeric;
  v_disc     numeric;
  v_thr      numeric;
  v_approver uuid;
  v_sale     uuid;
  v_quote    uuid := nullif(p_payload ->> 'quote_id', '')::uuid;
begin
  create temporary table if not exists pg_temp.tmp_items (
    pos smallint, product_id uuid, description text, quantity integer, unit_price numeric, discount_amount numeric, line_total numeric
  ) on commit drop;
  delete from pg_temp.tmp_items;

  if v_quote is not null then
    select * into q from public.quotes where id = v_quote for update;
    if q.id is null then
      raise exception 'Cotización no encontrada' using errcode = 'P0002';
    end if;
    v_org := q.organization_id;
    perform private.require_permission(v_org, 'sales.manage');
    if q.status <> 'abierta' then
      raise exception 'La cotización ya está %', q.status using errcode = '22023';
    end if;
    if q.valid_until < current_date then
      raise exception 'La cotización venció el %; actualízala antes de vender', q.valid_until using errcode = '22023';
    end if;
    if q.discount_status in ('pendiente', 'rechazado') then
      raise exception 'El descuento de la cotización no está aprobado' using errcode = '42501';
    end if;
    v_location := q.location_id;
    v_patient := q.patient_id;
    v_rx := q.prescription_id;
    v_approver := q.discount_reviewed_by;
    insert into pg_temp.tmp_items
    select position, product_id, description, quantity, unit_price, discount_amount, line_total
      from public.quote_items where quote_id = q.id;
    -- Los productos deben seguir activos.
    if exists (select 1 from pg_temp.tmp_items t join public.products p on p.id = t.product_id where not p.is_active) then
      raise exception 'La cotización incluye productos desactivados' using errcode = '22023';
    end if;
  else
    v_location := (p_payload ->> 'location_id')::uuid;
    select organization_id into v_org from public.locations where id = v_location and is_active;
    if v_org is null then
      raise exception 'Sede no válida' using errcode = '22023';
    end if;
    perform private.require_permission(v_org, 'sales.manage');
    v_patient := nullif(p_payload ->> 'patient_id', '')::uuid;
    v_rx := nullif(p_payload ->> 'prescription_id', '')::uuid;
    insert into pg_temp.tmp_items select * from private.build_items(v_org, p_payload -> 'items');
  end if;

  perform private.check_rx_for_sale(v_org, v_patient, v_rx);
  if v_patient is not null and not exists (select 1 from public.patients where id = v_patient and organization_id = v_org) then
    raise exception 'Paciente no válido' using errcode = '22023';
  end if;

  select sum(quantity * unit_price), sum(discount_amount) into v_sub, v_disc from pg_temp.tmp_items;
  select discount_threshold_pct into v_thr from public.org_settings where organization_id = v_org;
  if v_quote is null and v_disc > 0 and v_sub > 0 and v_disc * 100 / v_sub > v_thr then
    if not private.has_permission(v_org, 'discount.approve') then
      raise exception 'El descuento supera el % %% autorizado. Crea una cotización para que la aprueben.', v_thr using errcode = '42501';
    end if;
    v_approver := (select auth.uid());
  end if;

  insert into public.sales (organization_id, location_id, number, patient_id, prescription_id, quote_id,
                            subtotal, discount_total, total, discount_approved_by, seller_id, notes)
  values (v_org, v_location, private.next_number(v_org, 'venta'), v_patient, v_rx, v_quote,
          v_sub, v_disc, v_sub - v_disc, case when v_disc > 0 then v_approver end, (select auth.uid()),
          nullif(trim(p_payload ->> 'notes'), ''))
  returning id into v_sale;

  insert into public.sale_items (organization_id, sale_id, position, product_id, description, quantity, unit_price, discount_amount, line_total)
  select v_org, v_sale, t.pos, t.product_id, t.description, t.quantity, t.unit_price, t.discount_amount, t.line_total
    from pg_temp.tmp_items t;

  -- Descuento de inventario: una sola vez por ítem (índice único sale_item_id + tipo).
  insert into public.inventory_movements (organization_id, location_id, product_id, movement_type, quantity, sale_item_id, created_by)
  select v_org, v_location, si.product_id, 'salida_venta', si.quantity, si.id, (select auth.uid())
    from public.sale_items si
    join public.products p on p.id = si.product_id
   where si.sale_id = v_sale and p.tracks_stock;

  if v_quote is not null then
    update public.quotes set status = 'convertida' where id = v_quote;
  end if;

  perform private.write_audit(v_org, 'sale.create', 'sales', v_sale::text,
                              jsonb_build_object('total', v_sub - v_disc, 'quote', v_quote));
  return v_sale;
end;
$$;

create or replace function private.open_session_of_caller(p_org uuid, p_location uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.cash_sessions
   where organization_id = p_org and location_id = p_location
     and opened_by = (select auth.uid()) and status = 'abierta';
$$;
revoke all on function private.open_session_of_caller(uuid, uuid) from public;

create or replace function public.register_payment(p_sale uuid, p_method uuid, p_amount numeric, p_reference text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s         public.sales%rowtype;
  v_session uuid;
  v_balance numeric;
  v_amount  numeric := round(p_amount, 2);
  v_id      uuid;
begin
  select * into s from public.sales where id = p_sale for update;
  if s.id is null then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(s.organization_id, 'payments.register');
  if s.status <> 'confirmada' then
    raise exception 'La venta está anulada' using errcode = '22023';
  end if;
  v_session := private.open_session_of_caller(s.organization_id, s.location_id);
  if v_session is null then
    raise exception 'Abre tu caja en la sede de la venta antes de registrar pagos' using errcode = '22023';
  end if;
  if not exists (select 1 from public.payment_methods where id = p_method and organization_id = s.organization_id and is_active) then
    raise exception 'Medio de pago no válido' using errcode = '22023';
  end if;
  v_balance := private.sale_balance(s.id);
  if v_amount is null or v_amount <= 0 then
    raise exception 'El valor debe ser mayor que cero' using errcode = '22023';
  end if;
  if v_amount > v_balance then
    raise exception 'El abono (%) supera el saldo pendiente (%)', v_amount, v_balance using errcode = '22023';
  end if;

  insert into public.payments (organization_id, sale_id, cash_session_id, payment_method_id, amount, reference, receipt_number, received_by)
  values (s.organization_id, s.id, v_session, p_method, v_amount, nullif(trim(p_reference), ''),
          private.next_number(s.organization_id, 'recibo'), (select auth.uid()))
  returning id into v_id;

  perform private.write_audit(s.organization_id, 'payment.register', 'payments', v_id::text,
                              jsonb_build_object('sale', s.id, 'amount', v_amount));
  return v_id;
end;
$$;

create or replace function public.request_payment_reversal(p_payment uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p    public.payments%rowtype;
  v_id uuid;
begin
  select * into p from public.payments where id = p_payment;
  if p.id is null then
    raise exception 'Pago no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(p.organization_id, 'payments.reverse_request');
  if exists (select 1 from public.payment_reversals where payment_id = p.id) then
    raise exception 'El pago ya fue revertido' using errcode = '22023';
  end if;
  insert into public.payment_reversal_requests (organization_id, payment_id, reason, requested_by)
  values (p.organization_id, p.id, trim(p_reason), (select auth.uid()))
  returning id into v_id;
  perform private.write_audit(p.organization_id, 'payment.reversal_request', 'payments', p.id::text);
  return v_id;
end;
$$;

create or replace function public.reverse_payment(p_payment uuid, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p         public.payments%rowtype;
  v_kind    public.payment_kind;
  v_session uuid;
  v_loc     uuid;
  v_id      uuid;
begin
  select * into p from public.payments where id = p_payment for update;
  if p.id is null then
    raise exception 'Pago no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(p.organization_id, 'payments.reverse');
  if exists (select 1 from public.payment_reversals where payment_id = p.id) then
    raise exception 'El pago ya fue revertido' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica el motivo de la reversión (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  select kind into v_kind from public.payment_methods where id = p.payment_method_id;
  select location_id into v_loc from public.sales where id = p.sale_id;
  v_session := private.open_session_of_caller(p.organization_id, v_loc);
  -- Devolver efectivo exige una caja abierta de quien lo entrega.
  if v_kind = 'efectivo' and v_session is null then
    raise exception 'Para revertir un pago en efectivo abre tu caja en la sede de la venta' using errcode = '22023';
  end if;

  insert into public.payment_reversals (organization_id, payment_id, reason, cash_session_id, reversed_by)
  values (p.organization_id, p.id, left(trim(p_reason), 300), v_session, (select auth.uid()))
  returning id into v_id;

  update public.payment_reversal_requests
     set status = 'aprobada', resolved_by = (select auth.uid()), resolved_at = now()
   where payment_id = p.id and status = 'pendiente';

  perform private.write_audit(p.organization_id, 'payment.reverse', 'payments', p.id::text,
                              jsonb_build_object('amount', p.amount));
  return v_id;
end;
$$;

create or replace function public.reject_reversal_request(p_request uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.payment_reversal_requests%rowtype;
begin
  select * into r from public.payment_reversal_requests where id = p_request for update;
  if r.id is null then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(r.organization_id, 'payments.reverse');
  if r.status <> 'pendiente' then
    raise exception 'La solicitud ya fue resuelta' using errcode = '22023';
  end if;
  update public.payment_reversal_requests
     set status = 'rechazada', resolved_by = (select auth.uid()), resolved_at = now(),
         resolution_note = left(nullif(trim(p_note), ''), 300)
   where id = p_request;
end;
$$;

create or replace function public.open_cash_session(p_location uuid, p_opening numeric)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id  uuid;
begin
  select organization_id into v_org from public.locations where id = p_location and is_active;
  if v_org is null then
    raise exception 'Sede no válida' using errcode = '22023';
  end if;
  perform private.require_permission(v_org, 'cash.operate');
  if exists (select 1 from public.cash_sessions where opened_by = (select auth.uid()) and status = 'abierta') then
    raise exception 'Ya tienes una caja abierta; ciérrala antes de abrir otra' using errcode = '23505';
  end if;
  if p_opening is null or p_opening < 0 then
    raise exception 'La base de caja no puede ser negativa' using errcode = '22023';
  end if;
  insert into public.cash_sessions (organization_id, location_id, opened_by, opening_amount)
  values (v_org, p_location, (select auth.uid()), round(p_opening, 2))
  returning id into v_id;
  perform private.write_audit(v_org, 'cash.open', 'cash_sessions', v_id::text, jsonb_build_object('opening', p_opening));
  return v_id;
end;
$$;

create or replace function public.add_cash_movement(p_session uuid, p_kind text, p_amount numeric, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c    public.cash_sessions%rowtype;
  v_id uuid;
begin
  select * into c from public.cash_sessions where id = p_session for update;
  if c.id is null then
    raise exception 'Caja no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(c.organization_id, 'cash.operate');
  if c.opened_by <> (select auth.uid()) or c.status <> 'abierta' then
    raise exception 'Solo se registran movimientos en tu caja abierta' using errcode = '42501';
  end if;
  insert into public.cash_movements (organization_id, session_id, kind, amount, reason, created_by)
  values (c.organization_id, c.id, p_kind, round(p_amount, 2), trim(p_reason), (select auth.uid()))
  returning id into v_id;
  perform private.write_audit(c.organization_id, 'cash.movement', 'cash_sessions', c.id::text,
                              jsonb_build_object('kind', p_kind, 'amount', p_amount));
  return v_id;
end;
$$;

-- Valores esperados por medio de pago en una caja.
create or replace function public.cash_session_expected(p_session uuid)
returns table (payment_method_id uuid, method_name text, method_kind public.payment_kind, expected numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.cash_sessions%rowtype;
  v_first_cash uuid;
begin
  select * into c from public.cash_sessions where id = p_session;
  if c.id is null then
    raise exception 'Caja no encontrada' using errcode = 'P0002';
  end if;
  if not (c.opened_by = (select auth.uid()) and private.is_member(c.organization_id))
     and not private.has_permission(c.organization_id, 'cash.read_all') then
    raise exception 'Permiso denegado: cash.read_all' using errcode = '42501';
  end if;
  select id into v_first_cash from public.payment_methods
   where organization_id = c.organization_id and kind = 'efectivo' order by created_at, name limit 1;

  return query
  select m.id, m.name, m.kind,
         (coalesce((select sum(p.amount) from public.payments p where p.cash_session_id = c.id and p.payment_method_id = m.id), 0)
        - coalesce((select sum(p.amount) from public.payment_reversals r join public.payments p on p.id = r.payment_id
                     where r.cash_session_id = c.id and p.payment_method_id = m.id), 0)
        + case when m.id = v_first_cash then
              c.opening_amount
            + coalesce((select sum(amount) from public.cash_movements where session_id = c.id and kind = 'ingreso'), 0)
            - coalesce((select sum(amount) from public.cash_movements where session_id = c.id and kind = 'egreso'), 0)
          else 0 end)::numeric(14,2)
    from public.payment_methods m
   where m.organization_id = c.organization_id
     and (m.is_active or exists (select 1 from public.payments p where p.cash_session_id = c.id and p.payment_method_id = m.id))
   order by m.kind, m.name;
end;
$$;

create or replace function public.close_cash_session(p_session uuid, p_counts jsonb, p_notes text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cash_sessions%rowtype;
  e record;
  v_counted numeric;
begin
  select * into c from public.cash_sessions where id = p_session for update;
  if c.id is null then
    raise exception 'Caja no encontrada' using errcode = 'P0002';
  end if;
  if c.status <> 'abierta' then
    raise exception 'La caja ya está cerrada' using errcode = '22023';
  end if;
  if not (c.opened_by = (select auth.uid()) and private.has_permission(c.organization_id, 'cash.operate'))
     and not private.has_permission(c.organization_id, 'cash.read_all') then
    raise exception 'Solo quien abrió la caja o un administrador puede cerrarla' using errcode = '42501';
  end if;

  for e in select * from public.cash_session_expected(c.id) loop
    v_counted := (select (x ->> 'counted')::numeric from jsonb_array_elements(coalesce(p_counts, '[]')) x
                   where (x ->> 'payment_method_id')::uuid = e.payment_method_id);
    if v_counted is null then
      raise exception 'Falta el conteo de %', e.method_name using errcode = '22023';
    end if;
    insert into public.cash_session_counts (session_id, organization_id, payment_method_id, expected, counted, difference)
    values (c.id, c.organization_id, e.payment_method_id, e.expected, round(v_counted, 2), round(v_counted, 2) - e.expected);
  end loop;

  update public.cash_sessions
     set status = 'cerrada', closed_at = now(), closed_by = (select auth.uid()), close_notes = nullif(trim(p_notes), '')
   where id = c.id;
  perform private.write_audit(c.organization_id, 'cash.close', 'cash_sessions', c.id::text);
end;
$$;

create or replace function public.register_inventory_movement(
  p_product uuid, p_location uuid, p_type public.movement_type, p_quantity integer, p_unit_cost numeric, p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id  uuid;
begin
  select organization_id into v_org from public.products where id = p_product;
  if v_org is null then
    raise exception 'Producto no encontrado' using errcode = 'P0002';
  end if;
  if p_type = 'entrada' then
    perform private.require_permission(v_org, 'inventory.receive');
  elsif p_type in ('ajuste_positivo', 'ajuste_negativo') then
    perform private.require_permission(v_org, 'inventory.adjust');
    if coalesce(char_length(trim(p_reason)), 0) < 5 then
      raise exception 'Todo ajuste necesita un motivo (mínimo 5 caracteres)' using errcode = '22023';
    end if;
  else
    raise exception 'Las salidas y devoluciones por venta las registra el sistema' using errcode = '42501';
  end if;
  if not exists (select 1 from public.locations where id = p_location and organization_id = v_org and is_active) then
    raise exception 'Sede no válida' using errcode = '22023';
  end if;
  insert into public.inventory_movements (organization_id, location_id, product_id, movement_type, quantity, unit_cost, reason, created_by)
  values (v_org, p_location, p_product, p_type, p_quantity, p_unit_cost, nullif(trim(p_reason), ''), (select auth.uid()))
  returning id into v_id;
  perform private.write_audit(v_org, 'inventory.' || p_type, 'products', p_product::text, jsonb_build_object('quantity', p_quantity));
  return v_id;
end;
$$;

revoke all on function public.save_quote(uuid, integer, jsonb)               from public, anon, authenticated;
revoke all on function public.review_quote_discount(uuid, boolean)          from public, anon, authenticated;
revoke all on function public.annul_quote(uuid, text)                       from public, anon, authenticated;
revoke all on function public.create_sale(jsonb)                            from public, anon, authenticated;
revoke all on function public.register_payment(uuid, uuid, numeric, text)   from public, anon, authenticated;
revoke all on function public.request_payment_reversal(uuid, text)          from public, anon, authenticated;
revoke all on function public.reverse_payment(uuid, text)                   from public, anon, authenticated;
revoke all on function public.reject_reversal_request(uuid, text)           from public, anon, authenticated;
revoke all on function public.open_cash_session(uuid, numeric)              from public, anon, authenticated;
revoke all on function public.add_cash_movement(uuid, text, numeric, text)  from public, anon, authenticated;
revoke all on function public.cash_session_expected(uuid)                   from public, anon, authenticated;
revoke all on function public.close_cash_session(uuid, jsonb, text)         from public, anon, authenticated;
revoke all on function public.register_inventory_movement(uuid, uuid, public.movement_type, integer, numeric, text) from public, anon, authenticated;

grant execute on function public.save_quote(uuid, integer, jsonb)               to authenticated;
grant execute on function public.review_quote_discount(uuid, boolean)          to authenticated;
grant execute on function public.annul_quote(uuid, text)                       to authenticated;
grant execute on function public.create_sale(jsonb)                            to authenticated;
grant execute on function public.register_payment(uuid, uuid, numeric, text)   to authenticated;
grant execute on function public.request_payment_reversal(uuid, text)          to authenticated;
grant execute on function public.reverse_payment(uuid, text)                   to authenticated;
grant execute on function public.reject_reversal_request(uuid, text)           to authenticated;
grant execute on function public.open_cash_session(uuid, numeric)              to authenticated;
grant execute on function public.add_cash_movement(uuid, text, numeric, text)  to authenticated;
grant execute on function public.cash_session_expected(uuid)                   to authenticated;
grant execute on function public.close_cash_session(uuid, jsonb, text)         to authenticated;
grant execute on function public.register_inventory_movement(uuid, uuid, public.movement_type, integer, numeric, text) to authenticated;

revoke all on all functions in schema private from anon;

-- ====================== 20261010000011_lab_delivery.sql ======================
-- =============================================================================
-- OptiConsulta · Migración 0011 · Laboratorio, control de calidad, entregas,
-- garantías y anulación de ventas
-- -----------------------------------------------------------------------------
-- * Los estados de laboratorio son configurables por óptica; los estados con
--   significado para el sistema (inicial, recibido, calidad, entregado,
--   cancelado) existen siempre y solo cambian por sus acciones propias.
-- * La orden congela la fórmula al crearse: una corrección posterior de la
--   fórmula no altera lo que se pidió al laboratorio.
-- * Cada cambio de estado es un evento inmutable con autor y hora (criterio 9);
--   entregar no borra eventos previos (criterio 10).
-- =============================================================================

create type public.lab_status_kind as enum
  ('inicial', 'proceso', 'recibido', 'calidad_aprobada', 'calidad_rechazada', 'entregado', 'cancelado');

create table public.laboratories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  name            text not null check (char_length(name) between 2 and 160),
  nit             text check (nit is null or nit ~ '^[0-9]{5,12}(-[0-9])?$'),
  contact_name    text check (contact_name is null or char_length(contact_name) <= 120),
  phone           text check (phone is null or phone ~ '^[0-9+() -]{7,20}$'),
  email           extensions.citext check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, name)
);
create index laboratories_org_idx on public.laboratories (organization_id);
create trigger laboratories_updated_at before update on public.laboratories for each row execute function private.set_updated_at();
create trigger laboratories_audit after insert or update on public.laboratories for each row execute function private.audit_row_change();

create table public.lab_order_statuses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 60),
  kind            public.lab_status_kind not null,
  position        smallint not null default 100,
  is_active       boolean not null default true,
  unique (id, organization_id),
  unique (organization_id, name)
);
create index lab_order_statuses_org_idx on public.lab_order_statuses (organization_id, position);
-- Un solo estado activo por tipo de sistema; «proceso» admite varios.
create unique index lab_order_statuses_one_system_kind
  on public.lab_order_statuses (organization_id, kind) where kind <> 'proceso' and is_active;

create or replace function private.guard_lab_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los estados no se eliminan; se desactivan' using errcode = '42501';
  end if;
  -- Las reglas aplican a los usuarios de la API; las funciones internas
  -- (SECURITY DEFINER, otro rol) siembran los estados del sistema.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.kind <> 'proceso' then
    raise exception 'Solo se pueden crear estados intermedios de proceso' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.kind <> 'proceso' and new.is_active is distinct from old.is_active then
    raise exception 'Los estados del sistema no se desactivan; puedes cambiarles el nombre' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_lab_status() from public;
create trigger lab_order_statuses_guard before insert or update or delete on public.lab_order_statuses
  for each row execute function private.guard_lab_status();

create or replace function private.seed_lab_statuses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lab_order_statuses (organization_id, name, kind, position) values
    (new.id, 'Pendiente de envío', 'inicial', 10),
    (new.id, 'Enviada al laboratorio', 'proceso', 20),
    (new.id, 'En fabricación', 'proceso', 30),
    (new.id, 'Recibida en óptica', 'recibido', 40),
    (new.id, 'Control de calidad aprobado', 'calidad_aprobada', 50),
    (new.id, 'Rechazada en control de calidad', 'calidad_rechazada', 60),
    (new.id, 'Entregada', 'entregado', 70),
    (new.id, 'Cancelada', 'cancelado', 80)
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function private.seed_lab_statuses() from public;
create trigger organizations_seed_lab_statuses after insert on public.organizations
  for each row execute function private.seed_lab_statuses();

-- Siembra para organizaciones existentes (sin pasar por la guardia).
insert into public.lab_order_statuses (organization_id, name, kind, position)
select o.id, s.name, s.kind::public.lab_status_kind, s.position
  from public.organizations o
  cross join (values
    ('Pendiente de envío', 'inicial', 10), ('Enviada al laboratorio', 'proceso', 20), ('En fabricación', 'proceso', 30),
    ('Recibida en óptica', 'recibido', 40), ('Control de calidad aprobado', 'calidad_aprobada', 50),
    ('Rechazada en control de calidad', 'calidad_rechazada', 60), ('Entregada', 'entregado', 70), ('Cancelada', 'cancelado', 80)
  ) s(name, kind, position)
on conflict do nothing;

create table public.lab_orders (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete restrict,
  number            bigint not null,
  location_id       uuid not null,
  sale_id           uuid not null,
  patient_id        uuid not null,
  prescription_id   uuid not null,
  laboratory_id     uuid not null,
  status_id         uuid not null,
  rx_snapshot       jsonb not null,
  frame_description text check (frame_description is null or char_length(frame_description) <= 300),
  lens_description  text not null check (char_length(lens_description) between 3 and 300),
  instructions      text check (instructions is null or char_length(instructions) <= 1000),
  promised_date     date not null,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, organization_id),
  unique (organization_id, number),
  foreign key (location_id, organization_id) references public.locations (id, organization_id) on delete restrict,
  foreign key (sale_id, organization_id) references public.sales (id, organization_id) on delete restrict,
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict,
  foreign key (prescription_id, organization_id) references public.prescriptions (id, organization_id) on delete restrict,
  foreign key (laboratory_id, organization_id) references public.laboratories (id, organization_id) on delete restrict,
  foreign key (status_id, organization_id) references public.lab_order_statuses (id, organization_id) on delete restrict
);
create index lab_orders_org_status_idx on public.lab_orders (organization_id, status_id);
create index lab_orders_promised_idx on public.lab_orders (organization_id, promised_date);
create index lab_orders_sale_idx on public.lab_orders (sale_id);
create trigger lab_orders_updated_at before update on public.lab_orders for each row execute function private.set_updated_at();

-- Solo el estado (por RPC) cambia; lo pedido al laboratorio queda fijo.
create or replace function private.guard_lab_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Las órdenes no se eliminan; se cancelan' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['status_id', 'updated_at']) is distinct from (to_jsonb(old) - array['status_id', 'updated_at']) then
    raise exception 'Lo pedido al laboratorio no se modifica; cancela la orden y crea otra' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_lab_order() from public;
create trigger lab_orders_guard before update or delete on public.lab_orders for each row execute function private.guard_lab_order();

create table public.lab_order_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id        uuid not null,
  status_id       uuid not null,
  note            text check (note is null or char_length(note) <= 500),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default clock_timestamp(),
  foreign key (order_id, organization_id) references public.lab_orders (id, organization_id) on delete restrict,
  foreign key (status_id, organization_id) references public.lab_order_statuses (id, organization_id) on delete restrict
);
create index lab_order_events_org_idx on public.lab_order_events (organization_id, order_id, created_at);
create trigger lab_order_events_immutable before update or delete on public.lab_order_events for each row execute function private.forbid_audit_mutation();

create table public.quality_checks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  order_id        uuid not null,
  result          text not null check (result in ('aprobado', 'rechazado')),
  checklist       jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  notes           text check (notes is null or char_length(notes) <= 1000),
  checked_by      uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now(),
  foreign key (order_id, organization_id) references public.lab_orders (id, organization_id) on delete restrict
);
create index quality_checks_org_idx on public.quality_checks (organization_id, order_id);
create trigger quality_checks_immutable before update or delete on public.quality_checks for each row execute function private.forbid_audit_mutation();

create table public.deliveries (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null,
  sale_id             uuid not null,
  lab_order_id        uuid unique,
  received_by_name    text not null check (char_length(received_by_name) between 3 and 120),
  received_by_doc     text check (received_by_doc is null or received_by_doc ~ '^[A-Za-z0-9]{3,20}$'),
  balance_at_delivery numeric(14,2) not null check (balance_at_delivery >= 0),
  balance_authorized_by uuid references auth.users(id) on delete set null,
  notes               text check (notes is null or char_length(notes) <= 500),
  delivered_by        uuid not null references auth.users(id) on delete restrict,
  created_at          timestamptz not null default now(),
  foreign key (sale_id, organization_id) references public.sales (id, organization_id) on delete restrict,
  foreign key (lab_order_id, organization_id) references public.lab_orders (id, organization_id) on delete restrict
);
create index deliveries_org_idx on public.deliveries (organization_id, created_at desc);
create index deliveries_sale_idx on public.deliveries (sale_id);
create trigger deliveries_immutable before update or delete on public.deliveries for each row execute function private.forbid_audit_mutation();

create table public.warranties (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  sale_id         uuid not null,
  lab_order_id    uuid,
  kind            text not null check (kind in ('garantia', 'incidencia')),
  description     text not null check (char_length(description) between 5 and 1000),
  status          text not null default 'abierta' check (status in ('abierta', 'en_proceso', 'resuelta', 'rechazada')),
  resolution      text check (resolution is null or char_length(resolution) <= 1000),
  opened_by       uuid references auth.users(id) on delete set null,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, organization_id),
  check (status not in ('resuelta', 'rechazada') or (resolution is not null and closed_at is not null)),
  foreign key (sale_id, organization_id) references public.sales (id, organization_id) on delete restrict,
  foreign key (lab_order_id, organization_id) references public.lab_orders (id, organization_id) on delete restrict
);
create index warranties_org_idx on public.warranties (organization_id, status, created_at desc);
create trigger warranties_updated_at before update on public.warranties for each row execute function private.set_updated_at();

create table public.warranty_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  warranty_id     uuid not null,
  status          text not null,
  note            text check (note is null or char_length(note) <= 1000),
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default clock_timestamp(),
  foreign key (warranty_id, organization_id) references public.warranties (id, organization_id) on delete restrict
);
create index warranty_events_org_idx on public.warranty_events (organization_id, warranty_id, created_at);
create trigger warranty_events_immutable before update or delete on public.warranty_events for each row execute function private.forbid_audit_mutation();

-- -----------------------------------------------------------------------------
-- RLS y privilegios
-- -----------------------------------------------------------------------------
alter table public.laboratories       enable row level security;
alter table public.lab_order_statuses enable row level security;
alter table public.lab_orders         enable row level security;
alter table public.lab_order_events   enable row level security;
alter table public.quality_checks     enable row level security;
alter table public.deliveries         enable row level security;
alter table public.warranties         enable row level security;
alter table public.warranty_events    enable row level security;

revoke all on table public.laboratories, public.lab_order_statuses, public.lab_orders, public.lab_order_events,
  public.quality_checks, public.deliveries, public.warranties, public.warranty_events from anon, authenticated;
grant select on public.laboratories, public.lab_order_statuses, public.lab_orders, public.lab_order_events,
  public.quality_checks, public.deliveries, public.warranties, public.warranty_events to authenticated;

grant insert (organization_id, name, nit, contact_name, phone, email) on public.laboratories to authenticated;
grant update (name, nit, contact_name, phone, email, is_active) on public.laboratories to authenticated;
grant insert (organization_id, name, kind, position) on public.lab_order_statuses to authenticated;
grant update (name, position, is_active) on public.lab_order_statuses to authenticated;

create policy laboratories_select on public.laboratories for select to authenticated
  using ((select private.has_permission(organization_id, 'lab.read')));
create policy laboratories_insert on public.laboratories for insert to authenticated
  with check ((select private.has_permission(organization_id, 'lab.manage')));
create policy laboratories_update on public.laboratories for update to authenticated
  using ((select private.has_permission(organization_id, 'lab.manage')))
  with check ((select private.has_permission(organization_id, 'lab.manage')));

create policy lab_order_statuses_select on public.lab_order_statuses for select to authenticated
  using ((select private.is_member(organization_id)));
create policy lab_order_statuses_insert on public.lab_order_statuses for insert to authenticated
  with check ((select private.has_permission(organization_id, 'settings.manage')));
create policy lab_order_statuses_update on public.lab_order_statuses for update to authenticated
  using ((select private.has_permission(organization_id, 'settings.manage')))
  with check ((select private.has_permission(organization_id, 'settings.manage')));

create policy lab_orders_select on public.lab_orders for select to authenticated
  using ((select private.has_permission(organization_id, 'lab.read')));
create policy lab_order_events_select on public.lab_order_events for select to authenticated
  using ((select private.has_permission(organization_id, 'lab.read')));
create policy quality_checks_select on public.quality_checks for select to authenticated
  using ((select private.has_permission(organization_id, 'lab.read'))
      or (select private.has_permission(organization_id, 'delivery.manage')));
create policy deliveries_select on public.deliveries for select to authenticated
  using ((select private.has_permission(organization_id, 'sales.read'))
      or (select private.has_permission(organization_id, 'delivery.handover')));
create policy warranties_select on public.warranties for select to authenticated
  using ((select private.has_permission(organization_id, 'warranty.read')));
create policy warranty_events_select on public.warranty_events for select to authenticated
  using ((select private.has_permission(organization_id, 'warranty.read')));

-- -----------------------------------------------------------------------------
-- Funciones RPC
-- -----------------------------------------------------------------------------
create or replace function private.status_of_kind(p_org uuid, p_kind public.lab_status_kind)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.lab_order_statuses
   where organization_id = p_org and kind = p_kind and is_active
   order by position limit 1;
$$;
revoke all on function private.status_of_kind(uuid, public.lab_status_kind) from public;

create or replace function private.set_lab_status(p_order uuid, p_status uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  update public.lab_orders set status_id = p_status where id = p_order returning organization_id into v_org;
  insert into public.lab_order_events (organization_id, order_id, status_id, note, created_by)
  values (v_org, p_order, p_status, nullif(trim(p_note), ''), (select auth.uid()));
end;
$$;
revoke all on function private.set_lab_status(uuid, uuid, text) from public;

create or replace function private.lock_order(p_order uuid)
returns table (organization_id uuid, sale_id uuid, kind public.lab_status_kind)
language sql
security definer
set search_path = ''
as $$
  select o.organization_id, o.sale_id, s.kind
    from public.lab_orders o join public.lab_order_statuses s on s.id = o.status_id
   where o.id = p_order
   for update of o;
$$;
revoke all on function private.lock_order(uuid) from public;

create or replace function public.create_lab_order(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s        public.sales%rowtype;
  p        public.prescriptions%rowtype;
  v_id     uuid;
  v_status uuid;
  v_lab    uuid := (p_payload ->> 'laboratory_id')::uuid;
  v_date   date := (p_payload ->> 'promised_date')::date;
begin
  select * into s from public.sales where id = (p_payload ->> 'sale_id')::uuid;
  if s.id is null then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(s.organization_id, 'lab.manage');
  if s.status <> 'confirmada' then
    raise exception 'La venta está anulada' using errcode = '22023';
  end if;
  if s.patient_id is null then
    raise exception 'La venta no tiene paciente asociado' using errcode = '22023';
  end if;
  select * into p from public.prescriptions
   where id = coalesce(nullif(p_payload ->> 'prescription_id', '')::uuid, s.prescription_id) and organization_id = s.organization_id;
  if p.id is null or p.status <> 'validada' or p.patient_id <> s.patient_id then
    raise exception 'Se requiere una fórmula vigente del paciente de la venta' using errcode = '22023';
  end if;
  if not exists (select 1 from public.laboratories where id = v_lab and organization_id = s.organization_id and is_active) then
    raise exception 'Laboratorio no válido' using errcode = '22023';
  end if;
  if v_date is null or v_date < current_date then
    raise exception 'La fecha prometida no puede ser anterior a hoy' using errcode = '22023';
  end if;
  v_status := private.status_of_kind(s.organization_id, 'inicial');

  insert into public.lab_orders (organization_id, number, location_id, sale_id, patient_id, prescription_id, laboratory_id,
                                 status_id, rx_snapshot, frame_description, lens_description, instructions, promised_date, created_by)
  values (
    s.organization_id, private.next_number(s.organization_id, 'orden_lab'), s.location_id, s.id, s.patient_id, p.id, v_lab,
    v_status,
    -- Fórmula congelada: valores, parámetros y sello de la versión enviada.
    jsonb_build_object(
      'prescription_id', p.id, 'version', p.version, 'content_hash', p.content_hash,
      'lens_type', p.lens_type, 'pd_far', p.pd_far, 'pd_near', p.pd_near,
      'cylinder_convention', p.cylinder_convention, 'origin', p.origin,
      'eyes', coalesce((select jsonb_agg(to_jsonb(e) - array['prescription_id', 'organization_id'] order by e.eye)
                          from public.prescription_eyes e where e.prescription_id = p.id), '[]')
    ),
    nullif(trim(p_payload ->> 'frame_description'), ''),
    trim(p_payload ->> 'lens_description'),
    nullif(trim(p_payload ->> 'instructions'), ''),
    v_date, (select auth.uid()))
  returning id into v_id;

  insert into public.lab_order_events (organization_id, order_id, status_id, note, created_by)
  values (s.organization_id, v_id, v_status, 'Orden creada', (select auth.uid()));
  perform private.write_audit(s.organization_id, 'lab_order.create', 'lab_orders', v_id::text);
  return v_id;
end;
$$;

create or replace function public.change_lab_order_status(p_order uuid, p_status uuid, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o        record;
  v_target public.lab_status_kind;
begin
  select * into o from private.lock_order(p_order);
  if o.organization_id is null then
    raise exception 'Orden no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(o.organization_id, 'lab.manage');
  if o.kind in ('entregado', 'cancelado') then
    raise exception 'La orden ya está cerrada' using errcode = '22023';
  end if;
  select kind into v_target from public.lab_order_statuses where id = p_status and organization_id = o.organization_id and is_active;
  if v_target is null then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if v_target not in ('inicial', 'proceso', 'recibido') then
    raise exception 'Ese estado se asigna con su acción propia (control de calidad, entrega o cancelación)' using errcode = '22023';
  end if;
  perform private.set_lab_status(p_order, p_status, p_note);
end;
$$;

create or replace function public.cancel_lab_order(p_order uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
begin
  select * into o from private.lock_order(p_order);
  if o.organization_id is null then
    raise exception 'Orden no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(o.organization_id, 'lab.manage');
  if o.kind in ('entregado', 'cancelado') then
    raise exception 'La orden ya está cerrada' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica el motivo de la cancelación (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  perform private.set_lab_status(p_order, private.status_of_kind(o.organization_id, 'cancelado'), p_reason);
  perform private.write_audit(o.organization_id, 'lab_order.cancel', 'lab_orders', p_order::text);
end;
$$;

create or replace function public.record_quality_check(p_order uuid, p_result text, p_checklist jsonb, p_notes text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  o    record;
  v_id uuid;
begin
  select * into o from private.lock_order(p_order);
  if o.organization_id is null then
    raise exception 'Orden no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(o.organization_id, 'delivery.manage');
  if o.kind <> 'recibido' then
    raise exception 'El control de calidad se hace cuando la orden está recibida en la óptica' using errcode = '22023';
  end if;
  if p_result = 'rechazado' and coalesce(char_length(trim(p_notes)), 0) < 5 then
    raise exception 'Describe el motivo del rechazo' using errcode = '22023';
  end if;
  insert into public.quality_checks (organization_id, order_id, result, checklist, notes, checked_by)
  values (o.organization_id, p_order, p_result, coalesce(p_checklist, '[]'), nullif(trim(p_notes), ''), (select auth.uid()))
  returning id into v_id;
  perform private.set_lab_status(p_order,
    private.status_of_kind(o.organization_id,
      (case when p_result = 'aprobado' then 'calidad_aprobada' else 'calidad_rechazada' end)::public.lab_status_kind),
    p_notes);
  return v_id;
end;
$$;

create or replace function public.register_delivery(
  p_sale uuid, p_order uuid, p_name text, p_doc text, p_notes text, p_allow_balance boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s         public.sales%rowtype;
  o         record;
  v_balance numeric;
  v_auth    uuid;
  v_id      uuid;
begin
  select * into s from public.sales where id = p_sale for update;
  if s.id is null then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(s.organization_id, 'delivery.handover');
  if s.status <> 'confirmada' then
    raise exception 'La venta está anulada' using errcode = '22023';
  end if;
  if p_order is not null then
    select * into o from private.lock_order(p_order);
    if o.organization_id is null or o.sale_id <> s.id then
      raise exception 'La orden no pertenece a esta venta' using errcode = '22023';
    end if;
    if o.kind <> 'calidad_aprobada' then
      raise exception 'Solo se entrega una orden con control de calidad aprobado' using errcode = '22023';
    end if;
  end if;
  v_balance := private.sale_balance(s.id);
  if v_balance > 0 then
    if not coalesce(p_allow_balance, false) or not private.has_permission(s.organization_id, 'discount.approve') then
      raise exception 'La venta tiene saldo pendiente de %. Cóbralo o pide a un administrador que autorice la entrega.', v_balance
        using errcode = '23514';
    end if;
    v_auth := (select auth.uid());
  end if;

  insert into public.deliveries (organization_id, sale_id, lab_order_id, received_by_name, received_by_doc,
                                 balance_at_delivery, balance_authorized_by, notes, delivered_by)
  values (s.organization_id, s.id, p_order, trim(p_name), nullif(upper(trim(p_doc)), ''), v_balance, v_auth,
          nullif(trim(p_notes), ''), (select auth.uid()))
  returning id into v_id;

  if p_order is not null then
    perform private.set_lab_status(p_order, private.status_of_kind(s.organization_id, 'entregado'), 'Entregada a ' || trim(p_name));
  end if;
  perform private.write_audit(s.organization_id, 'delivery.register', 'deliveries', v_id::text,
                              jsonb_build_object('sale', s.id, 'balance', v_balance));
  return v_id;
end;
$$;

create or replace function public.open_warranty(p_sale uuid, p_order uuid, p_kind text, p_description text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_id  uuid;
begin
  select organization_id into v_org from public.sales where id = p_sale;
  if v_org is null then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'warranty.manage');
  if p_order is not null and not exists (select 1 from public.lab_orders where id = p_order and sale_id = p_sale) then
    raise exception 'La orden no pertenece a esta venta' using errcode = '22023';
  end if;
  insert into public.warranties (organization_id, sale_id, lab_order_id, kind, description, opened_by)
  values (v_org, p_sale, p_order, p_kind, trim(p_description), (select auth.uid()))
  returning id into v_id;
  insert into public.warranty_events (organization_id, warranty_id, status, note, created_by)
  values (v_org, v_id, 'abierta', trim(p_description), (select auth.uid()));
  perform private.write_audit(v_org, 'warranty.open', 'warranties', v_id::text);
  return v_id;
end;
$$;

create or replace function public.update_warranty(p_warranty uuid, p_status text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.warranties%rowtype;
begin
  select * into w from public.warranties where id = p_warranty for update;
  if w.id is null then
    raise exception 'Garantía no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(w.organization_id, 'warranty.manage');
  if w.status in ('resuelta', 'rechazada') then
    raise exception 'El caso ya está cerrado' using errcode = '22023';
  end if;
  if p_status not in ('en_proceso', 'resuelta', 'rechazada') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_note)), 0) < 5 then
    raise exception 'Describe la gestión o la resolución (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  update public.warranties
     set status = p_status,
         resolution = case when p_status in ('resuelta', 'rechazada') then trim(p_note) else resolution end,
         closed_at = case when p_status in ('resuelta', 'rechazada') then now() else closed_at end
   where id = w.id;
  insert into public.warranty_events (organization_id, warranty_id, status, note, created_by)
  values (w.organization_id, w.id, p_status, trim(p_note), (select auth.uid()));
end;
$$;

-- Anular una venta: solo sin pagos vigentes, sin órdenes activas ni entregas.
-- Devuelve al inventario lo descontado.
create or replace function public.annul_sale(p_sale uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.sales%rowtype;
begin
  select * into s from public.sales where id = p_sale for update;
  if s.id is null then
    raise exception 'Venta no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(s.organization_id, 'payments.reverse');
  if s.status <> 'confirmada' then
    raise exception 'La venta ya está anulada' using errcode = '22023';
  end if;
  if coalesce(char_length(trim(p_reason)), 0) < 5 then
    raise exception 'Explica el motivo de la anulación (mínimo 5 caracteres)' using errcode = '22023';
  end if;
  if private.sale_balance(s.id) <> s.total then
    raise exception 'La venta tiene pagos vigentes: revierte cada pago antes de anularla' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.lab_orders o join public.lab_order_statuses st on st.id = o.status_id
     where o.sale_id = s.id and st.kind <> 'cancelado'
  ) then
    raise exception 'La venta tiene órdenes de laboratorio activas: cancélalas primero' using errcode = '23514';
  end if;
  if exists (select 1 from public.deliveries where sale_id = s.id) then
    raise exception 'La venta ya tiene entregas registradas; gestiona el caso como garantía o devolución' using errcode = '23514';
  end if;

  insert into public.inventory_movements (organization_id, location_id, product_id, movement_type, quantity, sale_item_id, reason, created_by)
  select s.organization_id, s.location_id, m.product_id, 'devolucion_venta', m.quantity, m.sale_item_id,
         'Anulación de la venta ' || s.number, (select auth.uid())
    from public.inventory_movements m
    join public.sale_items si on si.id = m.sale_item_id
   where si.sale_id = s.id and m.movement_type = 'salida_venta';

  update public.sales
     set status = 'anulada', annulled_at = now(), annulled_by = (select auth.uid()), annul_reason = left(trim(p_reason), 300)
   where id = s.id;
  perform private.write_audit(s.organization_id, 'sale.annul', 'sales', s.id::text, jsonb_build_object('total', s.total));
end;
$$;

revoke all on function public.create_lab_order(jsonb)                                  from public, anon, authenticated;
revoke all on function public.change_lab_order_status(uuid, uuid, text)                from public, anon, authenticated;
revoke all on function public.cancel_lab_order(uuid, text)                             from public, anon, authenticated;
revoke all on function public.record_quality_check(uuid, text, jsonb, text)            from public, anon, authenticated;
revoke all on function public.register_delivery(uuid, uuid, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.open_warranty(uuid, uuid, text, text)                    from public, anon, authenticated;
revoke all on function public.update_warranty(uuid, text, text)                        from public, anon, authenticated;
revoke all on function public.annul_sale(uuid, text)                                   from public, anon, authenticated;

grant execute on function public.create_lab_order(jsonb)                                  to authenticated;
grant execute on function public.change_lab_order_status(uuid, uuid, text)                to authenticated;
grant execute on function public.cancel_lab_order(uuid, text)                             to authenticated;
grant execute on function public.record_quality_check(uuid, text, jsonb, text)            to authenticated;
grant execute on function public.register_delivery(uuid, uuid, text, text, text, boolean) to authenticated;
grant execute on function public.open_warranty(uuid, uuid, text, text)                    to authenticated;
grant execute on function public.update_warranty(uuid, text, text)                        to authenticated;
grant execute on function public.annul_sale(uuid, text)                                   to authenticated;

revoke all on all functions in schema private from anon;

-- ====================== 20261010000012_reports_privacy.sql ======================
-- =============================================================================
-- OptiConsulta · Migración 0012 · Indicadores, reportes, exportaciones y
-- solicitudes de titulares de datos
-- -----------------------------------------------------------------------------
-- Definiciones de los indicadores (también en docs/indicadores.md):
--   venta bruta     = Σ subtotal de ventas confirmadas del periodo
--   descuentos      = Σ descuentos de ventas confirmadas del periodo
--   venta neta      = venta bruta − descuentos
--   anulaciones     = Σ total de ventas anuladas en el periodo (fecha de anulación)
--   pagos recibidos = Σ pagos del periodo − Σ reversiones del periodo
--   saldo por cobrar= Σ (total − pagos vigentes) de ventas confirmadas, a la fecha
-- Los periodos usan el calendario de la zona horaria de la óptica.
-- =============================================================================

create or replace function private.org_today(p_org uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone o.timezone)::date from public.organizations o where o.id = p_org;
$$;
revoke all on function private.org_today(uuid) from public;

-- Inicio de un día local de la óptica, como instante.
create or replace function private.org_day_start(p_org uuid, p_day date)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select (p_day::timestamp at time zone o.timezone) from public.organizations o where o.id = p_org;
$$;
revoke all on function private.org_day_start(uuid, date) from public;

create or replace function private.check_period(p_from date, p_to date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Periodo no válido' using errcode = '22023';
  end if;
  if p_to - p_from >= 366 then -- ambos extremos cuentan: máximo 366 días
    raise exception 'El periodo máximo es de un año' using errcode = '22023';
  end if;
end;
$$;
revoke all on function private.check_period(date, date) from public;

-- -----------------------------------------------------------------------------
-- Indicadores del inicio. Solo devuelve los que el rol puede ver.
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_indicators(p_org uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_day0  timestamptz;
  v_day1  timestamptz;
  v_month timestamptz;
  v       jsonb := '{}'::jsonb;
begin
  if not private.is_member(p_org) then
    raise exception 'Permiso denegado' using errcode = '42501';
  end if;
  v_today := private.org_today(p_org);
  v_day0 := private.org_day_start(p_org, v_today);
  v_day1 := private.org_day_start(p_org, v_today + 1);
  v_month := private.org_day_start(p_org, date_trunc('month', v_today)::date);
  v := v || jsonb_build_object('today', v_today);

  if private.has_permission(p_org, 'agenda.read') then
    v := v || jsonb_build_object(
      'appointments_today', (select count(*) from public.appointments
                              where organization_id = p_org and starts_at >= v_day0 and starts_at < v_day1
                                and status in ('programada', 'confirmada', 'atendida')),
      'appointments_pending_today', (select count(*) from public.appointments
                              where organization_id = p_org and starts_at >= v_day0 and starts_at < v_day1
                                and status in ('programada', 'confirmada')));
  end if;

  if private.has_permission(p_org, 'clinical.read') then
    v := v || jsonb_build_object(
      'encounters_finalized_today', (select count(*) from public.clinical_encounters
                              where organization_id = p_org and status = 'finalizada' and finalized_at >= v_day0 and finalized_at < v_day1),
      'encounters_open', (select count(*) from public.clinical_encounters where organization_id = p_org and status = 'borrador'));
  end if;

  if private.has_permission(p_org, 'reports.financial') then
    v := v || jsonb_build_object(
      'sales_gross_month', (select coalesce(sum(subtotal), 0) from public.sales
                             where organization_id = p_org and status = 'confirmada' and created_at >= v_month),
      'sales_discounts_month', (select coalesce(sum(discount_total), 0) from public.sales
                             where organization_id = p_org and status = 'confirmada' and created_at >= v_month),
      'sales_net_month', (select coalesce(sum(total), 0) from public.sales
                             where organization_id = p_org and status = 'confirmada' and created_at >= v_month),
      'sales_annulled_month', (select coalesce(sum(total), 0) from public.sales
                             where organization_id = p_org and status = 'anulada' and annulled_at >= v_month),
      'payments_month', (select coalesce(sum(amount), 0) from public.payments
                          where organization_id = p_org and created_at >= v_month)
                      - (select coalesce(sum(p.amount), 0) from public.payment_reversals r join public.payments p on p.id = r.payment_id
                          where r.organization_id = p_org and r.created_at >= v_month),
      'receivables', (select coalesce(sum(private.sale_balance(id)), 0) from public.sales
                       where organization_id = p_org and status = 'confirmada'),
      'receivables_count', (select count(*) from public.sales
                             where organization_id = p_org and status = 'confirmada' and private.sale_balance(id) > 0));
  end if;

  if private.has_permission(p_org, 'lab.read') then
    v := v || (
      select jsonb_build_object(
        'lab_in_process', count(*) filter (where s.kind in ('inicial', 'proceso', 'recibido', 'calidad_rechazada')),
        'lab_delayed', count(*) filter (where s.kind in ('inicial', 'proceso') and o.promised_date < v_today),
        'lab_ready', count(*) filter (where s.kind = 'calidad_aprobada'))
        from public.lab_orders o join public.lab_order_statuses s on s.id = o.status_id
       where o.organization_id = p_org);
  end if;

  if private.has_permission(p_org, 'inventory.read') then
    v := v || jsonb_build_object('low_stock', (
      select count(*) from public.products p
        left join (select product_id, sum(quantity) as q from public.inventory_stock where organization_id = p_org group by product_id) st
          on st.product_id = p.id
       where p.organization_id = p_org and p.is_active and p.tracks_stock and coalesce(st.q, 0) <= p.stock_min));
  end if;

  if private.has_permission(p_org, 'warranty.read') then
    v := v || jsonb_build_object('warranties_open', (
      select count(*) from public.warranties where organization_id = p_org and status in ('abierta', 'en_proceso')));
  end if;

  return v;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reportes (reports.financial)
-- -----------------------------------------------------------------------------
create or replace function public.report_sales_summary(p_org uuid, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t0 timestamptz;
  t1 timestamptz;
begin
  perform private.require_permission(p_org, 'reports.financial');
  perform private.check_period(p_from, p_to);
  t0 := private.org_day_start(p_org, p_from);
  t1 := private.org_day_start(p_org, p_to + 1);
  return jsonb_build_object(
    'sales_count', (select count(*) from public.sales where organization_id = p_org and status = 'confirmada' and created_at >= t0 and created_at < t1),
    'gross', (select coalesce(sum(subtotal), 0) from public.sales where organization_id = p_org and status = 'confirmada' and created_at >= t0 and created_at < t1),
    'discounts', (select coalesce(sum(discount_total), 0) from public.sales where organization_id = p_org and status = 'confirmada' and created_at >= t0 and created_at < t1),
    'net', (select coalesce(sum(total), 0) from public.sales where organization_id = p_org and status = 'confirmada' and created_at >= t0 and created_at < t1),
    'annulled_count', (select count(*) from public.sales where organization_id = p_org and status = 'anulada' and annulled_at >= t0 and annulled_at < t1),
    'annulled_total', (select coalesce(sum(total), 0) from public.sales where organization_id = p_org and status = 'anulada' and annulled_at >= t0 and annulled_at < t1),
    'payments', (select coalesce(sum(amount), 0) from public.payments where organization_id = p_org and created_at >= t0 and created_at < t1),
    'reversals', (select coalesce(sum(p.amount), 0) from public.payment_reversals r join public.payments p on p.id = r.payment_id
                   where r.organization_id = p_org and r.created_at >= t0 and r.created_at < t1),
    'by_method', coalesce((
      select jsonb_agg(jsonb_build_object('method', m.name, 'received', x.received, 'reversed', x.reversed) order by m.name)
        from public.payment_methods m
        join lateral (
          select coalesce((select sum(amount) from public.payments where payment_method_id = m.id and created_at >= t0 and created_at < t1), 0) as received,
                 coalesce((select sum(p.amount) from public.payment_reversals r join public.payments p on p.id = r.payment_id
                            where p.payment_method_id = m.id and r.created_at >= t0 and r.created_at < t1), 0) as reversed
        ) x on true
       where m.organization_id = p_org and (x.received > 0 or x.reversed > 0)), '[]'::jsonb)
  );
end;
$$;

create or replace function public.report_by_seller(p_org uuid, p_from date, p_to date)
returns table (seller_id uuid, seller_name text, sales_count bigint, gross numeric, discounts numeric, net numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_permission(p_org, 'reports.financial');
  perform private.check_period(p_from, p_to);
  return query
  select s.seller_id, coalesce(nullif(pf.full_name, ''), pf.email, 'Usuario'), count(*), sum(s.subtotal), sum(s.discount_total), sum(s.total)
    from public.sales s left join public.profiles pf on pf.id = s.seller_id
   where s.organization_id = p_org and s.status = 'confirmada'
     and s.created_at >= private.org_day_start(p_org, p_from) and s.created_at < private.org_day_start(p_org, p_to + 1)
   group by s.seller_id, pf.full_name, pf.email
   order by sum(s.total) desc;
end;
$$;

create or replace function public.report_by_product(p_org uuid, p_from date, p_to date)
returns table (product_id uuid, sku text, name text, quantity bigint, gross numeric, discounts numeric, net numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_permission(p_org, 'reports.financial');
  perform private.check_period(p_from, p_to);
  return query
  select p.id, p.sku::text, p.name, sum(i.quantity)::bigint, sum(i.quantity * i.unit_price), sum(i.discount_amount), sum(i.line_total)
    from public.sale_items i
    join public.sales s on s.id = i.sale_id
    join public.products p on p.id = i.product_id
   where s.organization_id = p_org and s.status = 'confirmada'
     and s.created_at >= private.org_day_start(p_org, p_from) and s.created_at < private.org_day_start(p_org, p_to + 1)
   group by p.id, p.sku, p.name
   order by sum(i.line_total) desc;
end;
$$;

-- -----------------------------------------------------------------------------
-- Registro de exportaciones (criterio 12): se registra antes de entregar el archivo.
-- -----------------------------------------------------------------------------
create table public.export_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  kind            text not null check (kind in ('pacientes', 'citas', 'ventas', 'pagos', 'inventario')),
  params          jsonb not null default '{}'::jsonb,
  row_count       integer not null check (row_count >= 0),
  reason          text not null check (char_length(reason) between 10 and 300),
  created_by      uuid not null references auth.users(id) on delete restrict,
  created_at      timestamptz not null default now()
);
create index export_jobs_org_idx on public.export_jobs (organization_id, created_at desc);
create trigger export_jobs_immutable before update or delete on public.export_jobs for each row execute function private.forbid_audit_mutation();

alter table public.export_jobs enable row level security;
revoke all on table public.export_jobs from anon, authenticated;
grant select on public.export_jobs to authenticated;
create policy export_jobs_select on public.export_jobs for select to authenticated
  using ((select private.has_permission(organization_id, 'audit.read')));

create or replace function public.log_export(p_org uuid, p_kind text, p_params jsonb, p_rows integer, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_permission(p_org, 'export.data');
  -- Cada tipo exige además poder ver esos datos.
  perform private.require_permission(p_org, case p_kind
    when 'pacientes' then 'patients.read'
    when 'citas' then 'agenda.read'
    when 'ventas' then 'reports.financial'
    when 'pagos' then 'reports.financial'
    when 'inventario' then 'inventory.read'
    else 'export.clinical' end);
  if coalesce(char_length(trim(p_reason)), 0) < 10 then
    raise exception 'Indica para qué se exportan los datos (mínimo 10 caracteres)' using errcode = '22023';
  end if;
  insert into public.export_jobs (organization_id, kind, params, row_count, reason, created_by)
  values (p_org, p_kind, coalesce(p_params, '{}'), p_rows, trim(p_reason), (select auth.uid()))
  returning id into v_id;
  perform private.write_audit(p_org, 'export.' || p_kind, 'export_jobs', v_id::text, jsonb_build_object('rows', p_rows));
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Solicitudes de titulares (Ley 1581 de 2012). Plazos en días hábiles sin
-- festivos: conservador (vence antes o el mismo día que el plazo legal).
-- Consultas: 10 días hábiles; reclamos (rectificación, supresión, revocatoria): 15.
-- Verificar plazos con el asesor jurídico.
-- -----------------------------------------------------------------------------
create or replace function private.add_business_days(p_start date, p_days integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  d date := p_start;
  n integer := 0;
begin
  while n < p_days loop
    d := d + 1;
    if extract(isodow from d) < 6 then
      n := n + 1;
    end if;
  end loop;
  return d;
end;
$$;
revoke all on function private.add_business_days(date, integer) from public;

create table public.privacy_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete restrict,
  patient_id      uuid,
  requester_name  text not null check (char_length(requester_name) between 3 and 120),
  requester_doc   text check (requester_doc is null or requester_doc ~ '^[A-Za-z0-9]{3,20}$'),
  requester_contact text check (requester_contact is null or char_length(requester_contact) <= 160),
  kind            text not null check (kind in ('consulta', 'rectificacion', 'supresion', 'revocatoria', 'otro_reclamo')),
  description     text not null check (char_length(description) between 10 and 2000),
  received_at     timestamptz not null default now(),
  due_date        date not null,
  status          text not null default 'recibida' check (status in ('recibida', 'en_tramite', 'respondida')),
  response        text check (response is null or char_length(response) <= 4000),
  responded_at    timestamptz,
  responded_by    uuid references auth.users(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  unique (id, organization_id),
  check (status <> 'respondida' or (response is not null and responded_at is not null)),
  foreign key (patient_id, organization_id) references public.patients (id, organization_id) on delete restrict
);
create index privacy_requests_org_idx on public.privacy_requests (organization_id, status, due_date);
create trigger privacy_requests_audit after insert or update on public.privacy_requests
  for each row execute function private.audit_row_change();

alter table public.privacy_requests enable row level security;
revoke all on table public.privacy_requests from anon, authenticated;
grant select on public.privacy_requests to authenticated;
create policy privacy_requests_select on public.privacy_requests for select to authenticated
  using ((select private.has_permission(organization_id, 'privacy.manage'))
      or (select private.has_permission(organization_id, 'privacy.register')));

create or replace function public.register_privacy_request(p_org uuid, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_kind text := p_payload ->> 'kind';
  v_id   uuid;
begin
  perform private.require_permission(p_org, 'privacy.register');
  insert into public.privacy_requests (organization_id, patient_id, requester_name, requester_doc, requester_contact,
                                       kind, description, due_date, created_by)
  values (p_org, nullif(p_payload ->> 'patient_id', '')::uuid, trim(p_payload ->> 'requester_name'),
          nullif(upper(trim(p_payload ->> 'requester_doc')), ''), nullif(trim(p_payload ->> 'requester_contact'), ''),
          v_kind, trim(p_payload ->> 'description'),
          private.add_business_days(private.org_today(p_org), case when v_kind = 'consulta' then 10 else 15 end),
          (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.update_privacy_request(p_request uuid, p_status text, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.privacy_requests%rowtype;
begin
  select * into r from public.privacy_requests where id = p_request for update;
  if r.id is null then
    raise exception 'Solicitud no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(r.organization_id, 'privacy.manage');
  if r.status = 'respondida' then
    raise exception 'La solicitud ya fue respondida' using errcode = '22023';
  end if;
  if p_status = 'respondida' and coalesce(char_length(trim(p_response)), 0) < 10 then
    raise exception 'Registra la respuesta dada al titular (mínimo 10 caracteres)' using errcode = '22023';
  end if;
  if p_status not in ('en_tramite', 'respondida') then
    raise exception 'Estado no válido' using errcode = '22023';
  end if;
  update public.privacy_requests
     set status = p_status,
         response = case when p_status = 'respondida' then trim(p_response) else response end,
         responded_at = case when p_status = 'respondida' then now() end,
         responded_by = case when p_status = 'respondida' then (select auth.uid()) end
   where id = p_request;
end;
$$;

revoke all on function public.dashboard_indicators(uuid)                    from public, anon, authenticated;
revoke all on function public.report_sales_summary(uuid, date, date)        from public, anon, authenticated;
revoke all on function public.report_by_seller(uuid, date, date)            from public, anon, authenticated;
revoke all on function public.report_by_product(uuid, date, date)           from public, anon, authenticated;
revoke all on function public.log_export(uuid, text, jsonb, integer, text)  from public, anon, authenticated;
revoke all on function public.register_privacy_request(uuid, jsonb)         from public, anon, authenticated;
revoke all on function public.update_privacy_request(uuid, text, text)      from public, anon, authenticated;

grant execute on function public.dashboard_indicators(uuid)                    to authenticated;
grant execute on function public.report_sales_summary(uuid, date, date)        to authenticated;
grant execute on function public.report_by_seller(uuid, date, date)            to authenticated;
grant execute on function public.report_by_product(uuid, date, date)           to authenticated;
grant execute on function public.log_export(uuid, text, jsonb, integer, text)  to authenticated;
grant execute on function public.register_privacy_request(uuid, jsonb)         to authenticated;
grant execute on function public.update_privacy_request(uuid, text, text)      to authenticated;

revoke all on all functions in schema private from anon;

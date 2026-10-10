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

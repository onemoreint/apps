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

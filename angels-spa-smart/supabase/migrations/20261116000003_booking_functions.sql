-- =====================================================================
-- Funciones de servidor: reservas transaccionales, estados, auditoría.
-- =====================================================================

-- ---------- Auditoría automática ----------
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r record := coalesce(new, old);
  d jsonb := '{}'::jsonb;
begin
  if tg_op = 'UPDATE' and tg_table_name = 'appointments' then
    d := jsonb_strip_nulls(jsonb_build_object(
      'status', case when old.status is distinct from new.status then jsonb_build_array(old.status, new.status) end,
      'starts_at', case when old.starts_at is distinct from new.starts_at then jsonb_build_array(old.starts_at, new.starts_at) end));
  end if;
  insert into public.audit_logs (business_id, actor_id, action, entity, entity_id, detail)
  values (r.business_id, auth.uid(), lower(tg_op), tg_table_name, r.id, d);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['appointments','clients','payments','services','promotions','schedule_blocks','availability_rules','loyalty_transactions','profiles'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end $$;

-- ---------- Validación de horario (reutilizada por reservas públicas y del panel) ----------
create or replace function public.slot_problem(
  p_business_id uuid, p_staff_id uuid, p_starts_at timestamptz, p_ends_at timestamptz,
  p_exclude_appointment uuid default null, p_public boolean default true
) returns text
language plpgsql stable security definer set search_path = public as $$
declare
  b public.businesses;
  local_start timestamp;
  local_end timestamp;
  s jsonb;
begin
  select * into b from public.businesses where id = p_business_id and active;
  if not found then return 'negocio_inactivo'; end if;
  s := b.settings;
  local_start := p_starts_at at time zone b.timezone;
  local_end := p_ends_at at time zone b.timezone;

  if p_starts_at < now() then return 'fecha_pasada'; end if;
  if p_public then
    if p_starts_at < now() + make_interval(mins => coalesce((s->>'min_lead_min')::int, 60)) then return 'anticipacion'; end if;
    if local_start::date > (now() at time zone b.timezone)::date + coalesce((s->>'max_days_ahead')::int, 45) then return 'fuera_de_rango'; end if;
  end if;
  if local_start::date <> local_end::date then return 'fuera_de_horario'; end if;

  if not exists (
    select 1 from public.availability_rules r
    where r.business_id = p_business_id and r.staff_id = p_staff_id
      and r.weekday = extract(dow from local_start)
      and local_start::time >= r.start_time and local_end::time <= r.end_time
  ) then return 'fuera_de_horario'; end if;

  if exists (
    select 1 from public.schedule_blocks k
    where k.business_id = p_business_id and (k.staff_id is null or k.staff_id = p_staff_id)
      and tstzrange(k.starts_at, k.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then return 'bloqueado'; end if;

  if exists (
    select 1 from public.appointments a
    where a.staff_id = p_staff_id and a.status in ('pendiente','confirmada','completada')
      and (p_exclude_appointment is null or a.id <> p_exclude_appointment)
      and tstzrange(a.starts_at, a.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then return 'ocupado'; end if;

  return null;
end $$;
revoke all on function public.slot_problem(uuid, uuid, timestamptz, timestamptz, uuid, boolean) from public, anon, authenticated;

-- ---------- Intervalos ocupados para el portal (sin datos personales) ----------
create or replace function public.get_busy_intervals(p_business_id uuid, p_from timestamptz, p_to timestamptz)
returns table (staff_id uuid, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.staff_id, a.starts_at, a.ends_at from public.appointments a
  where a.business_id = p_business_id and a.status in ('pendiente','confirmada','completada')
    and a.starts_at < p_to and a.ends_at > p_from and p_to - p_from <= interval '62 days'
  union all
  select k.staff_id, k.starts_at, k.ends_at from public.schedule_blocks k
  where k.business_id = p_business_id and k.starts_at < p_to and k.ends_at > p_from and p_to - p_from <= interval '62 days'
$$;
revoke all on function public.get_busy_intervals(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_busy_intervals(uuid, timestamptz, timestamptz) to anon, authenticated;

-- ---------- Reserva pública (única vía de escritura para anon) ----------
create or replace function public.book_appointment(
  p_business_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_starts_at timestamptz,
  p_name text,
  p_phone text,
  p_notes text default '',
  p_consent_data boolean default false,
  p_consent_marketing boolean default false
) returns table (appointment_id uuid, status public.appointment_status, starts_at timestamptz, ends_at timestamptz)
language plpgsql volatile security definer set search_path = public as $$
declare
  b public.businesses;
  svc public.services;
  v_phone text := public.normalize_phone(p_phone);
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_end timestamptz;
  v_client uuid;
  v_appt public.appointments;
  v_problem text;
  v_recent int;
  v_tz text;
begin
  select * into b from public.businesses where id = p_business_id and active;
  if not found then raise exception 'negocio_inactivo' using errcode = 'P0001'; end if;

  -- Límite global por negocio (protección contra inundación)
  select count(*) into v_recent from public.booking_requests_log
  where business_id = p_business_id and created_at > now() - interval '1 hour';
  if v_recent >= coalesce((b.settings->>'max_requests_per_business_per_hour')::int, 40) then
    raise exception 'limite' using errcode = 'P0001', detail = 'Demasiadas solicitudes. Intenta más tarde.';
  end if;

  -- Validación de entradas
  if not p_consent_data then raise exception 'consentimiento' using errcode = 'P0001'; end if;
  if v_phone is null then raise exception 'telefono' using errcode = 'P0001'; end if;
  if length(v_name) < 3 or length(v_name) > 80 or v_name ~ '[0-9<>{}@#$%^&*_=+/\\|;:"]' then raise exception 'nombre' using errcode = 'P0001'; end if;
  if length(coalesce(p_notes, '')) > 500 then raise exception 'notas' using errcode = 'P0001'; end if;

  -- Límite por teléfono en 24 h
  select count(*) into v_recent from public.booking_requests_log
  where business_id = p_business_id and phone = v_phone and accepted and created_at > now() - interval '24 hours';
  if v_recent >= coalesce((b.settings->>'max_requests_per_phone_per_day')::int, 3) then
    insert into public.booking_requests_log (business_id, phone, accepted, reason) values (p_business_id, v_phone, false, 'limite');
    raise exception 'limite' using errcode = 'P0001';
  end if;

  select * into svc from public.services where id = p_service_id and business_id = p_business_id and active;
  if not found then raise exception 'servicio_inactivo' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.staff where id = p_staff_id and business_id = p_business_id and active) then
    raise exception 'profesional' using errcode = 'P0001';
  end if;
  v_end := p_starts_at + make_interval(mins => svc.duration_min);

  -- Serializa reservas de la misma profesional y día: evita condiciones de carrera.
  v_tz := b.timezone;
  perform pg_advisory_xact_lock(hashtextextended(p_staff_id::text || (p_starts_at at time zone v_tz)::date::text, 0));

  v_problem := public.slot_problem(p_business_id, p_staff_id, p_starts_at, v_end, null, true);
  if v_problem is not null then raise exception '%', v_problem using errcode = 'P0001'; end if;

  -- Clienta: se reutiliza por teléfono normalizado (no se sobrescribe el nombre existente)
  insert into public.clients (business_id, name, phone)
  values (p_business_id, v_name, v_phone)
  on conflict (business_id, phone) do update set updated_at = now()
  returning id into v_client;

  -- Solicitud duplicada: misma clienta, mismo servicio y mismo día aún activa
  if exists (
    select 1 from public.appointments a
    where a.business_id = p_business_id and a.client_id = v_client and a.service_id = p_service_id
      and a.status in ('pendiente','confirmada')
      and (a.starts_at at time zone v_tz)::date = (p_starts_at at time zone v_tz)::date
  ) then raise exception 'duplicada' using errcode = 'P0001'; end if;

  insert into public.consent_records (business_id, client_id, purpose, granted, source)
  values (p_business_id, v_client, 'tratamiento_datos', true, 'reserva_publica'),
         (p_business_id, v_client, 'marketing', p_consent_marketing, 'reserva_publica');

  begin
    insert into public.appointments (business_id, client_id, service_id, staff_id, starts_at, ends_at, status, price, client_notes, source)
    values (p_business_id, v_client, svc.id, p_staff_id, p_starts_at, v_end, 'pendiente', svc.price, coalesce(p_notes, ''), 'publico')
    returning * into v_appt;
  exception when exclusion_violation then
    raise exception 'ocupado' using errcode = 'P0001';
  end;

  insert into public.booking_requests_log (business_id, phone, accepted) values (p_business_id, v_phone, true);
  return query select v_appt.id, v_appt.status, v_appt.starts_at, v_appt.ends_at;
end $$;
revoke all on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, uuid, timestamptz, text, text, text, boolean, boolean) to anon, authenticated;

-- ---------- Cambio de estado con reglas de fidelización ----------
create or replace function public.set_appointment_status(p_appointment_id uuid, p_status public.appointment_status)
returns public.appointments
language plpgsql volatile security definer set search_path = public as $$
declare
  a public.appointments;
  b public.businesses;
  v_net int;
  v_points int;
begin
  select * into a from public.appointments where id = p_appointment_id for update;
  if not found or not public.is_member(a.business_id) then raise exception 'no_encontrado' using errcode = 'P0001'; end if;
  if a.status = p_status then return a; end if;
  if a.status = 'cancelada' and p_status not in ('pendiente','confirmada') then raise exception 'estado' using errcode = 'P0001'; end if;

  begin
    update public.appointments set status = p_status where id = a.id returning * into a;
  exception when exclusion_violation then
    raise exception 'ocupado' using errcode = 'P0001';
  end;

  select * into b from public.businesses where id = a.business_id;
  select coalesce(sum(points), 0) into v_net from public.loyalty_transactions
  where appointment_id = a.id and kind in ('acumulacion','reversion');
  v_points := coalesce((b.settings->'loyalty'->>'points_per_visit')::int, 0);

  if p_status = 'completada' and v_net = 0 and v_points > 0 and coalesce((b.settings->'loyalty'->>'enabled')::boolean, false) then
    insert into public.loyalty_transactions (business_id, client_id, appointment_id, points, kind, description)
    values (a.business_id, a.client_id, a.id, v_points, 'acumulacion', 'Visita completada');
  elsif p_status <> 'completada' and v_net > 0 then
    insert into public.loyalty_transactions (business_id, client_id, appointment_id, points, kind, description)
    values (a.business_id, a.client_id, a.id, -v_net, 'reversion', 'Reversión por cambio de estado');
  end if;
  return a;
end $$;
revoke all on function public.set_appointment_status(uuid, public.appointment_status) from public, anon, authenticated;
grant execute on function public.set_appointment_status(uuid, public.appointment_status) to authenticated;

-- ---------- Pagos: no superar el precio de la cita ----------
create or replace function public.check_payment_total() returns trigger
language plpgsql as $$
declare v_price numeric; v_paid numeric;
begin
  if new.appointment_id is null then return new; end if;
  select price into v_price from public.appointments where id = new.appointment_id for update;
  if v_price is null then return new; end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where appointment_id = new.appointment_id and id <> new.id;
  if v_paid + new.amount > v_price then raise exception 'pago_excede_saldo' using errcode = 'P0001'; end if;
  return new;
end $$;
create trigger payments_total_check before insert or update on public.payments
for each row execute function public.check_payment_total();

-- ---------- Derecho de supresión ----------
create or replace function public.anonymize_client(p_client_id uuid) returns void
language plpgsql volatile security definer set search_path = public as $$
declare c public.clients;
begin
  select * into c from public.clients where id = p_client_id for update;
  if not found or not public.has_role(c.business_id, array['owner','admin']::public.member_role[]) then
    raise exception 'no_encontrado' using errcode = 'P0001';
  end if;
  update public.clients set name = 'Clienta eliminada', phone = 'anon-' || left(id::text, 12), birthday = null,
    preferences = '', notes = '', anonymized_at = now() where id = c.id;
  update public.appointments set client_notes = '' where client_id = c.id;
  insert into public.consent_records (business_id, client_id, purpose, granted, source)
  select c.business_id, c.id, p, false, 'solicitud_titular' from unnest(enum_range(null::public.consent_purpose)) p;
end $$;
revoke all on function public.anonymize_client(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_client(uuid) to authenticated;

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

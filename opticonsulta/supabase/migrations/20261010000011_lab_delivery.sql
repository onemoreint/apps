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

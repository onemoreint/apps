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

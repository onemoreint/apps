-- =============================================================================
-- MesaQR — INSTALACIÓN COMPLETA (generado por "npm run db:setup", no editar a mano)
-- Pega TODO este archivo en Supabase → SQL Editor → Run, UNA sola vez,
-- en un proyecto nuevo. Incluye: tablas, seguridad, funciones, fotos y datos demo.
-- =============================================================================

-- ───── migrations/20261007000001_init.sql ─────
-- =============================================================================
-- MesaQR — esquema inicial
-- Multinegocio desde el inicio: toda tabla cuelga de businesses.
-- El público (rol anon) NO tiene acceso a tablas: solo a get_menu y create_order.
-- =============================================================================

-- Ninguna función nueva es ejecutable por defecto: se concede explícitamente.
alter default privileges in schema public revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Token aleatorio de 10 caracteres hex (≈ 1,1 billones de combinaciones).
-- gen_random_uuid() es nativo de Postgres 13+, no requiere extensiones.
create or replace function public.new_table_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
$$;

-- ---------------------------------------------------------------------------
-- Negocios (incluye la configuración, relación 1:1)
-- ---------------------------------------------------------------------------
create table public.businesses (
  id                        uuid primary key default gen_random_uuid(),
  slug                      text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name                      text not null check (char_length(name) between 1 and 80),
  description               text check (char_length(description) <= 300),
  logo_url                  text check (char_length(logo_url) <= 500),
  address                   text check (char_length(address) <= 200),
  phone                     text check (char_length(phone) <= 30),
  whatsapp                  text not null check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  instagram                 text check (char_length(instagram) <= 60),
  currency                  text not null default 'USD' check (currency = 'USD'),
  show_bs                   boolean not null default true,
  exchange_rate             numeric(14,4) not null default 1 check (exchange_rate > 0),
  exchange_rate_updated_at  timestamptz not null default now(),
  primary_color             text not null default '#D62828' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  theme                     jsonb not null default '{}'::jsonb,
  next_order_number         integer not null default 1 check (next_order_number > 0),
  active                    boolean not null default true,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Quién administra cada negocio (usuarios de Supabase Auth)
create table public.business_members (
  business_id  uuid not null references public.businesses(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'admin' check (role in ('owner', 'admin', 'staff')),
  created_at   timestamptz not null default now(),
  primary key (business_id, user_id)
);
create index business_members_user_idx on public.business_members (user_id);

-- ---------------------------------------------------------------------------
-- Menú
-- ---------------------------------------------------------------------------
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  emoji        text check (char_length(emoji) <= 16),
  image_url    text check (char_length(image_url) <= 500),
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, business_id)
);
create index categories_business_idx on public.categories (business_id, sort_order);

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  category_id  uuid not null,
  type         text not null default 'simple' check (type in ('simple', 'combo')),
  name         text not null check (char_length(name) between 1 and 80),
  description  text check (char_length(description) <= 300),
  image_url    text check (char_length(image_url) <= 500),
  price_usd    numeric(10,2) not null check (price_usd >= 0 and price_usd < 100000),
  active       boolean not null default true,   -- visible en el menú
  available    boolean not null default true,   -- false = AGOTADO
  featured     boolean not null default false,
  upsell       boolean not null default false,  -- sugerido en "¿Quieres completar tu pedido?"
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- FK compuesta: la categoría debe ser del mismo negocio
  foreign key (category_id, business_id) references public.categories (id, business_id) on delete restrict,
  unique (id, business_id)
);
create index products_business_idx on public.products (business_id, category_id, sort_order);

-- Qué incluye un combo (informativo)
create table public.combo_items (
  id                uuid primary key default gen_random_uuid(),
  combo_product_id  uuid not null references public.products(id) on delete cascade,
  label             text not null check (char_length(label) between 1 and 80),
  quantity          integer not null default 1 check (quantity between 1 and 20),
  sort_order        integer not null default 0
);
create index combo_items_combo_idx on public.combo_items (combo_product_id, sort_order);

-- Grupos reutilizables de personalización: "Quitar ingredientes", "Extras", "Tamaño"…
create table public.option_groups (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  selection    text not null default 'multiple' check (selection in ('single', 'multiple')),
  min_select   integer not null default 0 check (min_select >= 0),
  max_select   integer not null default 10 check (max_select >= 1),
  sort_order   integer not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (min_select <= max_select),
  check (selection = 'multiple' or max_select = 1),
  unique (id, business_id)
);
create index option_groups_business_idx on public.option_groups (business_id, sort_order);

create table public.options (
  id               uuid primary key default gen_random_uuid(),
  group_id         uuid not null references public.option_groups(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 60),
  price_delta_usd  numeric(10,2) not null default 0 check (price_delta_usd >= 0 and price_delta_usd < 10000),
  available        boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index options_group_idx on public.options (group_id, sort_order);

-- Asociación de grupos a productos sueltos…
create table public.product_option_groups (
  product_id   uuid not null,
  group_id     uuid not null,
  business_id  uuid not null,
  sort_order   integer not null default 0,
  primary key (product_id, group_id),
  foreign key (product_id, business_id) references public.products (id, business_id) on delete cascade,
  foreign key (group_id, business_id) references public.option_groups (id, business_id) on delete cascade
);
create index product_option_groups_group_idx on public.product_option_groups (group_id);

-- …o a una categoría completa
create table public.category_option_groups (
  category_id  uuid not null,
  group_id     uuid not null,
  business_id  uuid not null,
  sort_order   integer not null default 0,
  primary key (category_id, group_id),
  foreign key (category_id, business_id) references public.categories (id, business_id) on delete cascade,
  foreign key (group_id, business_id) references public.option_groups (id, business_id) on delete cascade
);
create index category_option_groups_group_idx on public.category_option_groups (group_id);

-- ---------------------------------------------------------------------------
-- Mesas
-- ---------------------------------------------------------------------------
create table public.dining_tables (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  number       integer not null check (number between 1 and 9999),
  label        text check (char_length(label) <= 40),
  qr_token     text not null unique default public.new_table_token() check (qr_token ~ '^[a-z0-9]{8,32}$'),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, number)
);

-- ---------------------------------------------------------------------------
-- Pedidos (guardan copia de nombres y precios: el historial no se rompe)
-- ---------------------------------------------------------------------------
create type public.order_status as enum
  ('draft', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled');

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  table_id       uuid references public.dining_tables(id) on delete set null,
  table_number   integer not null,
  order_number   integer not null,
  code           text not null,
  status         public.order_status not null default 'pending',
  subtotal_usd   numeric(12,2) not null check (subtotal_usd >= 0),
  extras_usd     numeric(12,2) not null default 0 check (extras_usd >= 0),
  total_usd      numeric(12,2) not null check (total_usd >= 0),
  exchange_rate  numeric(14,4) not null,
  total_bs       numeric(16,2) not null,
  notes          text check (char_length(notes) <= 280),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, order_number)
);
create index orders_business_created_idx on public.orders (business_id, created_at desc);
create index orders_table_created_idx on public.orders (table_id, created_at desc);
create index orders_business_status_idx on public.orders (business_id, status);

create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,
  unit_price_usd  numeric(10,2) not null,
  quantity        integer not null check (quantity between 1 and 20),
  line_total_usd  numeric(12,2) not null,
  sort_order      integer not null default 0
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_item_options (
  id               uuid primary key default gen_random_uuid(),
  order_item_id    uuid not null references public.order_items(id) on delete cascade,
  option_id        uuid references public.options(id) on delete set null,
  group_name       text not null,
  option_name      text not null,
  price_delta_usd  numeric(10,2) not null
);
create index order_item_options_item_idx on public.order_item_options (order_item_id);

-- ---------------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------------
create trigger businesses_updated_at     before update on public.businesses     for each row execute function public.set_updated_at();
create trigger categories_updated_at     before update on public.categories     for each row execute function public.set_updated_at();
create trigger products_updated_at       before update on public.products       for each row execute function public.set_updated_at();
create trigger option_groups_updated_at  before update on public.option_groups  for each row execute function public.set_updated_at();
create trigger options_updated_at        before update on public.options        for each row execute function public.set_updated_at();
create trigger dining_tables_updated_at  before update on public.dining_tables  for each row execute function public.set_updated_at();
create trigger orders_updated_at         before update on public.orders         for each row execute function public.set_updated_at();

-- La tasa registra cuándo se actualizó
create or replace function public.touch_exchange_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.exchange_rate is distinct from old.exchange_rate then
    new.exchange_rate_updated_at := now();
  end if;
  return new;
end;
$$;
create trigger businesses_exchange_rate before update on public.businesses
  for each row execute function public.touch_exchange_rate();

-- ---------------------------------------------------------------------------
-- Autorización
-- ---------------------------------------------------------------------------
create or replace function public.is_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business_id
      and m.user_id = auth.uid()
  );
$$;

alter table public.businesses              enable row level security;
alter table public.business_members        enable row level security;
alter table public.categories              enable row level security;
alter table public.products                enable row level security;
alter table public.combo_items             enable row level security;
alter table public.option_groups           enable row level security;
alter table public.options                 enable row level security;
alter table public.product_option_groups   enable row level security;
alter table public.category_option_groups  enable row level security;
alter table public.dining_tables           enable row level security;
alter table public.orders                  enable row level security;
alter table public.order_items             enable row level security;
alter table public.order_item_options      enable row level security;

-- Supabase concede por defecto privilegios amplios: los retiramos y damos solo lo necesario.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant select, update                 on public.businesses             to authenticated;
grant select                         on public.business_members       to authenticated;
grant select, insert, update, delete on public.categories             to authenticated;
grant select, insert, update, delete on public.products               to authenticated;
grant select, insert, update, delete on public.combo_items            to authenticated;
grant select, insert, update, delete on public.option_groups          to authenticated;
grant select, insert, update, delete on public.options                to authenticated;
grant select, insert, update, delete on public.product_option_groups  to authenticated;
grant select, insert, update, delete on public.category_option_groups to authenticated;
grant select, insert, update, delete on public.dining_tables          to authenticated;
grant select                         on public.orders                 to authenticated;
grant update (status)                on public.orders                 to authenticated;  -- solo el estado
grant select                         on public.order_items            to authenticated;
grant select                         on public.order_item_options     to authenticated;

grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.new_table_token() to authenticated;

-- El negocio: los miembros lo ven y lo configuran (no pueden tocar el contador de pedidos)
create policy "members read business"   on public.businesses for select to authenticated using (public.is_member(id));
create policy "members update business" on public.businesses for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
revoke update on public.businesses from authenticated;
grant update (name, description, logo_url, address, phone, whatsapp, instagram,
              show_bs, exchange_rate, primary_color, theme) on public.businesses to authenticated;

create policy "members read memberships" on public.business_members for select to authenticated
  using (user_id = auth.uid() or public.is_member(business_id));

-- Tablas con business_id: acceso total para miembros de ese negocio
create policy "members manage categories"     on public.categories     for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "members manage products"       on public.products       for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "members manage option groups"  on public.option_groups  for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "members manage tables"         on public.dining_tables  for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "members manage product groups" on public.product_option_groups  for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));
create policy "members manage category groups" on public.category_option_groups for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy "members manage options" on public.options for all to authenticated
  using (exists (select 1 from public.option_groups g where g.id = group_id and public.is_member(g.business_id)))
  with check (exists (select 1 from public.option_groups g where g.id = group_id and public.is_member(g.business_id)));

create policy "members manage combo items" on public.combo_items for all to authenticated
  using (exists (select 1 from public.products p where p.id = combo_product_id and public.is_member(p.business_id)))
  with check (exists (select 1 from public.products p where p.id = combo_product_id and public.is_member(p.business_id)));

create policy "members read orders"   on public.orders for select to authenticated using (public.is_member(business_id));
create policy "members update orders" on public.orders for update to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy "members read order items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and public.is_member(o.business_id)));

create policy "members read order item options" on public.order_item_options for select to authenticated
  using (exists (
    select 1 from public.order_items i join public.orders o on o.id = i.order_id
    where i.id = order_item_id and public.is_member(o.business_id)
  ));

-- ---------------------------------------------------------------------------
-- Grupos de opciones aplicables a un producto (propios + de su categoría)
-- ---------------------------------------------------------------------------
create or replace function public.product_group_ids(p_product_id uuid, p_category_id uuid)
returns table (group_id uuid, ord integer)
language sql
stable
set search_path = ''
as $$
  select x.group_id, (row_number() over (order by x.src, x.sort_order, g.sort_order))::integer
  from (
    select distinct on (u.group_id) u.group_id, u.src, u.sort_order
    from (
      select pog.group_id, 0 as src, pog.sort_order from public.product_option_groups pog where pog.product_id = p_product_id
      union all
      select cog.group_id, 1 as src, cog.sort_order from public.category_option_groups cog where cog.category_id = p_category_id
    ) u
    order by u.group_id, u.src
  ) x
  join public.option_groups g on g.id = x.group_id and g.active;
$$;

-- ---------------------------------------------------------------------------
-- API PÚBLICA 1: get_menu(token)
-- Todo el menú de la mesa en una sola respuesta.
-- ---------------------------------------------------------------------------
create or replace function public.get_menu(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_table    public.dining_tables;
  v_business public.businesses;
  v_result   jsonb;
begin
  if p_token is null or p_token !~ '^[a-z0-9]{8,32}$' then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_table from public.dining_tables t where t.qr_token = p_token and t.active;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_business from public.businesses b where b.id = v_table.business_id and b.active;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'description', v_business.description,
      'logo_url', v_business.logo_url,
      'address', v_business.address,
      'phone', v_business.phone,
      'whatsapp', v_business.whatsapp,
      'instagram', v_business.instagram,
      'show_bs', v_business.show_bs,
      'exchange_rate', v_business.exchange_rate,
      'primary_color', v_business.primary_color
    ),
    'table', jsonb_build_object('number', v_table.number, 'label', v_table.label),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'emoji', c.emoji, 'image_url', c.image_url
      ) order by c.sort_order, c.name)
      from public.categories c
      where c.business_id = v_business.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'category_id', p.category_id,
        'type', p.type,
        'name', p.name,
        'description', p.description,
        'image_url', p.image_url,
        'price_usd', p.price_usd,
        'available', p.available,
        'featured', p.featured,
        'upsell', p.upsell,
        'group_ids', coalesce((
          select jsonb_agg(pg.group_id order by pg.ord)
          from public.product_group_ids(p.id, p.category_id) pg
        ), '[]'::jsonb),
        'combo_items', coalesce((
          select jsonb_agg(jsonb_build_object('label', ci.label, 'quantity', ci.quantity) order by ci.sort_order)
          from public.combo_items ci where ci.combo_product_id = p.id
        ), '[]'::jsonb)
      ) order by c.sort_order, p.sort_order, p.name)
      from public.products p
      join public.categories c on c.id = p.category_id and c.active
      where p.business_id = v_business.id and p.active
    ), '[]'::jsonb),
    'option_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'selection', g.selection,
        'min_select', g.min_select,
        'max_select', g.max_select,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', o.id, 'name', o.name, 'price_delta_usd', o.price_delta_usd
          ) order by o.sort_order, o.name)
          from public.options o where o.group_id = g.id and o.available
        ), '[]'::jsonb)
      ) order by g.sort_order, g.name)
      from public.option_groups g
      where g.business_id = v_business.id and g.active
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- API PÚBLICA 2: create_order(token, items, notes)
-- p_items: [{ "product_id": uuid, "quantity": 1..20, "option_ids": [uuid…] }, …]
-- Recalcula TODO con precios de la base de datos. Errores como códigos:
--   TABLE_NOT_FOUND · INVALID_CART · ITEMS_UNAVAILABLE (detail = ids) · RATE_LIMITED
-- ---------------------------------------------------------------------------
create or replace function public.create_order(p_token text, p_items jsonb, p_notes text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_uuid        constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_table       public.dining_tables;
  v_business    public.businesses;
  v_notes       text;
  v_item        jsonb;
  v_opt         jsonb;
  v_qty         integer;
  v_product     public.products;
  v_option_ids  uuid[];
  v_unavailable text[] := '{}';
  v_lines       jsonb := '[]'::jsonb;
  v_line_opts   jsonb;
  v_opt_total   numeric(12,2);
  v_subtotal    numeric(12,2) := 0;
  v_extras      numeric(12,2) := 0;
  v_number      integer;
  v_code        text;
  v_order_id    uuid;
  v_item_id     uuid;
  v_created     timestamptz;
  v_bad         integer;
  v_line        jsonb;
  v_idx         integer := 0;
begin
  -- 1. Mesa
  if p_token is null or p_token !~ '^[a-z0-9]{8,32}$' then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_table from public.dining_tables t where t.qr_token = p_token and t.active;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;
  -- Bloquea el negocio: serializa la numeración de pedidos
  select * into v_business from public.businesses b where b.id = v_table.business_id and b.active for update;
  if not found then
    raise exception 'TABLE_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 2. Forma del carrito y notas
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 280 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;

  -- 3. Límite de abuso: máximo 5 pedidos por mesa cada 2 minutos
  if (select count(*) from public.orders o
      where o.table_id = v_table.id and o.created_at > now() - interval '2 minutes') >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 4. Cada línea
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'product_id', '') !~ c_uuid
       or jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or (v_item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    -- Opciones (opcional): arreglo de uuids sin repetir, máximo 20
    v_option_ids := '{}';
    if v_item ? 'option_ids' and jsonb_typeof(v_item->'option_ids') <> 'null' then
      if jsonb_typeof(v_item->'option_ids') <> 'array' or jsonb_array_length(v_item->'option_ids') > 20 then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
      for v_opt in select value from jsonb_array_elements(v_item->'option_ids') loop
        if jsonb_typeof(v_opt) <> 'string' or (v_opt #>> '{}') !~ c_uuid then
          raise exception 'INVALID_CART' using errcode = 'P0001';
        end if;
        v_option_ids := array_append(v_option_ids, (v_opt #>> '{}')::uuid);
      end loop;
      if cardinality(v_option_ids) <> (select count(distinct x) from unnest(v_option_ids) x) then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
    end if;

    -- Producto: debe ser de este negocio, visible y de una categoría visible
    select p.* into v_product
    from public.products p
    join public.categories c on c.id = p.category_id and c.active
    where p.id = (v_item->>'product_id')::uuid
      and p.business_id = v_business.id
      and p.active;
    if not found or not v_product.available then
      v_unavailable := array_append(v_unavailable, v_item->>'product_id');
      continue;
    end if;

    -- Toda opción elegida debe pertenecer a un grupo aplicable a este producto
    select count(*) into v_bad
    from unnest(v_option_ids) oid
    where not exists (
      select 1 from public.options o
      join public.product_group_ids(v_product.id, v_product.category_id) pg on pg.group_id = o.group_id
      where o.id = oid
    );
    if v_bad > 0 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    -- Opciones agotadas
    if exists (select 1 from public.options o where o.id = any(v_option_ids) and not o.available) then
      v_unavailable := v_unavailable || (select array_agg(o.id::text) from public.options o
                                         where o.id = any(v_option_ids) and not o.available);
      continue;
    end if;

    -- Reglas de cada grupo aplicable (mínimo / máximo)
    if exists (
      select 1
      from public.product_group_ids(v_product.id, v_product.category_id) pg
      join public.option_groups g on g.id = pg.group_id
      where (select count(*) from public.options o where o.group_id = g.id and o.id = any(v_option_ids))
            not between g.min_select and g.max_select
    ) then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    -- Precios desde la base de datos
    select coalesce(jsonb_agg(jsonb_build_object(
             'option_id', o.id, 'group_name', g.name, 'option_name', o.name, 'price_delta_usd', o.price_delta_usd
           ) order by g.sort_order, o.sort_order), '[]'::jsonb),
           coalesce(sum(o.price_delta_usd), 0)
      into v_line_opts, v_opt_total
    from public.options o
    join public.option_groups g on g.id = o.group_id
    where o.id = any(v_option_ids);

    v_subtotal := v_subtotal + v_product.price_usd * v_qty;
    v_extras   := v_extras + v_opt_total * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price_usd', v_product.price_usd + v_opt_total,
      'base_price_usd', v_product.price_usd,
      'quantity', v_qty,
      'line_total_usd', (v_product.price_usd + v_opt_total) * v_qty,
      'options', v_line_opts
    ));
  end loop;

  if cardinality(v_unavailable) > 0 then
    raise exception 'ITEMS_UNAVAILABLE' using errcode = 'P0001',
      detail = array_to_string(array(select distinct x from unnest(v_unavailable) x), ',');
  end if;

  -- 5. Número y código humano: M7-0042
  v_number := v_business.next_order_number;
  update public.businesses set next_order_number = next_order_number + 1 where id = v_business.id;
  v_code := 'M' || v_table.number || '-' || lpad(v_number::text, greatest(4, char_length(v_number::text)), '0');

  -- 6. Guardar
  insert into public.orders (business_id, table_id, table_number, order_number, code, status,
                             subtotal_usd, extras_usd, total_usd, exchange_rate, total_bs, notes)
  values (v_business.id, v_table.id, v_table.number, v_number, v_code, 'pending',
          v_subtotal, v_extras, v_subtotal + v_extras, v_business.exchange_rate,
          round((v_subtotal + v_extras) * v_business.exchange_rate, 2), v_notes)
  returning id, created_at into v_order_id, v_created;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;
    insert into public.order_items (order_id, product_id, product_name, unit_price_usd, quantity, line_total_usd, sort_order)
    values (v_order_id, (v_line->>'product_id')::uuid, v_line->>'product_name',
            (v_line->>'unit_price_usd')::numeric, (v_line->>'quantity')::integer,
            (v_line->>'line_total_usd')::numeric, v_idx)
    returning id into v_item_id;

    insert into public.order_item_options (order_item_id, option_id, group_name, option_name, price_delta_usd)
    select v_item_id, (o->>'option_id')::uuid, o->>'group_name', o->>'option_name', (o->>'price_delta_usd')::numeric
    from jsonb_array_elements(v_line->'options') o;
  end loop;

  -- 7. Respuesta: todo lo necesario para el mensaje de WhatsApp
  return jsonb_build_object(
    'code', v_code,
    'order_number', v_number,
    'created_at', v_created,
    'table_number', v_table.number,
    'subtotal_usd', v_subtotal,
    'extras_usd', v_extras,
    'total_usd', v_subtotal + v_extras,
    'exchange_rate', v_business.exchange_rate,
    'show_bs', v_business.show_bs,
    'total_bs', round((v_subtotal + v_extras) * v_business.exchange_rate, 2),
    'notes', v_notes,
    'items', (select jsonb_agg(l - 'product_id' - 'base_price_usd') from jsonb_array_elements(v_lines) l)
  );
end;
$$;

revoke all on function public.product_group_ids(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_menu(text) from public;
revoke all on function public.create_order(text, jsonb, text) from public;
grant execute on function public.get_menu(text) to anon, authenticated;
grant execute on function public.create_order(text, jsonb, text) to anon, authenticated;


-- ───── migrations/20261007000002_storage.sql ─────
-- =============================================================================
-- MesaQR — Storage para fotos del menú y logos
-- Lectura pública. Escritura solo para miembros del negocio, dentro de su carpeta:
--   menu-images/{business_id}/archivo.webp
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_business_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_folder::uuid;
  end if;
  return null;
end;
$$;
revoke all on function public.storage_business_id(text) from public, anon;
grant execute on function public.storage_business_id(text) to authenticated;

create policy "menu images: members insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));

create policy "menu images: members update" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));

create policy "menu images: members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));


-- ───── migrations/20261007000003_menu_por_enlace.sql ─────
-- =============================================================================
-- MesaQR — Menú genérico por ENLACE ÚNICO (sin QR ni mesas)
-- El cliente abre un solo enlace, arma su pedido e indica nombre, tipo de
-- entrega (para llevar / delivery / comer en el local) y forma de pago.
-- La tabla dining_tables queda sin uso (reservada por si se vuelve al modo mesa).
-- =============================================================================

-- ─── Configuración del negocio ───
alter table public.businesses
  add column payment_methods text[] not null default array['Efectivo (USD)', 'Pago móvil', 'Punto de venta', 'Zelle']
    check (cardinality(payment_methods) <= 8),
  add column pickup_enabled   boolean not null default true,
  add column delivery_enabled boolean not null default true,
  add column dine_in_enabled  boolean not null default true;

grant update (payment_methods, pickup_enabled, delivery_enabled, dine_in_enabled) on public.businesses to authenticated;

-- ─── Datos del cliente en el pedido ───
alter table public.orders alter column table_number drop not null;
alter table public.orders
  add column customer_name  text check (char_length(customer_name) between 1 and 60),
  add column customer_phone text check (char_length(customer_phone) <= 30),
  add column order_type     text check (order_type in ('pickup', 'delivery', 'dine_in')),
  add column address        text check (char_length(address) <= 200),
  add column payment_method text check (char_length(payment_method) <= 40);

create index orders_business_number_idx on public.orders (business_id, order_number desc);

-- ─── Las funciones por mesa quedan sin acceso público (no se borran) ───
revoke all on function public.get_menu(text) from public, anon, authenticated;
revoke all on function public.create_order(text, jsonb, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- API PÚBLICA 1: get_public_menu(slug) — todo el menú en una sola respuesta
-- ---------------------------------------------------------------------------
create or replace function public.get_public_menu(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_business from public.businesses b where b.slug = p_slug and b.active;
  if not found then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'description', v_business.description,
      'logo_url', v_business.logo_url,
      'address', v_business.address,
      'phone', v_business.phone,
      'whatsapp', v_business.whatsapp,
      'instagram', v_business.instagram,
      'show_bs', v_business.show_bs,
      'exchange_rate', v_business.exchange_rate,
      'primary_color', v_business.primary_color,
      'payment_methods', to_jsonb(v_business.payment_methods),
      'order_types', to_jsonb(array_remove(array[
        case when v_business.pickup_enabled then 'pickup' end,
        case when v_business.delivery_enabled then 'delivery' end,
        case when v_business.dine_in_enabled then 'dine_in' end
      ], null))
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'emoji', c.emoji, 'image_url', c.image_url)
                       order by c.sort_order, c.name)
      from public.categories c
      where c.business_id = v_business.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'category_id', p.category_id,
        'type', p.type,
        'name', p.name,
        'description', p.description,
        'image_url', p.image_url,
        'price_usd', p.price_usd,
        'available', p.available,
        'featured', p.featured,
        'upsell', p.upsell,
        'group_ids', coalesce((
          select jsonb_agg(pg.group_id order by pg.ord)
          from public.product_group_ids(p.id, p.category_id) pg
        ), '[]'::jsonb),
        'combo_items', coalesce((
          select jsonb_agg(jsonb_build_object('label', ci.label, 'quantity', ci.quantity) order by ci.sort_order)
          from public.combo_items ci where ci.combo_product_id = p.id
        ), '[]'::jsonb)
      ) order by c.sort_order, p.sort_order, p.name)
      from public.products p
      join public.categories c on c.id = p.category_id and c.active
      where p.business_id = v_business.id and p.active
    ), '[]'::jsonb),
    'option_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'selection', g.selection,
        'min_select', g.min_select,
        'max_select', g.max_select,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'price_delta_usd', o.price_delta_usd)
                           order by o.sort_order, o.name)
          from public.options o where o.group_id = g.id and o.available
        ), '[]'::jsonb)
      ) order by g.sort_order, g.name)
      from public.option_groups g
      where g.business_id = v_business.id and g.active
    ), '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- API PÚBLICA 2: create_public_order(slug, items, customer, notes)
-- p_items:    [{ "product_id": uuid, "quantity": 1..20, "option_ids": [uuid…] }, …]
-- p_customer: { "name": "Ana", "phone": "0412…", "type": "pickup|delivery|dine_in",
--               "address": "… (obligatoria en delivery)", "payment": "Pago móvil" }
-- Recalcula TODO con precios de la base de datos. Errores como códigos:
--   BUSINESS_NOT_FOUND · INVALID_CART · INVALID_CUSTOMER · ITEMS_UNAVAILABLE (detail = ids) · RATE_LIMITED
-- ---------------------------------------------------------------------------
create or replace function public.create_public_order(p_slug text, p_items jsonb, p_customer jsonb, p_notes text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_uuid        constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_business    public.businesses;
  v_notes       text;
  v_name        text;
  v_phone       text;
  v_type        text;
  v_address     text;
  v_payment     text;
  v_item        jsonb;
  v_opt         jsonb;
  v_qty         integer;
  v_product     public.products;
  v_option_ids  uuid[];
  v_unavailable text[] := '{}';
  v_lines       jsonb := '[]'::jsonb;
  v_line_opts   jsonb;
  v_opt_total   numeric(12,2);
  v_subtotal    numeric(12,2) := 0;
  v_extras      numeric(12,2) := 0;
  v_number      integer;
  v_code        text;
  v_order_id    uuid;
  v_item_id     uuid;
  v_created     timestamptz;
  v_bad         integer;
  v_line        jsonb;
  v_idx         integer := 0;
begin
  -- 1. Negocio (bloqueado: serializa la numeración de pedidos)
  if p_slug is null or p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_business from public.businesses b where b.slug = p_slug and b.active for update;
  if not found then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 2. Cliente
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'INVALID_CUSTOMER' using errcode = 'P0001';
  end if;
  v_name    := nullif(btrim(coalesce(p_customer->>'name', '')), '');
  v_phone   := nullif(btrim(coalesce(p_customer->>'phone', '')), '');
  v_type    := p_customer->>'type';
  v_address := nullif(btrim(coalesce(p_customer->>'address', '')), '');
  v_payment := nullif(btrim(coalesce(p_customer->>'payment', '')), '');
  if v_name is null or char_length(v_name) > 60
     or (v_phone is not null and v_phone !~ '^[0-9+() -]{7,30}$')
     or v_type is null
     or not ((v_type = 'pickup' and v_business.pickup_enabled)
          or (v_type = 'delivery' and v_business.delivery_enabled)
          or (v_type = 'dine_in' and v_business.dine_in_enabled))
     or (v_type = 'delivery' and (v_address is null or char_length(v_address) < 5))
     or (v_address is not null and char_length(v_address) > 200)
     or (cardinality(v_business.payment_methods) > 0 and (v_payment is null or not v_payment = any(v_business.payment_methods)))
  then
    raise exception 'INVALID_CUSTOMER' using errcode = 'P0001';
  end if;
  if v_type <> 'delivery' then
    v_address := null;
  end if;

  -- 3. Forma del carrito y notas
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 280 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;

  -- 4. Límite de abuso: máximo 20 pedidos por negocio por minuto
  if (select count(*) from public.orders o
      where o.business_id = v_business.id and o.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 5. Cada línea (mismas reglas que en el modo mesa)
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'product_id', '') !~ c_uuid
       or jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or (v_item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    v_option_ids := '{}';
    if v_item ? 'option_ids' and jsonb_typeof(v_item->'option_ids') <> 'null' then
      if jsonb_typeof(v_item->'option_ids') <> 'array' or jsonb_array_length(v_item->'option_ids') > 20 then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
      for v_opt in select value from jsonb_array_elements(v_item->'option_ids') loop
        if jsonb_typeof(v_opt) <> 'string' or (v_opt #>> '{}') !~ c_uuid then
          raise exception 'INVALID_CART' using errcode = 'P0001';
        end if;
        v_option_ids := array_append(v_option_ids, (v_opt #>> '{}')::uuid);
      end loop;
      if cardinality(v_option_ids) <> (select count(distinct x) from unnest(v_option_ids) x) then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
    end if;

    select p.* into v_product
    from public.products p
    join public.categories c on c.id = p.category_id and c.active
    where p.id = (v_item->>'product_id')::uuid
      and p.business_id = v_business.id
      and p.active;
    if not found or not v_product.available then
      v_unavailable := array_append(v_unavailable, v_item->>'product_id');
      continue;
    end if;

    select count(*) into v_bad
    from unnest(v_option_ids) oid
    where not exists (
      select 1 from public.options o
      join public.product_group_ids(v_product.id, v_product.category_id) pg on pg.group_id = o.group_id
      where o.id = oid
    );
    if v_bad > 0 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    if exists (select 1 from public.options o where o.id = any(v_option_ids) and not o.available) then
      v_unavailable := v_unavailable || (select array_agg(o.id::text) from public.options o
                                         where o.id = any(v_option_ids) and not o.available);
      continue;
    end if;

    if exists (
      select 1
      from public.product_group_ids(v_product.id, v_product.category_id) pg
      join public.option_groups g on g.id = pg.group_id
      where (select count(*) from public.options o where o.group_id = g.id and o.id = any(v_option_ids))
            not between g.min_select and g.max_select
    ) then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
             'option_id', o.id, 'group_name', g.name, 'option_name', o.name, 'price_delta_usd', o.price_delta_usd
           ) order by g.sort_order, o.sort_order), '[]'::jsonb),
           coalesce(sum(o.price_delta_usd), 0)
      into v_line_opts, v_opt_total
    from public.options o
    join public.option_groups g on g.id = o.group_id
    where o.id = any(v_option_ids);

    v_subtotal := v_subtotal + v_product.price_usd * v_qty;
    v_extras   := v_extras + v_opt_total * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price_usd', v_product.price_usd + v_opt_total,
      'quantity', v_qty,
      'line_total_usd', (v_product.price_usd + v_opt_total) * v_qty,
      'options', v_line_opts
    ));
  end loop;

  if cardinality(v_unavailable) > 0 then
    raise exception 'ITEMS_UNAVAILABLE' using errcode = 'P0001',
      detail = array_to_string(array(select distinct x from unnest(v_unavailable) x), ',');
  end if;

  -- 6. Número y código humano: #0042
  v_number := v_business.next_order_number;
  update public.businesses set next_order_number = next_order_number + 1 where id = v_business.id;
  v_code := lpad(v_number::text, greatest(4, char_length(v_number::text)), '0');

  -- 7. Guardar
  insert into public.orders (business_id, order_number, code, status, subtotal_usd, extras_usd, total_usd,
                             exchange_rate, total_bs, notes, customer_name, customer_phone, order_type, address, payment_method)
  values (v_business.id, v_number, v_code, 'pending', v_subtotal, v_extras, v_subtotal + v_extras,
          v_business.exchange_rate, round((v_subtotal + v_extras) * v_business.exchange_rate, 2), v_notes,
          v_name, v_phone, v_type, v_address, v_payment)
  returning id, created_at into v_order_id, v_created;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;
    insert into public.order_items (order_id, product_id, product_name, unit_price_usd, quantity, line_total_usd, sort_order)
    values (v_order_id, (v_line->>'product_id')::uuid, v_line->>'product_name',
            (v_line->>'unit_price_usd')::numeric, (v_line->>'quantity')::integer,
            (v_line->>'line_total_usd')::numeric, v_idx)
    returning id into v_item_id;

    insert into public.order_item_options (order_item_id, option_id, group_name, option_name, price_delta_usd)
    select v_item_id, (o->>'option_id')::uuid, o->>'group_name', o->>'option_name', (o->>'price_delta_usd')::numeric
    from jsonb_array_elements(v_line->'options') o;
  end loop;

  -- 8. Respuesta: todo lo necesario para el mensaje de WhatsApp
  return jsonb_build_object(
    'code', v_code,
    'order_number', v_number,
    'created_at', v_created,
    'customer', jsonb_build_object('name', v_name, 'phone', v_phone, 'type', v_type, 'address', v_address, 'payment', v_payment),
    'subtotal_usd', v_subtotal,
    'extras_usd', v_extras,
    'total_usd', v_subtotal + v_extras,
    'exchange_rate', v_business.exchange_rate,
    'show_bs', v_business.show_bs,
    'total_bs', round((v_subtotal + v_extras) * v_business.exchange_rate, 2),
    'notes', v_notes,
    'items', (select jsonb_agg(l - 'product_id') from jsonb_array_elements(v_lines) l)
  );
end;
$$;

revoke all on function public.get_public_menu(text) from public;
revoke all on function public.create_public_order(text, jsonb, jsonb, text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated;
grant execute on function public.create_public_order(text, jsonb, jsonb, text) to anon, authenticated;


-- ───── migrations/20261007000004_experiencia_v2.sql ─────
-- =============================================================================
-- MesaQR V2 — experiencia de pedido
--  · Etiquetas editoriales por producto (Recomendado, Especial de la casa, Nuevo, Oferta, Favorito)
--    → nunca estadísticas inventadas.
--  · "Antojos" para "¿No sabes qué pedir?" (contundente, queso, tocineta, picante, para compartir).
--    "Económico" se calcula por precio en la app.
--  · Precio anterior (para ofertas: el ahorro solo se muestra si existe y es mayor).
--  · Combo sugerido: al agregar un producto se ofrece convertirlo en un combo configurado.
--  · Nota por producto en el pedido ("sin cebolla", "poca salsa").
-- =============================================================================

alter table public.products
  add column badges   text[] not null default '{}'
    check (badges <@ array['recomendado', 'especial', 'nuevo', 'oferta', 'favorito']::text[]),
  add column cravings text[] not null default '{}'
    check (cravings <@ array['contundente', 'queso', 'tocineta', 'picante', 'compartir']::text[]),
  add column compare_at_price_usd numeric(10,2)
    check (compare_at_price_usd is null or (compare_at_price_usd > 0 and compare_at_price_usd < 100000)),
  add column combo_upgrade_id uuid,
  add constraint products_combo_upgrade_fk foreign key (combo_upgrade_id, business_id)
    references public.products (id, business_id) on delete set null (combo_upgrade_id),
  add constraint products_combo_not_self check (combo_upgrade_id is null or combo_upgrade_id <> id);

create index products_combo_upgrade_idx on public.products (combo_upgrade_id) where combo_upgrade_id is not null;

alter table public.order_items
  add column notes text check (char_length(notes) <= 140);

-- ---------------------------------------------------------------------------
-- API pública actualizada (misma firma: el menú publicado sigue funcionando)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_menu(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_business public.businesses;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_business from public.businesses b where b.slug = p_slug and b.active;
  if not found then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name,
      'description', v_business.description,
      'logo_url', v_business.logo_url,
      'address', v_business.address,
      'phone', v_business.phone,
      'whatsapp', v_business.whatsapp,
      'instagram', v_business.instagram,
      'show_bs', v_business.show_bs,
      'exchange_rate', v_business.exchange_rate,
      'primary_color', v_business.primary_color,
      'payment_methods', to_jsonb(v_business.payment_methods),
      'order_types', to_jsonb(array_remove(array[
        case when v_business.pickup_enabled then 'pickup' end,
        case when v_business.delivery_enabled then 'delivery' end,
        case when v_business.dine_in_enabled then 'dine_in' end
      ], null))
    ),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'emoji', c.emoji, 'image_url', c.image_url)
                       order by c.sort_order, c.name)
      from public.categories c
      where c.business_id = v_business.id and c.active
    ), '[]'::jsonb),
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'category_id', p.category_id,
        'type', p.type,
        'name', p.name,
        'description', p.description,
        'image_url', p.image_url,
        'price_usd', p.price_usd,
        'available', p.available,
        'featured', p.featured,
        'upsell', p.upsell,
        'badges', to_jsonb(p.badges),
        'cravings', to_jsonb(p.cravings),
        'compare_at_price_usd', p.compare_at_price_usd,
        'combo_upgrade_id', p.combo_upgrade_id,
        'group_ids', coalesce((
          select jsonb_agg(pg.group_id order by pg.ord)
          from public.product_group_ids(p.id, p.category_id) pg
        ), '[]'::jsonb),
        'combo_items', coalesce((
          select jsonb_agg(jsonb_build_object('label', ci.label, 'quantity', ci.quantity) order by ci.sort_order)
          from public.combo_items ci where ci.combo_product_id = p.id
        ), '[]'::jsonb)
      ) order by c.sort_order, p.sort_order, p.name)
      from public.products p
      join public.categories c on c.id = p.category_id and c.active
      where p.business_id = v_business.id and p.active
    ), '[]'::jsonb),
    'option_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'selection', g.selection,
        'min_select', g.min_select,
        'max_select', g.max_select,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'price_delta_usd', o.price_delta_usd)
                           order by o.sort_order, o.name)
          from public.options o where o.group_id = g.id and o.available
        ), '[]'::jsonb)
      ) order by g.sort_order, g.name)
      from public.option_groups g
      where g.business_id = v_business.id and g.active
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_public_order(p_slug text, p_items jsonb, p_customer jsonb, p_notes text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  c_uuid        constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
  v_business    public.businesses;
  v_notes       text;
  v_name        text;
  v_phone       text;
  v_type        text;
  v_address     text;
  v_payment     text;
  v_item        jsonb;
  v_opt         jsonb;
  v_qty         integer;
  v_item_note   text;
  v_product     public.products;
  v_option_ids  uuid[];
  v_unavailable text[] := '{}';
  v_lines       jsonb := '[]'::jsonb;
  v_line_opts   jsonb;
  v_opt_total   numeric(12,2);
  v_subtotal    numeric(12,2) := 0;
  v_extras      numeric(12,2) := 0;
  v_number      integer;
  v_code        text;
  v_order_id    uuid;
  v_item_id     uuid;
  v_created     timestamptz;
  v_bad         integer;
  v_line        jsonb;
  v_idx         integer := 0;
begin
  -- 1. Negocio (bloqueado: serializa la numeración de pedidos)
  if p_slug is null or p_slug !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into v_business from public.businesses b where b.slug = p_slug and b.active for update;
  if not found then
    raise exception 'BUSINESS_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- 2. Cliente
  if p_customer is null or jsonb_typeof(p_customer) <> 'object' then
    raise exception 'INVALID_CUSTOMER' using errcode = 'P0001';
  end if;
  v_name    := nullif(btrim(coalesce(p_customer->>'name', '')), '');
  v_phone   := nullif(btrim(coalesce(p_customer->>'phone', '')), '');
  v_type    := p_customer->>'type';
  v_address := nullif(btrim(coalesce(p_customer->>'address', '')), '');
  v_payment := nullif(btrim(coalesce(p_customer->>'payment', '')), '');
  if v_name is null or char_length(v_name) > 60
     or (v_phone is not null and v_phone !~ '^[0-9+() -]{7,30}$')
     or v_type is null
     or not ((v_type = 'pickup' and v_business.pickup_enabled)
          or (v_type = 'delivery' and v_business.delivery_enabled)
          or (v_type = 'dine_in' and v_business.dine_in_enabled))
     or (v_type = 'delivery' and (v_address is null or char_length(v_address) < 5))
     or (v_address is not null and char_length(v_address) > 200)
     or (cardinality(v_business.payment_methods) > 0 and (v_payment is null or not v_payment = any(v_business.payment_methods)))
  then
    raise exception 'INVALID_CUSTOMER' using errcode = 'P0001';
  end if;
  if v_type <> 'delivery' then
    v_address := null;
  end if;

  -- 3. Forma del carrito y notas
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;
  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 280 then
    raise exception 'INVALID_CART' using errcode = 'P0001';
  end if;

  -- 4. Límite de abuso: máximo 20 pedidos por negocio por minuto
  if (select count(*) from public.orders o
      where o.business_id = v_business.id and o.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- 5. Cada línea (mismas reglas que en el modo mesa)
  for v_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(v_item) <> 'object'
       or coalesce(v_item->>'product_id', '') !~ c_uuid
       or jsonb_typeof(v_item->'quantity') is distinct from 'number'
       or (v_item->>'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 20 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    -- Nota de este producto (opcional, máx. 140)
    if v_item ? 'notes' and jsonb_typeof(v_item->'notes') not in ('string', 'null') then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;
    v_item_note := nullif(btrim(coalesce(v_item->>'notes', '')), '');
    if v_item_note is not null and char_length(v_item_note) > 140 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    v_option_ids := '{}';
    if v_item ? 'option_ids' and jsonb_typeof(v_item->'option_ids') <> 'null' then
      if jsonb_typeof(v_item->'option_ids') <> 'array' or jsonb_array_length(v_item->'option_ids') > 20 then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
      for v_opt in select value from jsonb_array_elements(v_item->'option_ids') loop
        if jsonb_typeof(v_opt) <> 'string' or (v_opt #>> '{}') !~ c_uuid then
          raise exception 'INVALID_CART' using errcode = 'P0001';
        end if;
        v_option_ids := array_append(v_option_ids, (v_opt #>> '{}')::uuid);
      end loop;
      if cardinality(v_option_ids) <> (select count(distinct x) from unnest(v_option_ids) x) then
        raise exception 'INVALID_CART' using errcode = 'P0001';
      end if;
    end if;

    select p.* into v_product
    from public.products p
    join public.categories c on c.id = p.category_id and c.active
    where p.id = (v_item->>'product_id')::uuid
      and p.business_id = v_business.id
      and p.active;
    if not found or not v_product.available then
      v_unavailable := array_append(v_unavailable, v_item->>'product_id');
      continue;
    end if;

    select count(*) into v_bad
    from unnest(v_option_ids) oid
    where not exists (
      select 1 from public.options o
      join public.product_group_ids(v_product.id, v_product.category_id) pg on pg.group_id = o.group_id
      where o.id = oid
    );
    if v_bad > 0 then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    if exists (select 1 from public.options o where o.id = any(v_option_ids) and not o.available) then
      v_unavailable := v_unavailable || (select array_agg(o.id::text) from public.options o
                                         where o.id = any(v_option_ids) and not o.available);
      continue;
    end if;

    if exists (
      select 1
      from public.product_group_ids(v_product.id, v_product.category_id) pg
      join public.option_groups g on g.id = pg.group_id
      where (select count(*) from public.options o where o.group_id = g.id and o.id = any(v_option_ids))
            not between g.min_select and g.max_select
    ) then
      raise exception 'INVALID_CART' using errcode = 'P0001';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
             'option_id', o.id, 'group_name', g.name, 'option_name', o.name, 'price_delta_usd', o.price_delta_usd
           ) order by g.sort_order, o.sort_order), '[]'::jsonb),
           coalesce(sum(o.price_delta_usd), 0)
      into v_line_opts, v_opt_total
    from public.options o
    join public.option_groups g on g.id = o.group_id
    where o.id = any(v_option_ids);

    v_subtotal := v_subtotal + v_product.price_usd * v_qty;
    v_extras   := v_extras + v_opt_total * v_qty;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'unit_price_usd', v_product.price_usd + v_opt_total,
      'quantity', v_qty,
      'line_total_usd', (v_product.price_usd + v_opt_total) * v_qty,
      'options', v_line_opts,
      'notes', v_item_note
    ));
  end loop;

  if cardinality(v_unavailable) > 0 then
    raise exception 'ITEMS_UNAVAILABLE' using errcode = 'P0001',
      detail = array_to_string(array(select distinct x from unnest(v_unavailable) x), ',');
  end if;

  -- 6. Número y código humano: #0042
  v_number := v_business.next_order_number;
  update public.businesses set next_order_number = next_order_number + 1 where id = v_business.id;
  v_code := lpad(v_number::text, greatest(4, char_length(v_number::text)), '0');

  -- 7. Guardar
  insert into public.orders (business_id, order_number, code, status, subtotal_usd, extras_usd, total_usd,
                             exchange_rate, total_bs, notes, customer_name, customer_phone, order_type, address, payment_method)
  values (v_business.id, v_number, v_code, 'pending', v_subtotal, v_extras, v_subtotal + v_extras,
          v_business.exchange_rate, round((v_subtotal + v_extras) * v_business.exchange_rate, 2), v_notes,
          v_name, v_phone, v_type, v_address, v_payment)
  returning id, created_at into v_order_id, v_created;

  for v_line in select value from jsonb_array_elements(v_lines) loop
    v_idx := v_idx + 1;
    insert into public.order_items (order_id, product_id, product_name, unit_price_usd, quantity, line_total_usd, sort_order, notes)
    values (v_order_id, (v_line->>'product_id')::uuid, v_line->>'product_name',
            (v_line->>'unit_price_usd')::numeric, (v_line->>'quantity')::integer,
            (v_line->>'line_total_usd')::numeric, v_idx, v_line->>'notes')
    returning id into v_item_id;

    insert into public.order_item_options (order_item_id, option_id, group_name, option_name, price_delta_usd)
    select v_item_id, (o->>'option_id')::uuid, o->>'group_name', o->>'option_name', (o->>'price_delta_usd')::numeric
    from jsonb_array_elements(v_line->'options') o;
  end loop;

  -- 8. Respuesta: todo lo necesario para el mensaje de WhatsApp
  return jsonb_build_object(
    'code', v_code,
    'order_number', v_number,
    'created_at', v_created,
    'customer', jsonb_build_object('name', v_name, 'phone', v_phone, 'type', v_type, 'address', v_address, 'payment', v_payment),
    'subtotal_usd', v_subtotal,
    'extras_usd', v_extras,
    'total_usd', v_subtotal + v_extras,
    'exchange_rate', v_business.exchange_rate,
    'show_bs', v_business.show_bs,
    'total_bs', round((v_subtotal + v_extras) * v_business.exchange_rate, 2),
    'notes', v_notes,
    'items', (select jsonb_agg(l - 'product_id') from jsonb_array_elements(v_lines) l)
  );
end;
$$;

revoke all on function public.get_public_menu(text) from public;
revoke all on function public.create_public_order(text, jsonb, jsonb, text) from public;
grant execute on function public.get_public_menu(text) to anon, authenticated;
grant execute on function public.create_public_order(text, jsonb, jsonb, text) to anon, authenticated;


-- ───── seed.sql ─────
-- =============================================================================
-- MesaQR — MENÚ INICIAL (tomado de los menús impresos del restaurante, oct. 2026)
-- Precios en USD tal como aparecen en el menú. Fotos referenciales de Unsplash (licencia libre).
-- Datos confirmados por el negocio (7 oct. 2026): nombre Lorenz Express,
-- WhatsApp 0424-323.01.13, tasa inicial 900 Bs./USD, precios de Granjeros.
-- La tasa se actualiza a diario desde el panel (/dashboard).
-- Se puede ejecutar más de una vez: si el negocio "lorenz-express" ya existe, no hace nada.
-- =============================================================================
do $$
declare
  b uuid;
  c_burger uuid; c_pepito uuid; c_ternerito uuid; c_polaco uuid; c_salchi uuid; c_shawarma uuid;
  c_club uuid; c_granjero uuid; c_ensalada uuid; c_racion uuid; c_kids uuid;
  g_prot_burger uuid; g_prot uuid; g_prot_igual uuid; g_quitar uuid;
  p uuid;
begin
  if exists (select 1 from public.businesses where slug = 'lorenz-express') then
    raise notice 'El negocio ya existe; no se cargan datos.';
    return;
  end if;

  insert into public.businesses (slug, name, description, address, whatsapp, show_bs, exchange_rate, exchange_rate_updated_at, primary_color)
  values ('lorenz-express', 'Lorenz Express', 'Comida rápida en Maracay.', 'Maracay, Aragua',
          '+584243230113', true, 900.0000, now(), '#D62828')
  returning id into b;

  -- ─── Categorías (orden del menú) ───
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Hamburguesas', '🍔', 1)  returning id into c_burger;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Pepitos', '🥖', 2)       returning id into c_pepito;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Terneritos', '🌭', 3)    returning id into c_ternerito;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Polacos', '🌭', 4)       returning id into c_polaco;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Salchipapas', '🍟', 5)   returning id into c_salchi;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Shawarmas', '🥙', 6)     returning id into c_shawarma;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Club House', '🥪', 7)    returning id into c_club;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Granjeros', '🍗', 8)     returning id into c_granjero;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Ensaladas', '🥗', 9)     returning id into c_ensalada;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Raciones', '🥔', 10)     returning id into c_racion;
  insert into public.categories (business_id, name, emoji, sort_order) values (b, 'Menú Kids', '🧒', 11)    returning id into c_kids;

  -- ─── Opciones ───
  -- Hamburguesas: Carne y Pollo al precio base; Crispy y Mixta +$2,50 (según la tabla del menú)
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 1) returning id into g_prot_burger;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot_burger, 'Carne', 0, 1), (g_prot_burger, 'Pollo', 0, 2),
    (g_prot_burger, 'Pollo crispy', 2.50, 3), (g_prot_burger, 'Mixta', 2.50, 4);

  -- Pepitos y Shawarma clásico: Carne o Pollo al precio base; Mixto +$2
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 2) returning id into g_prot;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot, 'Carne', 0, 1), (g_prot, 'Pollo', 0, 2), (g_prot, 'Mixto', 2.00, 3);

  -- Terneritos: Carne, Pollo o Mixto al mismo precio
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Proteína', 'single', 1, 1, 3) returning id into g_prot_igual;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_prot_igual, 'Carne', 0, 1), (g_prot_igual, 'Pollo', 0, 2), (g_prot_igual, 'Mixto', 0, 3);

  -- Quitar ingredientes (sin costo)
  insert into public.option_groups (business_id, name, selection, min_select, max_select, sort_order)
  values (b, 'Quitar ingredientes', 'multiple', 0, 4, 4) returning id into g_quitar;
  insert into public.options (group_id, name, price_delta_usd, sort_order) values
    (g_quitar, 'Sin cebolla', 0, 1), (g_quitar, 'Sin tomate', 0, 2),
    (g_quitar, 'Sin lechuga', 0, 3), (g_quitar, 'Sin salsas', 0, 4);

  insert into public.category_option_groups (category_id, group_id, business_id, sort_order) values
    (c_burger, g_prot_burger, b, 1), (c_burger, g_quitar, b, 2),
    (c_pepito, g_prot, b, 1),        (c_pepito, g_quitar, b, 2),
    (c_ternerito, g_prot_igual, b, 1), (c_ternerito, g_quitar, b, 2),
    (c_polaco, g_quitar, b, 1),
    (c_shawarma, g_quitar, b, 2),
    (c_club, g_quitar, b, 1),
    (c_granjero, g_quitar, b, 1);

  -- ─── Hamburguesas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_burger, 'Hamburguesa Clásica', 'Pan Whopper, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=640&h=480&fit=crop&auto=format&q=70', 7.50, false, 1),
    (b, c_burger, 'Hamburguesa con Queso', 'Pan Whopper, queso, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=640&h=480&fit=crop&auto=format&q=70', 8.00, false, 2),
    (b, c_burger, 'Hamburguesa con Queso y Tocineta', 'Pan Whopper, queso, tocineta, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=640&h=480&fit=crop&auto=format&q=70', 8.50, false, 3),
    (b, c_burger, 'Hamburguesa con Queso, Tocineta y Huevo', 'Pan Whopper, queso, tocineta, huevo, lechuga, tomate, cebolla, pepinillo y aderezo.', 'https://images.unsplash.com/photo-1607013251379-e6eecfffe234?w=640&h=480&fit=crop&auto=format&q=70', 9.00, true, 4);

  -- ─── Pepitos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_pepito, 'Pepito Clásico', 'Pan de 40 cm, 400 g de proteína, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1554433607-66b5efe9d304?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 1),
    (b, c_pepito, 'Pepito con Queso', 'Pan de 40 cm, 400 g de proteína, queso, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1700937314577-898450cafe35?w=640&h=480&fit=crop&auto=format&q=70', 16.00, false, 2),
    (b, c_pepito, 'Pepito con Queso y Tocineta', 'Pan de 40 cm, 400 g de proteína, queso, tocineta, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1699728088600-6d684acbeada?w=640&h=480&fit=crop&auto=format&q=70', 17.00, false, 3),
    (b, c_pepito, 'Pepito con Queso, Tocineta y Huevo', 'Pan de 40 cm, 400 g de proteína, queso, tocineta, huevo, lechuga, tomate, cebolla y salsas básicas.', 'https://images.unsplash.com/photo-1702119614788-bae35a7be313?w=640&h=480&fit=crop&auto=format&q=70', 17.00, true, 4);

  -- ─── Terneritos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_ternerito, 'Ternerito Clásico', 'Lechuga, tomate, cebolla, lluvia de queso amarillo y papitas ralladas.', 'https://images.unsplash.com/photo-1613482084286-41f25b486fa2?w=640&h=480&fit=crop&auto=format&q=70', 5.00, false, 1),
    (b, c_ternerito, 'Ternerito de la Casa', 'Lechuga, tomate, cebolla, pepinillo, lluvia de queso amarillo, tocineta, maíz y papitas ralladas.', 'https://images.unsplash.com/photo-1627054248949-21f77275a15f?w=640&h=480&fit=crop&auto=format&q=70', 7.00, true, 2);

  -- ─── Polacos ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_polaco, 'Polaco Clásico', 'Salchicha polaca, lluvia de queso amarillo, ensalada rallada, cebolla, papitas ralladas y salsas.', 'https://images.unsplash.com/photo-1599599810694-b5b37304c041?w=640&h=480&fit=crop&auto=format&q=70', 5.00, false, 1),
    (b, c_polaco, 'Polaco de la Casa', 'Salchicha polaca, lluvia de queso amarillo, tocineta, maíz, pepinillo, ensalada rallada, cebolla, papitas ralladas y salsas.', 'https://images.unsplash.com/photo-1678033382919-fa907632fdda?w=640&h=480&fit=crop&auto=format&q=70', 7.00, true, 2);

  -- ─── Salchipapas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_salchi, 'Salchipapa Clásica', 'Papas fritas, salchicha polaca, lluvia de queso amarillo y salsas.', 'https://images.unsplash.com/photo-1762284513031-3d7ad15562bc?w=640&h=480&fit=crop&auto=format&q=70', 8.50, false, 1),
    (b, c_salchi, 'Salchipapa de la Casa', 'Papas fritas, doble salchicha polaca, lluvia de queso amarillo, doble tocineta, cubos de pollo crispy y salsas.', 'https://images.unsplash.com/photo-1767065626950-8c7372c08811?w=640&h=480&fit=crop&auto=format&q=70', 12.00, true, 2);

  -- ─── Shawarmas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order)
  values (b, c_shawarma, 'Shawarma Clásico', '250 g de proteína, lechuga, tomate, cebolla, perejil y pimentón.', 'https://images.unsplash.com/photo-1719282431565-3b30bb7d2658?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 1)
  returning id into p;
  insert into public.product_option_groups (product_id, group_id, business_id, sort_order) values (p, g_prot, b, 1);
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_shawarma, 'Shawarma de la Casa (Falafel)', 'Falafel con lechuga, tomate, cebolla, perejil y pimentón. Con papas fritas.', 'https://images.unsplash.com/photo-1699728088614-7d1d4277414b?w=640&h=480&fit=crop&auto=format&q=70', 13.00, true, 2);

  -- ─── Club House (todos con papas fritas) ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_club, 'Club House Doble Pollo', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=640&h=480&fit=crop&auto=format&q=70', 13.00, false, 1),
    (b, c_club, 'Club House Doble Carne', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1712746784291-e29d5d2694d4?w=640&h=480&fit=crop&auto=format&q=70', 14.00, false, 2),
    (b, c_club, 'Club House Mixto', 'Huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1496113269490-84ffe1a410cb?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 3),
    (b, c_club, 'Club House Triple', 'Carne, pollo y pollo crispy con huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=640&h=480&fit=crop&auto=format&q=70', 17.00, false, 4),
    (b, c_club, 'Club House de la Casa', 'Lluvia de pollo crispy, ensalada César, huevo, queso, tocineta, tomate y lechuga. Con papas fritas.', 'https://images.unsplash.com/photo-1676300184084-de35d56a9a70?w=640&h=480&fit=crop&auto=format&q=70', 19.00, true, 5);

  -- ─── Granjeros ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_granjero, 'Granjero 15 cm', 'Pollo empanizado, tomate, lechuga y salsa tártara. Con papas fritas.', 'https://images.unsplash.com/photo-1705131186176-1c7cdb830815?w=640&h=480&fit=crop&auto=format&q=70', 7.00, false, 1),
    (b, c_granjero, 'Granjero 35 cm', 'Pollo empanizado, tomate, lechuga y salsa tártara. Con papas fritas.', 'https://images.unsplash.com/photo-1703219342329-fce8488cf443?w=640&h=480&fit=crop&auto=format&q=70', 15.00, false, 2);

  -- ─── Ensaladas ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, featured, sort_order) values
    (b, c_ensalada, 'Ensalada César de Pollo', 'Lechuga romana, pollo, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1782839577893-da9383e55c96?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 1),
    (b, c_ensalada, 'Ensalada César de Carne', 'Lechuga romana, carne, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1582034986517-30d163aa1da9?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 2),
    (b, c_ensalada, 'Ensalada César Mixta', 'Lechuga romana, carne y pollo, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1746211108786-ca20c8f80ecd?w=640&h=480&fit=crop&auto=format&q=70', 10.00, false, 3),
    (b, c_ensalada, 'Ensalada César de Pollo Crispy', 'Lechuga romana, pollo crispy, queso parmesano y aderezo César.', 'https://images.unsplash.com/photo-1746211224437-8340316b288d?w=640&h=480&fit=crop&auto=format&q=70', 13.00, true, 4);

  -- ─── Raciones (se sugieren para completar el pedido) ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, upsell, sort_order) values
    (b, c_racion, 'Papas Fritas + 2 Salsas', 'Ración de papas fritas con dos salsas.', 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=640&h=480&fit=crop&auto=format&q=70', 4.50, true, 1),
    (b, c_racion, 'Papas con Tocineta y Queso', 'Papas fritas con lluvia de tocineta y queso amarillo.', 'https://images.unsplash.com/photo-1639744210631-209fce3e256c?w=640&h=480&fit=crop&auto=format&q=70', 6.00, true, 2);

  -- ─── Menú Kids ───
  insert into public.products (business_id, category_id, name, description, image_url, price_usd, sort_order) values
    (b, c_kids, 'Nuggets de Pollo con Papas', 'Nuggets de pollo con papas fritas.', 'https://images.unsplash.com/photo-1627662055487-551888db3aa8?w=640&h=480&fit=crop&auto=format&q=70', 7.00, 1),
    (b, c_kids, 'Tenders de Pollo con Papas', 'Tenders de pollo con papas fritas.', 'https://images.unsplash.com/photo-1569691899455-88464f6d3ab1?w=640&h=480&fit=crop&auto=format&q=70', 7.00, 2),
    (b, c_kids, 'Hamburguesa de Carne con Queso', 'Hamburguesa infantil de carne con queso.', 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=640&h=480&fit=crop&auto=format&q=70', 4.00, 3);


  -- ─── V2: etiquetas y antojos (editables desde el panel) ───
  -- "Especial de la casa" = los productos "de la Casa" del menú impreso.
  update public.products set badges = array['especial'] where business_id = b and name ilike '%de la Casa%';
  update public.products set badges = array['recomendado']
   where business_id = b and name in ('Hamburguesa con Queso, Tocineta y Huevo', 'Pepito con Queso y Tocineta');
  -- Antojos, según los ingredientes escritos en cada producto.
  update public.products set cravings = array_remove(array[
      case when description ilike '%queso%' then 'queso' end,
      case when description ilike '%tocineta%' then 'tocineta' end,
      case when name in ('Hamburguesa con Queso, Tocineta y Huevo', 'Salchipapa de la Casa', 'Granjero 35 cm')
             or name ilike 'Pepito%' or name ilike 'Club House%' then 'contundente' end,
      case when name in ('Salchipapa de la Casa', 'Granjero 35 cm', 'Club House Triple', 'Club House de la Casa',
                         'Papas Fritas + 2 Salsas', 'Papas con Tocineta y Queso')
             or name ilike 'Pepito%' then 'compartir' end
    ]::text[], null)
   where business_id = b;

end;
$$;

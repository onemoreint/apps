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

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

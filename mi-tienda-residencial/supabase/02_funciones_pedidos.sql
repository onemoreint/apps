-- Error controlado con código para el frontend
create or replace function public._error(p_codigo text, p_mensaje text, p_extra jsonb default '{}'::jsonb)
returns jsonb language sql immutable set search_path = ''
as $$ select jsonb_build_object('ok', false, 'codigo', p_codigo, 'error', p_mensaje) || p_extra; $$;
revoke execute on function public._error(text, text, jsonb) from public, anon, authenticated;

create or replace function public._pesos(p integer)
returns text language sql immutable set search_path = ''
as $$ select '$ ' || replace(to_char(p, 'FM999G999G999'), ',', '.'); $$;
revoke execute on function public._pesos(integer) from public, anon, authenticated;

-- Resumen público de un pedido (sin nombre ni teléfono)
create or replace function public._pedido_publico(p_id uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'numero', p.numero, 'creado_en', p.creado_en,
    'tipo_entrega', p.tipo_entrega, 'torre', p.torre, 'apto', p.apto,
    'subtotal', p.subtotal, 'costo_domicilio', p.costo_domicilio, 'total', p.total,
    'total_aprobado', p.total_aprobado, 'metodo_pago', p.metodo_pago,
    'referencia_pago', p.referencia_pago, 'efectivo_con', p.efectivo_con, 'cambio', p.cambio,
    'estado_pago', p.estado_pago, 'estado_pedido', p.estado_pedido,
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', coalesce(pr.slug, ''), 'nombre', i.nombre,
                 'precio', i.precio_unitario, 'cantidad', i.cantidad, 'subtotal', i.subtotal) order by i.id)
               from public.pedido_items i left join public.productos pr on pr.id = i.producto_id
               where i.pedido_id = p.id), '[]'::jsonb),
    'historial', coalesce((select jsonb_agg(jsonb_build_object('tipo', e.tipo, 'estado', e.a, 'fecha', e.fecha) order by e.fecha)
               from public.pedido_eventos e where e.pedido_id = p.id), '[]'::jsonb)
  )
  from public.pedidos p where p.id = p_id;
$$;
revoke execute on function public._pedido_publico(uuid) from public, anon, authenticated;

/* Crea un pedido. Precios, existencias, domicilio, total y número se
   calculan AQUÍ (servidor); lo que envía el navegador solo dice qué y cuánto.
   p_items: [{"id": "<slug producto>", "cantidad": 2}, ...]
   p_cliente: {"nombre","telefono","torre","apto"}
   p_pago: {"metodo","referencia","efectivo_con"}                      */
create or replace function public.crear_pedido(
  p_tienda text, p_solicitud_id uuid, p_items jsonb, p_cliente jsonb,
  p_entrega text, p_pago jsonb, p_total_aprobado integer, p_notas text default ''
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  t public.tiendas%rowtype;
  v_existente uuid;
  v_nombre text := btrim(regexp_replace(coalesce(p_cliente->>'nombre', ''), '\s+', ' ', 'g'));
  v_tel text := regexp_replace(coalesce(p_cliente->>'telefono', ''), '\D', '', 'g');
  v_torre text := btrim(coalesce(p_cliente->>'torre', ''));
  v_apto text := upper(btrim(coalesce(p_cliente->>'apto', '')));
  v_metodo text := coalesce(p_pago->>'metodo', '');
  v_ref text := left(btrim(coalesce(p_pago->>'referencia', '')), 40);
  v_efectivo integer;
  v_item record;
  v_prod public.productos%rowtype;
  v_lineas jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_domicilio integer := 0;
  v_total integer;
  v_numero text;
  v_pedido uuid;
  v_problemas text[] := '{}';
  v_letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  select * into t from public.tiendas where slug = p_tienda and activa;
  if not found then return public._error('tienda', 'La tienda no está disponible.'); end if;

  -- Evitar duplicados: el mismo intento de compra devuelve el mismo pedido
  perform pg_advisory_xact_lock(hashtextextended(t.id::text || p_solicitud_id::text, 0));
  select id into v_existente from public.pedidos where tienda_id = t.id and solicitud_id = p_solicitud_id;
  if found then
    return jsonb_build_object('ok', true, 'repetido', true, 'pedido', public._pedido_publico(v_existente));
  end if;

  -- Datos del cliente
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 80 then return public._error('nombre', 'Escribe tu nombre.'); end if;
  if char_length(v_tel) = 12 and left(v_tel, 2) = '57' then v_tel := right(v_tel, 10); end if;
  if v_tel !~ '^3[0-9]{9}$' then return public._error('telefono', 'El celular debe tener 10 dígitos y empezar por 3.'); end if;
  if p_entrega not in ('domicilio', 'recogida') then return public._error('entrega', 'Tipo de entrega no válido.'); end if;
  if p_entrega = 'domicilio' and not t.domicilio_activo then return public._error('entrega', 'La tienda no tiene domicilio en este momento.'); end if;
  if p_entrega = 'recogida' and not t.recogida_activa then return public._error('entrega', 'La tienda no tiene recogida en este momento.'); end if;
  if p_entrega = 'domicilio' then
    if cardinality(t.torres) > 0 and not (v_torre = any (t.torres)) then return public._error('torre', 'Elige una torre válida.'); end if;
    if v_apto !~ '^[0-9A-Z-]{1,6}$' then return public._error('apto', 'Escribe tu apartamento.'); end if;
  else
    v_torre := ''; v_apto := '';
  end if;

  -- Productos: precio y existencias desde la base de datos (bloqueados para evitar sobreventa)
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 60 then
    return public._error('carrito', 'El carrito está vacío.');
  end if;
  for v_item in
    select x->>'id' as slug, sum(greatest(0, coalesce((x->>'cantidad')::integer, 0)))::integer as cantidad
    from jsonb_array_elements(p_items) x group by x->>'id' order by x->>'id'
  loop
    continue when v_item.cantidad < 1;
    select * into v_prod from public.productos
      where tienda_id = t.id and slug = v_item.slug and activo for update;
    if not found then
      v_problemas := array_append(v_problemas, 'Un producto ya no está disponible.');
    elsif v_prod.stock < v_item.cantidad then
      v_problemas := array_append(v_problemas, case when v_prod.stock = 0 then v_prod.nombre || ' se agotó.'
        else 'De ' || v_prod.nombre || ' solo quedan ' || v_prod.stock || '.' end);
    else
      v_subtotal := v_subtotal + v_prod.precio * v_item.cantidad;
      v_lineas := v_lineas || jsonb_build_object('producto_id', v_prod.id, 'nombre', v_prod.nombre,
        'precio', v_prod.precio, 'cantidad', v_item.cantidad);
    end if;
  end loop;
  if cardinality(v_problemas) > 0 then return public._error('stock', array_to_string(v_problemas, ' ')); end if;
  if jsonb_array_length(v_lineas) = 0 then return public._error('carrito', 'El carrito está vacío.'); end if;
  if v_subtotal < t.pedido_minimo then return public._error('minimo', 'El pedido mínimo es ' || public._pesos(t.pedido_minimo) || '.'); end if;
  if p_entrega = 'domicilio' and v_subtotal < t.domicilio_minimo then
    return public._error('minimo', 'El domicilio es para compras desde ' || public._pesos(t.domicilio_minimo) || '.');
  end if;

  if p_entrega = 'domicilio' and not (t.domicilio_gratis_desde > 0 and v_subtotal >= t.domicilio_gratis_desde) then
    v_domicilio := t.costo_domicilio;
  end if;
  v_total := v_subtotal + v_domicilio;

  -- El residente aprobó un monto: debe coincidir con el total real
  if p_total_aprobado is distinct from v_total then
    return public._error('total', 'El total cambió a ' || public._pesos(v_total) || '. Revísalo y apruébalo de nuevo.',
      jsonb_build_object('totalNuevo', v_total));
  end if;

  -- Pago
  if not exists (select 1 from public.metodos_pago where tienda_id = t.id and tipo = v_metodo and activo) then
    return public._error('metodo', 'Elige un método de pago válido.');
  end if;
  v_efectivo := case when v_metodo = 'efectivo' then coalesce((p_pago->>'efectivo_con')::integer, 0) else 0 end;
  if v_metodo = 'efectivo' and v_efectivo < v_total then
    return public._error('efectivo', 'El efectivo con el que pagas debe ser de al menos ' || public._pesos(v_total) || '.');
  end if;
  if v_efectivo > 10000000 then return public._error('efectivo', 'Revisa el valor en efectivo.'); end if;

  -- Número de pedido único: PREFIJO-AAMMDD-XXXX (hora de Colombia)
  loop
    v_numero := t.prefijo_pedido || '-' || to_char(now() at time zone 'America/Bogota', 'YYMMDD') || '-';
    for i in 1..4 loop
      v_numero := v_numero || substr(v_letras, 1 + floor(random() * 32)::integer, 1);
    end loop;
    exit when not exists (select 1 from public.pedidos where tienda_id = t.id and numero = v_numero);
  end loop;

  insert into public.pedidos (tienda_id, numero, solicitud_id, cliente_nombre, cliente_telefono, torre, apto,
    tipo_entrega, subtotal, costo_domicilio, total, total_aprobado, metodo_pago, referencia_pago,
    efectivo_con, cambio, estado_pago, notas)
  values (t.id, v_numero, p_solicitud_id, v_nombre, v_tel, v_torre, v_apto,
    p_entrega, v_subtotal, v_domicilio, v_total, p_total_aprobado, v_metodo,
    case when v_metodo = 'efectivo' then '' else v_ref end,
    v_efectivo, case when v_metodo = 'efectivo' then v_efectivo - v_total else 0 end,
    case when v_metodo = 'efectivo' then 'contra_entrega' else 'pendiente_verificacion' end,
    left(btrim(coalesce(p_notas, '')), 200))
  returning id into v_pedido;

  insert into public.pedido_items (pedido_id, producto_id, nombre, precio_unitario, cantidad, subtotal)
  select v_pedido, (l->>'producto_id')::uuid, l->>'nombre', (l->>'precio')::integer, (l->>'cantidad')::integer,
         (l->>'precio')::integer * (l->>'cantidad')::integer
  from jsonb_array_elements(v_lineas) l;

  update public.productos p set stock = p.stock - (l->>'cantidad')::integer, actualizado_en = now()
  from jsonb_array_elements(v_lineas) l where p.id = (l->>'producto_id')::uuid;

  insert into public.pedido_eventos (pedido_id, tipo, de, a) values
    (v_pedido, 'pedido', null, 'pendiente'),
    (v_pedido, 'pago', null, case when v_metodo = 'efectivo' then 'contra_entrega' else 'pendiente_verificacion' end);

  return jsonb_build_object('ok', true, 'pedido', public._pedido_publico(v_pedido));
end;
$$;
revoke execute on function public.crear_pedido(text, uuid, jsonb, jsonb, text, jsonb, integer, text) from public;
grant execute on function public.crear_pedido(text, uuid, jsonb, jsonb, text, jsonb, integer, text) to anon, authenticated;

-- Consulta de estado: número + últimos 4 dígitos del celular
create or replace function public.consultar_pedido(p_tienda text, p_numero text, p_ultimos4 text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_ultimos4 !~ '^[0-9]{4}$' then return null; end if;
  select p.id into v_id from public.pedidos p join public.tiendas t on t.id = p.tienda_id
  where t.slug = p_tienda and p.numero = upper(btrim(p_numero)) and right(p.cliente_telefono, 4) = p_ultimos4;
  if v_id is null then return null; end if;
  return public._pedido_publico(v_id);
end;
$$;
revoke execute on function public.consultar_pedido(text, text, text) from public;
grant execute on function public.consultar_pedido(text, text, text) to anon, authenticated;

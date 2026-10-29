-- =============================================================================
-- DULCE PEDIDO — funciones públicas y de administración
--   dp_tienda_publica(slug)          catálogo público (sin datos privados)
--   dp_crear_pedido(slug, pedido)    registra la solicitud recalculando TODO en el servidor
--   dp_aceptar_invitaciones()        convierte invitaciones por correo en membresías
--   dp_anonimizar_pedidos(tienda)    borra datos personales vencidos (Ley 1581)
--   dp_crear_tienda(...)             alta de una tienda nueva (solo administrador del servicio)
-- =============================================================================

create or replace function public.dp_tienda_publica(p_slug text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  t public.dp_tiendas;
  hoy date;
begin
  select * into t from public.dp_tiendas where slug = lower(trim(p_slug)) and activa;
  if not found then
    return null;
  end if;
  hoy := (now() at time zone t.zona_horaria)::date;

  return jsonb_build_object(
    'tienda', jsonb_build_object(
      'slug', t.slug, 'nombre', t.nombre, 'whatsapp', t.whatsapp, 'demo', t.demo,
      'dias_atencion', to_jsonb(t.dias_atencion), 'dias_max_anticipacion', t.dias_max_anticipacion,
      'franjas', to_jsonb(t.franjas), 'recogida', t.recogida, 'domicilio', t.domicilio,
      'direccion_recogida', t.direccion_recogida, 'contenido', t.contenido),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'descripcion', c.descripcion, 'orden', c.orden)
                       order by c.orden, c.nombre)
      from public.dp_categorias c
      where c.tienda_id = t.id and c.activa
        and exists (select 1 from public.dp_productos p where p.categoria_id = c.id and p.activo)
    ), '[]'::jsonb),
    'productos', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id, 'categoria_id', p.categoria_id, 'nombre', p.nombre, 'descripcion', p.descripcion,
          'precio', p.precio, 'presentacion', p.presentacion, 'fotos', to_jsonb(p.fotos),
          'disponible', p.disponible, 'destacado', p.destacado, 'nuevo', p.nuevo, 'por_encargo', p.por_encargo,
          'horas_preparacion', p.horas_preparacion, 'cantidad_minima', p.cantidad_minima,
          'sabores', to_jsonb(p.sabores), 'sabores_max', p.sabores_max,
          'ingredientes', p.ingredientes, 'alergenos', p.alergenos, 'conservacion', p.conservacion,
          'orden', p.orden,
          'variantes', coalesce((
            select jsonb_agg(jsonb_build_object('id', v.id, 'nombre', v.nombre, 'precio', v.precio, 'disponible', v.disponible)
                             order by v.orden, v.nombre)
            from public.dp_variantes v where v.producto_id = p.id
          ), '[]'::jsonb))
        order by p.orden, p.nombre)
      from public.dp_productos p
      left join public.dp_categorias c on c.id = p.categoria_id
      where p.tienda_id = t.id and p.activo and (p.categoria_id is null or c.activa)
    ), '[]'::jsonb),
    'zonas', case when t.domicilio then coalesce((
      select jsonb_agg(jsonb_build_object('id', z.id, 'nombre', z.nombre, 'tarifa', z.tarifa) order by z.orden, z.nombre)
      from public.dp_zonas z where z.tienda_id = t.id and z.activa
    ), '[]'::jsonb) else '[]'::jsonb end,
    'fechas_bloqueadas', coalesce((
      select jsonb_agg(to_char(f.fecha, 'YYYY-MM-DD') order by f.fecha)
      from public.dp_fechas_bloqueadas f where f.tienda_id = t.id and f.fecha >= hoy
    ), '[]'::jsonb),
    'ahora', to_char(now() at time zone t.zona_horaria, 'YYYY-MM-DD"T"HH24:MI')
  );
end $$;

revoke all on function public.dp_tienda_publica(text) from public, anon, authenticated;
grant execute on function public.dp_tienda_publica(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
create or replace function public.dp_crear_pedido(p_slug text, p_pedido jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.dp_tiendas;
  p public.dp_productos;
  v public.dp_variantes;
  z public.dp_zonas;
  it jsonb;
  items_in jsonb := coalesce(p_pedido -> 'items', '[]'::jsonb);
  cliente jsonb := coalesce(p_pedido -> 'cliente', '{}'::jsonb);
  entrega jsonb := coalesce(p_pedido -> 'entrega', '{}'::jsonb);
  uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_nombre text := trim(coalesce(cliente ->> 'nombre', ''));
  v_tel text := regexp_replace(coalesce(cliente ->> 'telefono', ''), '[^0-9]', '', 'g');
  v_fecha_txt text := coalesce(entrega ->> 'fecha', '');
  v_fecha date;
  v_franja text := trim(coalesce(entrega ->> 'franja', ''));
  v_modalidad text := coalesce(entrega ->> 'modalidad', '');
  v_zona_txt text := coalesce(entrega ->> 'zona_id', '');
  v_direccion text := trim(coalesce(entrega ->> 'direccion', ''));
  v_barrio text := trim(coalesce(entrega ->> 'barrio', ''));
  v_obs text := trim(coalesce(p_pedido ->> 'observaciones', ''));
  v_prod_txt text;
  v_var_txt text;
  v_sabores text[];
  v_cantidad integer;
  v_precio integer;
  v_detalle text;
  v_horas integer := 0;
  v_subtotal bigint := 0;
  v_domicilio integer;
  v_pendiente boolean := false;
  ahora timestamp;
  hoy date;
  lineas jsonb := '[]'::jsonb;
  v_pedido_id uuid;
  v_codigo text;
  v_recientes integer;
begin
  select * into t from public.dp_tiendas where slug = lower(trim(coalesce(p_slug, ''))) and activa for update;
  if not found then
    raise exception 'Esta tienda no está disponible.';
  end if;
  ahora := now() at time zone t.zona_horaria;
  hoy := ahora::date;

  -- Datos del cliente ---------------------------------------------------------
  if length(v_nombre) < 2 or length(v_nombre) > 80 then
    raise exception 'Escribe tu nombre.';
  end if;
  if length(v_tel) < 7 or length(v_tel) > 15 then
    raise exception 'Escribe un número de contacto válido.';
  end if;
  if length(v_obs) > 500 then
    raise exception 'Las observaciones pueden tener máximo 500 caracteres.';
  end if;
  if coalesce((p_pedido ->> 'acepta_datos')::boolean, false) is not true then
    raise exception 'Necesitamos tu autorización para gestionar el pedido.';
  end if;

  -- Límite anti-abuso por teléfono
  select count(*) into v_recientes from public.dp_pedidos
  where tienda_id = t.id and cliente_telefono = v_tel and creado_en > now() - interval '1 hour';
  if v_recientes >= t.limite_pedidos_hora then
    raise exception 'Ya recibimos varias solicitudes desde este número. Escríbenos directamente por WhatsApp.';
  end if;

  -- Productos: precios y reglas salen de la base de datos, nunca del navegador --
  if jsonb_typeof(items_in) <> 'array' or jsonb_array_length(items_in) = 0 then
    raise exception 'Tu carrito está vacío.';
  end if;
  if jsonb_array_length(items_in) > 40 then
    raise exception 'El pedido tiene demasiados productos.';
  end if;

  for it in select * from jsonb_array_elements(items_in) loop
    v_prod_txt := coalesce(it ->> 'producto_id', '');
    v_var_txt := nullif(coalesce(it ->> 'variante_id', ''), '');
    if v_prod_txt !~ uuid_re or (v_var_txt is not null and v_var_txt !~ uuid_re) then
      raise exception 'Hay un producto que ya no está en el catálogo.';
    end if;

    select pr.* into p from public.dp_productos pr
    left join public.dp_categorias c on c.id = pr.categoria_id
    where pr.id = v_prod_txt::uuid and pr.tienda_id = t.id and pr.activo and (pr.categoria_id is null or c.activa);
    if not found then
      raise exception 'Hay un producto que ya no está en el catálogo.';
    end if;
    if not p.disponible then
      raise exception '% está agotado por ahora.', p.nombre;
    end if;

    v := null;
    if exists (select 1 from public.dp_variantes x where x.producto_id = p.id) then
      if v_var_txt is null then
        raise exception 'Elige la presentación de %.', p.nombre;
      end if;
      select * into v from public.dp_variantes x where x.id = v_var_txt::uuid and x.producto_id = p.id;
      if not found or not v.disponible then
        raise exception 'La opción elegida de % ya no está disponible.', p.nombre;
      end if;
    elsif v_var_txt is not null then
      raise exception 'Hay un producto que cambió en el catálogo. Revisa tu carrito.';
    end if;

    if jsonb_typeof(coalesce(it -> 'sabores', '[]'::jsonb)) <> 'array' then
      raise exception 'Sabores no válidos.';
    end if;
    select coalesce(array_agg(distinct s), '{}') into v_sabores
    from jsonb_array_elements_text(coalesce(it -> 'sabores', '[]'::jsonb)) s;
    if cardinality(p.sabores) > 0 then
      if cardinality(v_sabores) = 0 then
        raise exception 'Elige el sabor de %.', p.nombre;
      end if;
      if cardinality(v_sabores) > p.sabores_max then
        raise exception 'Puedes elegir hasta % sabores para %.', p.sabores_max, p.nombre;
      end if;
      if not (v_sabores <@ p.sabores) then
        raise exception 'Uno de los sabores de % ya no está disponible.', p.nombre;
      end if;
    elsif cardinality(v_sabores) > 0 then
      raise exception 'Hay un producto que cambió en el catálogo. Revisa tu carrito.';
    end if;

    if jsonb_typeof(it -> 'cantidad') <> 'number' or (it ->> 'cantidad') !~ '^[0-9]{1,4}$' then
      raise exception 'Cantidad no válida para %.', p.nombre;
    end if;
    v_cantidad := (it ->> 'cantidad')::integer;
    if v_cantidad < p.cantidad_minima then
      raise exception 'El pedido mínimo de % es de % unidades.', p.nombre, p.cantidad_minima;
    end if;
    if v_cantidad > 999 then
      raise exception 'Cantidad no válida para %.', p.nombre;
    end if;

    v_precio := coalesce(v.precio, p.precio);
    v_detalle := concat_ws(' · ', v.nombre, nullif(array_to_string(v_sabores, ', '), ''));
    v_subtotal := v_subtotal + v_precio::bigint * v_cantidad;
    v_horas := greatest(v_horas, p.horas_preparacion);
    lineas := lineas || jsonb_build_object(
      'producto_id', p.id, 'variante_id', v.id, 'nombre', p.nombre, 'detalle', v_detalle,
      'sabores', to_jsonb(v_sabores), 'cantidad', v_cantidad, 'precio_unitario', v_precio,
      'subtotal', v_precio::bigint * v_cantidad);
  end loop;

  if v_subtotal > 2000000000 then
    raise exception 'El valor del pedido es demasiado alto; escríbenos por WhatsApp.';
  end if;

  -- Fecha -------------------------------------------------------------------
  if v_fecha_txt !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Elige una fecha válida.';
  end if;
  begin
    v_fecha := v_fecha_txt::date;
  exception when others then
    raise exception 'Elige una fecha válida.';
  end;
  if to_char(v_fecha, 'YYYY-MM-DD') <> v_fecha_txt then
    raise exception 'Elige una fecha válida.';
  end if;
  if v_fecha < hoy then
    raise exception 'Esa fecha ya pasó.';
  end if;
  if v_fecha < (ahora + make_interval(hours => v_horas))::date then
    raise exception 'No alcanzamos a prepararlo para esa fecha. Elige una fecha posterior.';
  end if;
  if v_fecha > hoy + t.dias_max_anticipacion then
    raise exception 'Todavía no recibimos pedidos para esa fecha.';
  end if;
  if cardinality(t.dias_atencion) > 0 and not (extract(dow from v_fecha)::smallint = any (t.dias_atencion)) then
    raise exception 'Ese día no atendemos.';
  end if;
  if exists (select 1 from public.dp_fechas_bloqueadas f where f.tienda_id = t.id and f.fecha = v_fecha) then
    raise exception 'Esa fecha no está disponible.';
  end if;
  if cardinality(t.franjas) > 0 then
    if not (v_franja = any (t.franjas)) then
      raise exception 'Elige una franja horaria.';
    end if;
  else
    v_franja := '';
  end if;

  -- Entrega -----------------------------------------------------------------
  if v_modalidad = 'recogida' then
    if not t.recogida then
      raise exception 'Por ahora no hay recogida; elige domicilio.';
    end if;
    v_domicilio := 0;
    v_direccion := '';
    v_barrio := '';
    z := null;
  elsif v_modalidad = 'domicilio' then
    if not t.domicilio then
      raise exception 'Por ahora no hacemos domicilios; elige recogida.';
    end if;
    if v_zona_txt !~ uuid_re then
      raise exception 'Elige tu zona de entrega.';
    end if;
    select * into z from public.dp_zonas where id = v_zona_txt::uuid and tienda_id = t.id and activa;
    if not found then
      raise exception 'Elige tu zona de entrega.';
    end if;
    if length(v_direccion) < 5 or length(v_direccion) > 200 then
      raise exception 'Escribe la dirección de entrega.';
    end if;
    if length(v_barrio) < 2 or length(v_barrio) > 80 then
      raise exception 'Escribe el barrio.';
    end if;
    v_domicilio := z.tarifa;
    v_pendiente := z.tarifa is null;
  else
    raise exception 'Elige recogida o domicilio.';
  end if;

  -- Registro ----------------------------------------------------------------
  update public.dp_tiendas set consecutivo = consecutivo + 1 where id = t.id
  returning 'DP-' || lpad(consecutivo::text, 4, '0') into v_codigo;

  insert into public.dp_pedidos (
    tienda_id, codigo, cliente_nombre, cliente_telefono, fecha_entrega, franja, modalidad,
    zona_id, zona_nombre, direccion, barrio, observaciones, subtotal, domicilio, domicilio_pendiente,
    total, autorizacion_datos_en)
  values (
    t.id, v_codigo, v_nombre, v_tel, v_fecha, v_franja, v_modalidad,
    z.id, coalesce(z.nombre, ''), v_direccion, v_barrio, v_obs, v_subtotal, v_domicilio, v_pendiente,
    v_subtotal + coalesce(v_domicilio, 0), now())
  returning id into v_pedido_id;

  insert into public.dp_pedido_items (pedido_id, tienda_id, producto_id, variante_id, nombre, detalle, sabores,
                                      cantidad, precio_unitario, subtotal)
  select v_pedido_id, t.id, (l ->> 'producto_id')::uuid, nullif(l ->> 'variante_id', '')::uuid, l ->> 'nombre',
         l ->> 'detalle', array(select jsonb_array_elements_text(l -> 'sabores')),
         (l ->> 'cantidad')::integer, (l ->> 'precio_unitario')::integer, (l ->> 'subtotal')::integer
  from jsonb_array_elements(lineas) l;

  return jsonb_build_object(
    'codigo', v_codigo,
    'items', (select jsonb_agg(jsonb_build_object('nombre', l ->> 'nombre', 'detalle', l ->> 'detalle',
              'cantidad', (l ->> 'cantidad')::integer, 'precio_unitario', (l ->> 'precio_unitario')::integer,
              'subtotal', (l ->> 'subtotal')::integer)) from jsonb_array_elements(lineas) l),
    'subtotal', v_subtotal,
    'domicilio', case when v_modalidad = 'domicilio' then v_domicilio end,
    'domicilio_pendiente', v_pendiente,
    'total', v_subtotal + coalesce(v_domicilio, 0));
end $$;

revoke all on function public.dp_crear_pedido(text, jsonb) from public, anon, authenticated;
grant execute on function public.dp_crear_pedido(text, jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
create or replace function public.dp_aceptar_invitaciones()
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_email text;
  n integer;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then
    return 0;
  end if;
  insert into public.dp_miembros (tienda_id, user_id, rol)
  select i.tienda_id, (select auth.uid()), i.rol from public.dp_invitaciones i where i.email = v_email
  on conflict (tienda_id, user_id) do nothing;
  get diagnostics n = row_count;
  delete from public.dp_invitaciones where email = v_email;
  return n;
end $$;

revoke all on function public.dp_aceptar_invitaciones() from public, anon, authenticated;
grant execute on function public.dp_aceptar_invitaciones() to authenticated;

-- -----------------------------------------------------------------------------
create or replace function public.dp_anonimizar_pedidos(p_tienda uuid)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  n integer;
begin
  if not public.dp_es_propietaria(p_tienda) then
    raise exception 'Solo la propietaria puede hacer esto.';
  end if;
  update public.dp_pedidos pe set
    cliente_nombre = 'Cliente', cliente_telefono = '', direccion = '', barrio = '', observaciones = '',
    datos_anonimizados = true
  from public.dp_tiendas t
  where t.id = p_tienda and pe.tienda_id = t.id and not pe.datos_anonimizados
    and pe.creado_en < now() - make_interval(months => t.meses_retencion);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.dp_anonimizar_pedidos(uuid) from public, anon, authenticated;
grant execute on function public.dp_anonimizar_pedidos(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Alta de tienda nueva para un cliente del servicio. Se ejecuta desde el editor
-- SQL de Supabase (rol postgres); no está disponible para la app.
create or replace function public.dp_crear_tienda(p_slug text, p_nombre text, p_email_propietaria text, p_whatsapp text default '')
returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.dp_tiendas (slug, nombre, whatsapp)
  values (lower(trim(p_slug)), trim(p_nombre), coalesce(p_whatsapp, ''))
  returning id into v_id;
  insert into public.dp_invitaciones (tienda_id, email, rol) values (v_id, lower(trim(p_email_propietaria)), 'propietaria');
  return v_id;
end $$;

revoke all on function public.dp_crear_tienda(text, text, text, text) from public, anon, authenticated;

-- Funciones internas: no se exponen por la API.
revoke all on function public.dp_tocar() from public, anon, authenticated;
revoke all on function public.dp_tocar_tienda() from public, anon, authenticated;
revoke all on function public.dp_misma_tienda() from public, anon, authenticated;

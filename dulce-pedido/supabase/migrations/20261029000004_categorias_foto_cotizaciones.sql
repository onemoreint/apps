-- =============================================================================
-- DULCE PEDIDO — foto por categoría y solicitudes de cotización
-- =============================================================================

alter table public.dp_categorias add column if not exists foto_url text not null default '';

alter table public.dp_tiendas add column if not exists consecutivo_cotizacion integer not null default 0;

-- -----------------------------------------------------------------------------
-- Cotizaciones: pedidos especiales (eventos, tortas personalizadas…) que la
-- tienda responde con un precio. Igual que los pedidos, se registran y el
-- cliente las envía por WhatsApp.
-- -----------------------------------------------------------------------------
create table public.dp_cotizaciones (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  codigo text not null,
  estado text not null default 'nueva' check (estado in ('nueva', 'respondida', 'aceptada', 'descartada')),
  cliente_nombre text not null,
  cliente_telefono text not null,
  tipo_evento text not null default '',
  fecha_evento date,
  personas integer check (personas between 1 and 5000),
  presupuesto integer check (presupuesto between 0 and 100000000),
  descripcion text not null,
  notas_internas text not null default '',
  autorizacion_datos_en timestamptz not null,
  datos_anonimizados boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tienda_id, codigo)
);
create index dp_cotizaciones_tienda_idx on public.dp_cotizaciones (tienda_id, creado_en desc);
create index dp_cotizaciones_telefono_idx on public.dp_cotizaciones (tienda_id, cliente_telefono, creado_en);

create trigger dp_cotizaciones_tocar before update on public.dp_cotizaciones for each row execute function public.dp_tocar();

alter table public.dp_cotizaciones enable row level security;
revoke all on public.dp_cotizaciones from anon, authenticated;
grant select on public.dp_cotizaciones to authenticated;
grant update (estado, notas_internas) on public.dp_cotizaciones to authenticated;

create policy dp_cotizaciones_ver on public.dp_cotizaciones for select to authenticated
  using ((select public.dp_es_miembro(tienda_id)));
create policy dp_cotizaciones_editar on public.dp_cotizaciones for update to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));

-- -----------------------------------------------------------------------------
create or replace function public.dp_crear_cotizacion(p_slug text, p_datos jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.dp_tiendas;
  v_nombre text := trim(coalesce(p_datos ->> 'nombre', ''));
  v_tel text := regexp_replace(coalesce(p_datos ->> 'telefono', ''), '[^0-9]', '', 'g');
  v_tipo text := trim(coalesce(p_datos ->> 'tipo_evento', ''));
  v_desc text := trim(coalesce(p_datos ->> 'descripcion', ''));
  v_fecha_txt text := coalesce(p_datos ->> 'fecha_evento', '');
  v_personas_txt text := coalesce(p_datos ->> 'personas', '');
  v_presupuesto_txt text := coalesce(p_datos ->> 'presupuesto', '');
  v_fecha date;
  v_personas integer;
  v_presupuesto integer;
  v_codigo text;
  v_recientes integer;
  hoy date;
begin
  select * into t from public.dp_tiendas where slug = lower(trim(coalesce(p_slug, ''))) and activa for update;
  if not found then
    raise exception 'Esta tienda no está disponible.';
  end if;
  hoy := (now() at time zone t.zona_horaria)::date;

  if length(v_nombre) < 2 or length(v_nombre) > 80 then
    raise exception 'Escribe tu nombre.';
  end if;
  if length(v_tel) < 7 or length(v_tel) > 15 then
    raise exception 'Escribe un número de contacto válido.';
  end if;
  if length(v_tipo) > 60 then
    raise exception 'El tipo de pedido es demasiado largo.';
  end if;
  if length(v_desc) < 10 then
    raise exception 'Cuéntanos qué necesitas (mínimo 10 caracteres).';
  end if;
  if length(v_desc) > 1500 then
    raise exception 'La descripción puede tener máximo 1.500 caracteres.';
  end if;
  if coalesce((p_datos ->> 'acepta_datos')::boolean, false) is not true then
    raise exception 'Necesitamos tu autorización para responder tu solicitud.';
  end if;

  if v_fecha_txt <> '' then
    if v_fecha_txt !~ '^\d{4}-\d{2}-\d{2}$' then
      raise exception 'Elige una fecha válida.';
    end if;
    begin
      v_fecha := v_fecha_txt::date;
    exception when others then
      raise exception 'Elige una fecha válida.';
    end;
    if v_fecha < hoy then
      raise exception 'La fecha del evento ya pasó.';
    end if;
    if v_fecha > hoy + 730 then
      raise exception 'Elige una fecha dentro de los próximos dos años.';
    end if;
  end if;
  if v_personas_txt <> '' then
    if v_personas_txt !~ '^[0-9]{1,4}$' or v_personas_txt::integer < 1 then
      raise exception 'Número de personas no válido.';
    end if;
    v_personas := v_personas_txt::integer;
  end if;
  if v_presupuesto_txt <> '' then
    if v_presupuesto_txt !~ '^[0-9]{1,9}$' then
      raise exception 'Presupuesto no válido.';
    end if;
    v_presupuesto := least(v_presupuesto_txt::integer, 100000000);
  end if;

  select count(*) into v_recientes from public.dp_cotizaciones
  where tienda_id = t.id and cliente_telefono = v_tel and creado_en > now() - interval '1 hour';
  if v_recientes >= t.limite_pedidos_hora then
    raise exception 'Ya recibimos varias solicitudes desde este número. Escríbenos directamente por WhatsApp.';
  end if;

  update public.dp_tiendas set consecutivo_cotizacion = consecutivo_cotizacion + 1 where id = t.id
  returning 'CT-' || lpad(consecutivo_cotizacion::text, 4, '0') into v_codigo;

  insert into public.dp_cotizaciones (tienda_id, codigo, cliente_nombre, cliente_telefono, tipo_evento, fecha_evento,
                                      personas, presupuesto, descripcion, autorizacion_datos_en)
  values (t.id, v_codigo, v_nombre, v_tel, v_tipo, v_fecha, v_personas, v_presupuesto, v_desc, now());

  return jsonb_build_object('codigo', v_codigo);
end $$;

revoke all on function public.dp_crear_cotizacion(text, jsonb) from public, anon, authenticated;
grant execute on function public.dp_crear_cotizacion(text, jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- La anonimización (Ley 1581) también cubre las cotizaciones.
create or replace function public.dp_anonimizar_pedidos(p_tienda uuid)
returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  n integer;
  m integer;
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
  update public.dp_cotizaciones co set
    cliente_nombre = 'Cliente', cliente_telefono = '', datos_anonimizados = true
  from public.dp_tiendas t
  where t.id = p_tienda and co.tienda_id = t.id and not co.datos_anonimizados
    and co.creado_en < now() - make_interval(months => t.meses_retencion);
  get diagnostics m = row_count;
  return n + m;
end $$;

revoke all on function public.dp_anonimizar_pedidos(uuid) from public, anon, authenticated;
grant execute on function public.dp_anonimizar_pedidos(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Catálogo público: ahora incluye la foto de cada categoría.
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
      select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'descripcion', c.descripcion, 'orden', c.orden,
                                          'foto_url', c.foto_url)
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

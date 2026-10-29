-- DULCE PEDIDO — instalación completa. Generado por scripts/build-setup-sql.mjs; no editar a mano.
-- Pegar en Supabase → SQL Editor → Run, en un proyecto donde aún no existan las tablas dp_*.

-- >>> 20261029000001_esquema.sql
-- =============================================================================
-- DULCE PEDIDO — esquema
-- Todas las tablas llevan el prefijo dp_ para convivir con otras apps en el mismo
-- proyecto de Supabase, y todas tienen tienda_id: cada negocio solo ve lo suyo.
-- Los visitantes (anon) NO leen tablas: usan las funciones públicas de la
-- migración 2, que devuelven solo datos públicos.
-- =============================================================================

create table public.dp_tiendas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  nombre text not null check (length(trim(nombre)) between 2 and 80),
  activa boolean not null default true,
  demo boolean not null default false,
  whatsapp text not null default '' check (whatsapp = '' or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  zona_horaria text not null default 'America/Bogota',
  dias_atencion smallint[] not null default '{1,2,3,4,5,6}',
  dias_max_anticipacion integer not null default 45 check (dias_max_anticipacion between 1 and 365),
  franjas text[] not null default '{}',
  recogida boolean not null default true,
  domicilio boolean not null default true,
  direccion_recogida text not null default '',
  contenido jsonb not null default '{}'::jsonb,
  -- Límite anti-abuso: solicitudes por teléfono por hora.
  limite_pedidos_hora integer not null default 5 check (limite_pedidos_hora between 1 and 100),
  -- Meses que se guardan los datos personales de los clientes (Ley 1581: finalidad y temporalidad).
  meses_retencion integer not null default 12 check (meses_retencion between 1 and 60),
  consecutivo integer not null default 0,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table public.dp_miembros (
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  rol text not null default 'propietaria' check (rol in ('propietaria', 'equipo')),
  creado_en timestamptz not null default now(),
  primary key (tienda_id, user_id)
);
create index dp_miembros_user_idx on public.dp_miembros (user_id);

-- Invitaciones por correo: al iniciar sesión con ese correo (verificado) se vuelve miembro.
create table public.dp_invitaciones (
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%@%'),
  rol text not null default 'propietaria' check (rol in ('propietaria', 'equipo')),
  creada_en timestamptz not null default now(),
  primary key (tienda_id, email)
);

create table public.dp_categorias (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  descripcion text not null default '',
  orden integer not null default 0,
  activa boolean not null default true
);
create index dp_categorias_tienda_idx on public.dp_categorias (tienda_id, orden);

create table public.dp_productos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  categoria_id uuid references public.dp_categorias (id) on delete set null,
  nombre text not null check (length(trim(nombre)) between 2 and 80),
  descripcion text not null default '' check (length(descripcion) <= 1000),
  precio integer not null check (precio between 0 and 100000000),
  presentacion text not null default '',
  fotos text[] not null default '{}',
  -- activo = visible en la tienda; disponible = se puede pedir (false = agotado).
  activo boolean not null default true,
  disponible boolean not null default true,
  destacado boolean not null default false,
  nuevo boolean not null default false,
  por_encargo boolean not null default false,
  horas_preparacion integer not null default 0 check (horas_preparacion between 0 and 720),
  cantidad_minima integer not null default 1 check (cantidad_minima between 1 and 500),
  sabores text[] not null default '{}',
  sabores_max integer not null default 1 check (sabores_max between 1 and 24),
  ingredientes text not null default '',
  alergenos text not null default '',
  conservacion text not null default '',
  orden integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index dp_productos_tienda_idx on public.dp_productos (tienda_id, orden);
create index dp_productos_categoria_idx on public.dp_productos (categoria_id);

create table public.dp_variantes (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  producto_id uuid not null references public.dp_productos (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 1 and 60),
  precio integer check (precio between 0 and 100000000),
  disponible boolean not null default true,
  orden integer not null default 0
);
create index dp_variantes_producto_idx on public.dp_variantes (producto_id, orden);
create index dp_variantes_tienda_idx on public.dp_variantes (tienda_id);

create table public.dp_zonas (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  nombre text not null check (length(trim(nombre)) between 2 and 80),
  -- null = el domicilio se cotiza por WhatsApp
  tarifa integer check (tarifa between 0 and 10000000),
  activa boolean not null default true,
  orden integer not null default 0
);
create index dp_zonas_tienda_idx on public.dp_zonas (tienda_id, orden);

create table public.dp_fechas_bloqueadas (
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  fecha date not null,
  motivo text not null default '',
  primary key (tienda_id, fecha)
);

create table public.dp_pedidos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  codigo text not null,
  estado text not null default 'solicitud_recibida' check (estado in (
    'solicitud_recibida', 'pendiente_confirmacion', 'confirmado', 'en_preparacion',
    'listo', 'entregado', 'cancelado')),
  cliente_nombre text not null,
  cliente_telefono text not null,
  fecha_entrega date not null,
  franja text not null default '',
  modalidad text not null check (modalidad in ('recogida', 'domicilio')),
  zona_id uuid references public.dp_zonas (id) on delete set null,
  zona_nombre text not null default '',
  direccion text not null default '',
  barrio text not null default '',
  observaciones text not null default '',
  subtotal integer not null,
  domicilio integer,
  domicilio_pendiente boolean not null default false,
  total integer not null,
  notas_internas text not null default '',
  autorizacion_datos_en timestamptz not null,
  datos_anonimizados boolean not null default false,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tienda_id, codigo)
);
create index dp_pedidos_tienda_idx on public.dp_pedidos (tienda_id, creado_en desc);
create index dp_pedidos_entrega_idx on public.dp_pedidos (tienda_id, fecha_entrega);
create index dp_pedidos_telefono_idx on public.dp_pedidos (tienda_id, cliente_telefono, creado_en);
create index dp_pedidos_zona_idx on public.dp_pedidos (zona_id);

create table public.dp_pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.dp_pedidos (id) on delete cascade,
  tienda_id uuid not null references public.dp_tiendas (id) on delete cascade,
  producto_id uuid references public.dp_productos (id) on delete set null,
  variante_id uuid references public.dp_variantes (id) on delete set null,
  nombre text not null,
  detalle text not null default '',
  sabores text[] not null default '{}',
  cantidad integer not null check (cantidad between 1 and 999),
  precio_unitario integer not null,
  subtotal integer not null
);
create index dp_pedido_items_pedido_idx on public.dp_pedido_items (pedido_id);
create index dp_pedido_items_tienda_idx on public.dp_pedido_items (tienda_id);
create index dp_pedido_items_producto_idx on public.dp_pedido_items (producto_id);
create index dp_pedido_items_variante_idx on public.dp_pedido_items (variante_id);

-- -----------------------------------------------------------------------------
-- Sello de actualización
-- -----------------------------------------------------------------------------
create or replace function public.dp_tocar() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

create or replace function public.dp_tocar_tienda() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizada_en := now();
  return new;
end $$;

create trigger dp_productos_tocar before update on public.dp_productos for each row execute function public.dp_tocar();
create trigger dp_pedidos_tocar before update on public.dp_pedidos for each row execute function public.dp_tocar();
create trigger dp_tiendas_tocar before update on public.dp_tiendas for each row execute function public.dp_tocar_tienda();

-- -----------------------------------------------------------------------------
-- Autorización
-- -----------------------------------------------------------------------------
create or replace function public.dp_es_miembro(p_tienda uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dp_miembros m
    where m.tienda_id = p_tienda and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.dp_es_propietaria(p_tienda uuid)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.dp_miembros m
    where m.tienda_id = p_tienda and m.user_id = (select auth.uid()) and m.rol = 'propietaria'
  );
$$;

revoke all on function public.dp_es_miembro(uuid) from public, anon, authenticated;
revoke all on function public.dp_es_propietaria(uuid) from public, anon, authenticated;
grant execute on function public.dp_es_miembro(uuid) to authenticated;
grant execute on function public.dp_es_propietaria(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- RLS: nada para anon; miembros autenticados solo dentro de su tienda.
-- -----------------------------------------------------------------------------
alter table public.dp_tiendas enable row level security;
alter table public.dp_miembros enable row level security;
alter table public.dp_invitaciones enable row level security;
alter table public.dp_categorias enable row level security;
alter table public.dp_productos enable row level security;
alter table public.dp_variantes enable row level security;
alter table public.dp_zonas enable row level security;
alter table public.dp_fechas_bloqueadas enable row level security;
alter table public.dp_pedidos enable row level security;
alter table public.dp_pedido_items enable row level security;

-- Supabase concede por defecto TODO a anon y authenticated en tablas nuevas: se retira y se
-- concede solo lo necesario.
revoke all on public.dp_tiendas, public.dp_miembros, public.dp_invitaciones, public.dp_categorias,
  public.dp_productos, public.dp_variantes, public.dp_zonas, public.dp_fechas_bloqueadas,
  public.dp_pedidos, public.dp_pedido_items from anon, authenticated;

grant select, update on public.dp_tiendas to authenticated;
grant select on public.dp_miembros to authenticated;
grant select, insert, delete on public.dp_invitaciones to authenticated;
grant select, insert, update, delete on public.dp_categorias, public.dp_productos, public.dp_variantes,
  public.dp_zonas, public.dp_fechas_bloqueadas to authenticated;
grant select, update on public.dp_pedidos to authenticated;
grant select on public.dp_pedido_items to authenticated;

-- Tienda: la ven sus miembros; solo la propietaria cambia la configuración.
create policy dp_tiendas_ver on public.dp_tiendas for select to authenticated
  using ((select public.dp_es_miembro(id)));
create policy dp_tiendas_editar on public.dp_tiendas for update to authenticated
  using ((select public.dp_es_propietaria(id))) with check ((select public.dp_es_propietaria(id)));

-- Columnas que la propietaria NO puede cambiar desde la app (las gestiona el administrador del servicio).
revoke update on public.dp_tiendas from authenticated;
grant update (nombre, whatsapp, dias_atencion, dias_max_anticipacion, franjas, recogida, domicilio,
  direccion_recogida, contenido, meses_retencion) on public.dp_tiendas to authenticated;

create policy dp_miembros_ver on public.dp_miembros for select to authenticated
  using (user_id = (select auth.uid()) or (select public.dp_es_miembro(tienda_id)));

create policy dp_invitaciones_ver on public.dp_invitaciones for select to authenticated
  using ((select public.dp_es_propietaria(tienda_id)));
create policy dp_invitaciones_crear on public.dp_invitaciones for insert to authenticated
  with check ((select public.dp_es_propietaria(tienda_id)));
create policy dp_invitaciones_borrar on public.dp_invitaciones for delete to authenticated
  using ((select public.dp_es_propietaria(tienda_id)));

create policy dp_categorias_todo on public.dp_categorias for all to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));
create policy dp_productos_todo on public.dp_productos for all to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));
create policy dp_variantes_todo on public.dp_variantes for all to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));
create policy dp_zonas_todo on public.dp_zonas for all to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));
create policy dp_fechas_todo on public.dp_fechas_bloqueadas for all to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));

create policy dp_pedidos_ver on public.dp_pedidos for select to authenticated
  using ((select public.dp_es_miembro(tienda_id)));
create policy dp_pedidos_editar on public.dp_pedidos for update to authenticated
  using ((select public.dp_es_miembro(tienda_id))) with check ((select public.dp_es_miembro(tienda_id)));
-- Desde el panel solo se cambian estado y notas; precios y datos del cliente quedan como se recibieron.
revoke update on public.dp_pedidos from authenticated;
grant update (estado, notas_internas) on public.dp_pedidos to authenticated;

create policy dp_items_ver on public.dp_pedido_items for select to authenticated
  using ((select public.dp_es_miembro(tienda_id)));

-- -----------------------------------------------------------------------------
-- Coherencia entre tablas: una variante/categoría/zona no puede apuntar a otra tienda.
-- -----------------------------------------------------------------------------
create or replace function public.dp_misma_tienda() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'dp_variantes' then
    if not exists (select 1 from public.dp_productos p where p.id = new.producto_id and p.tienda_id = new.tienda_id) then
      raise exception 'El producto no pertenece a esta tienda';
    end if;
  elsif tg_table_name = 'dp_productos' and new.categoria_id is not null then
    if not exists (select 1 from public.dp_categorias c where c.id = new.categoria_id and c.tienda_id = new.tienda_id) then
      raise exception 'La categoría no pertenece a esta tienda';
    end if;
  end if;
  return new;
end $$;

create trigger dp_variantes_misma_tienda before insert or update on public.dp_variantes
  for each row execute function public.dp_misma_tienda();
create trigger dp_productos_misma_tienda before insert or update on public.dp_productos
  for each row execute function public.dp_misma_tienda();


-- >>> 20261029000002_funciones_publicas.sql
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


-- >>> 20261029000003_fotos.sql
-- =============================================================================
-- DULCE PEDIDO — fotos de productos y logos
-- Bucket público de lectura. Solo los miembros de una tienda suben, cambian o
-- borran archivos, y únicamente dentro de su carpeta: dulce-pedido/{tienda_id}/…
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dulce-pedido', 'dulce-pedido', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.dp_storage_tienda(p_name text)
returns uuid
language plpgsql immutable set search_path = '' as $$
declare
  carpeta text := split_part(coalesce(p_name, ''), '/', 1);
begin
  if carpeta ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return carpeta::uuid;
  end if;
  return null;
end $$;

grant execute on function public.dp_storage_tienda(text) to authenticated;

create policy dp_fotos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'dulce-pedido' and (select public.dp_es_miembro(public.dp_storage_tienda(name))));
create policy dp_fotos_ver on storage.objects for select to authenticated
  using (bucket_id = 'dulce-pedido' and (select public.dp_es_miembro(public.dp_storage_tienda(name))));
create policy dp_fotos_cambiar on storage.objects for update to authenticated
  using (bucket_id = 'dulce-pedido' and (select public.dp_es_miembro(public.dp_storage_tienda(name))))
  with check (bucket_id = 'dulce-pedido' and (select public.dp_es_miembro(public.dp_storage_tienda(name))));
create policy dp_fotos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'dulce-pedido' and (select public.dp_es_miembro(public.dp_storage_tienda(name))));


-- >>> 20261029000004_categorias_foto_cotizaciones.sql
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


-- >>> seed.sql
-- =============================================================================
-- DULCE PEDIDO — tienda de demostración "dulce-pedido-demo"
-- Productos y precios DE EJEMPLO para mostrar el sistema. La tienda queda
-- marcada como demo = true y la app lo anuncia en pantalla. No usar como datos reales.
-- Se puede ejecutar varias veces: si la tienda ya existe, no hace nada.
-- =============================================================================
do $$
declare
  t uuid;
  c_tortas uuid; c_ind uuid; c_brownies uuid; c_galletas uuid; c_cupcakes uuid;
  c_frios uuid; c_trad uuid; c_combos uuid; c_pers uuid;
  p uuid;
begin
  if exists (select 1 from public.dp_tiendas where slug = 'dulce-pedido-demo') then
    return;
  end if;

  insert into public.dp_tiendas (slug, nombre, demo, whatsapp, dias_atencion, dias_max_anticipacion, franjas,
                                 recogida, domicilio, direccion_recogida, contenido)
  values ('dulce-pedido-demo', 'Dulce Pedido', true, '+573126387467', '{1,2,3,4,5,6}', 45,
    '{"Mañana (9:00 a. m. – 12:00 m.)","Tarde (2:00 – 6:00 p. m.)"}', true, true,
    'Punto de entrega en La Estrella, Antioquia (dirección exacta al confirmar el pedido)',
    jsonb_build_object(
      'eslogan', 'Repostería casera hecha con cariño',
      'mensaje_bienvenida', 'Tortas, postres y detalles dulces preparados en casa para tus celebraciones y antojos. Elige lo que te guste y envíanos tu pedido por WhatsApp.',
      'logo_url', '', 'banner_url', '',
      'colores', jsonb_build_object('primario', '#5a3222', 'acento', '#c4673f'),
      'como_pedir', jsonb_build_array(
        'Explora el catálogo y agrega tus productos al carrito.',
        'Elige la fecha, la franja horaria y si recoges o te lo llevamos.',
        'Envía el pedido por WhatsApp con el resumen listo.',
        'Te confirmamos disponibilidad, valor final y forma de pago.'),
      'info_entregas', 'Hacemos domicilios en las zonas que ves al finalizar tu pedido. Si tu barrio no aparece con tarifa, te cotizamos el envío por WhatsApp.',
      'info_anticipacion', 'Todo se prepara por encargo. Las tortas necesitan al menos 2 días de anticipación; los postres individuales, 1 día.',
      'eventos_texto', '¿Cumpleaños, reunión o evento? Cuéntanos la fecha, el número de personas y la idea, y te armamos una propuesta.',
      'faq', jsonb_build_array(
        jsonb_build_object('pregunta', '¿Mi pedido queda confirmado al enviarlo?', 'respuesta', 'Todavía no. Al enviarlo por WhatsApp nos llega tu solicitud; te respondemos para confirmar disponibilidad, el valor final y la forma de pago.'),
        jsonb_build_object('pregunta', '¿Con cuánta anticipación debo pedir?', 'respuesta', 'Depende del producto: en cada uno verás el tiempo mínimo de preparación. El calendario solo te deja elegir fechas posibles.'),
        jsonb_build_object('pregunta', '¿Cuánto cuesta el domicilio?', 'respuesta', 'Depende de tu zona. Si tu zona tiene tarifa, la verás en el total; si no, te la cotizamos por WhatsApp antes de confirmar.'),
        jsonb_build_object('pregunta', '¿Puedo personalizar una torta?', 'respuesta', 'Sí. Escribe tu idea en las observaciones o elige la categoría de productos personalizados y te asesoramos.'),
        jsonb_build_object('pregunta', '¿Cómo pago?', 'respuesta', 'Te enviamos las opciones de pago cuando confirmemos tu pedido.')),
      'testimonios', '[]'::jsonb,
      'ciudad', 'La Estrella, Antioquia',
      'horario_texto', 'Lunes a sábado, 9:00 a. m. a 6:00 p. m.',
      'instagram', '', 'facebook', '', 'tiktok', '', 'correo', '',
      'privacidad', 'Usamos tu nombre, teléfono y dirección únicamente para gestionar y entregar tu pedido, conforme a la Ley 1581 de 2012. No los compartimos con terceros ni los usamos para publicidad sin tu autorización. Puedes pedir que los actualicemos o eliminemos escribiéndonos por WhatsApp. Los datos de pedidos se conservan por un máximo de 12 meses.'
    ))
  returning id into t;

  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Tortas', 1) returning id into c_tortas;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Postres individuales', 2) returning id into c_ind;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Brownies', 3) returning id into c_brownies;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Galletas', 4) returning id into c_galletas;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Cupcakes', 5) returning id into c_cupcakes;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Postres fríos', 6) returning id into c_frios;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Dulces tradicionales', 7) returning id into c_trad;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Combos y cajas de regalo', 8) returning id into c_combos;
  insert into public.dp_categorias (tienda_id, nombre, orden) values (t, 'Productos personalizados', 9) returning id into c_pers;

  -- Tortas
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      por_encargo, horas_preparacion, sabores, conservacion, orden)
  values (t, c_tortas, 'Torta de chocolate', 'Bizcocho húmedo de chocolate con relleno y cubierta de ganache.', 65000,
      'Redonda, decorada', true, true, 48, '{}', 'Mantener refrigerada. Consumir en 3 días.', 1)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, '1/2 libra · 10 porciones', 65000, 1),
    (t, p, '1 libra · 20 porciones', 115000, 2),
    (t, p, '2 libras · 40 porciones', 210000, 3);

  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, nuevo,
      por_encargo, horas_preparacion, sabores, conservacion, orden)
  values (t, c_tortas, 'Torta de zanahoria', 'Con nueces y frosting de queso crema.', 70000, 'Redonda', true, true, 48, '{}',
      'Mantener refrigerada. Consumir en 4 días.', 2)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, '1/2 libra · 10 porciones', 70000, 1),
    (t, p, '1 libra · 20 porciones', 125000, 2);

  -- Postres individuales
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      horas_preparacion, sabores, conservacion, orden)
  values (t, c_ind, 'Cheesecake individual', 'Base de galleta, crema de queso y salsa de frutos rojos o maracuyá.', 12000,
      'Vaso de 9 oz', true, 24, '{"Frutos rojos","Maracuyá"}', 'Mantener refrigerado.', 1);
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, conservacion, orden)
  values (t, c_ind, 'Tres leches', 'Bizcocho bañado en tres leches con merengue.', 10000, 'Porción individual', 24,
      'Mantener refrigerado.', 2);

  -- Brownies
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      horas_preparacion, cantidad_minima, sabores, sabores_max, orden)
  values (t, c_brownies, 'Brownie artesanal', 'Brownie de chocolate, crocante por fuera y húmedo por dentro.', 5000,
      'Unidad de 7 × 7 cm', true, 24, 6, '{"Clásico","Arequipe","Nutella","Nueces"}', 2, 1);

  -- Galletas (una agotada para mostrar el estado)
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, cantidad_minima, sabores, orden)
  values (t, c_galletas, 'Galletas con chips de chocolate', 'Galletas grandes horneadas el mismo día.', 3500,
      'Unidad de 60 g', 12, 6, '{}', 1);
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, disponible,
      horas_preparacion, orden)
  values (t, c_galletas, 'Galletas de avena y pasas', 'Suaves y especiadas.', 3000, 'Unidad de 50 g', false, 12, 2);

  -- Cupcakes
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, cantidad_minima, sabores, sabores_max, orden)
  values (t, c_cupcakes, 'Cupcakes decorados', 'Con crema de mantequilla y decoración a elección en las observaciones.', 6000,
      'Unidad', 48, 6, '{"Vainilla","Chocolate","Red velvet"}', 3, 1);

  -- Postres fríos
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, sabores, conservacion, orden)
  values (t, c_frios, 'Postre de maracuyá', 'Mousse de maracuyá sobre base de galleta.', 9000, 'Vaso de 7 oz', 24, '{}',
      'Mantener refrigerado.', 1);

  -- Dulces tradicionales
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      horas_preparacion, orden)
  values (t, c_trad, 'Arequipe casero', 'Preparado en paila, a fuego lento.', 14000, 'Frasco de 250 g', 24, 1);

  -- Combos
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion, destacado,
      por_encargo, horas_preparacion, sabores, sabores_max, orden)
  values (t, c_combos, 'Caja de regalo dulce', 'Caja con brownies y galletas surtidas, lista para regalar. Elige hasta 3 sabores.',
      45000, 'Caja con lazo', true, true, 48, '{"Brownie clásico","Brownie de arequipe","Galleta de chips","Alfajor"}', 3, 1)
  returning id into p;
  insert into public.dp_variantes (tienda_id, producto_id, nombre, precio, orden) values
    (t, p, 'Caja x 6 unidades', 45000, 1),
    (t, p, 'Caja x 12 unidades', 82000, 2);

  -- Personalizados
  insert into public.dp_productos (tienda_id, categoria_id, nombre, descripcion, precio, presentacion,
      por_encargo, horas_preparacion, orden)
  values (t, c_pers, 'Torta temática personalizada', 'Para cumpleaños y eventos. El precio indicado es la base: el valor final se confirma según el diseño.',
      150000, 'Desde 20 porciones', true, 120, 1);

  insert into public.dp_zonas (tienda_id, nombre, tarifa, orden) values
    (t, 'La Estrella (casco urbano)', 6000, 1),
    (t, 'Sabaneta e Itagüí', 9000, 2),
    (t, 'Envigado y Medellín sur', 12000, 3),
    (t, 'Otra zona (se cotiza)', null, 4);
end $$;


-- >>> fotos-demo.sql
-- =============================================================================
-- DULCE PEDIDO — fotografías de referencia para la tienda de demostración.
-- Fotos reales de Unsplash (licencia Unsplash: uso comercial libre, sin
-- atribución obligatoria). Créditos en docs/CREDITOS.md. NO son fotos de
-- productos de ninguna vendedora: la tienda demo las marca como «Foto de referencia».
-- Se puede ejecutar varias veces.
-- =============================================================================
do $$
declare
  t uuid;
  q constant text := '?auto=format&fit=crop&w=900&q=75';
  u constant text := 'https://images.unsplash.com/';
begin
  select id into t from public.dp_tiendas where slug = 'dulce-pedido-demo';
  if t is null then
    return;
  end if;

  update public.dp_productos p set fotos = array[u || f.foto || q]
  from (values
    ('Torta de chocolate', 'photo-1607257882338-70f7dd2ae344'),
    ('Torta de zanahoria', 'photo-1773933200726-458f8c64ac29'),
    ('Cheesecake individual', 'photo-1734987408480-c2916b5386bc'),
    ('Tres leches', 'photo-1673974798330-23e8f4c9ae05'),
    ('Brownie artesanal', 'photo-1636743715220-d8f8dd900b87'),
    ('Galletas con chips de chocolate', 'photo-1719384980808-0f3b833a2468'),
    ('Galletas de avena y pasas', 'photo-1668724063394-dc6716fc6bd6'),
    ('Cupcakes decorados', 'photo-1642647369793-1cccf9aa1153'),
    ('Postre de maracuyá', 'photo-1746633570370-2b0c49779a4f'),
    ('Arequipe casero', 'photo-1610360147031-26a1d395726e'),
    ('Caja de regalo dulce', 'photo-1655734940582-3667ebefb516'),
    ('Torta temática personalizada', 'photo-1635822120057-b37c15ce1bef')
  ) as f(nombre, foto)
  where p.tienda_id = t and p.nombre = f.nombre;

  -- Una foto propia por categoría.
  update public.dp_categorias c set foto_url = u || f.foto || q
  from (values
    ('Tortas', 'photo-1464347744102-11db6282f854'),
    ('Postres individuales', 'photo-1734987408480-c2916b5386bc'),
    ('Brownies', 'photo-1636743715220-d8f8dd900b87'),
    ('Galletas', 'photo-1499636136210-6f4ee915583e'),
    ('Cupcakes', 'photo-1642647369793-1cccf9aa1153'),
    ('Postres fríos', 'photo-1746633570370-2b0c49779a4f'),
    ('Dulces tradicionales', 'photo-1610360147031-26a1d395726e'),
    ('Combos y cajas de regalo', 'photo-1655734940582-3667ebefb516'),
    ('Productos personalizados', 'photo-1635822120057-b37c15ce1bef')
  ) as f(nombre, foto)
  where c.tienda_id = t and c.nombre = f.nombre;

  -- Portada y ubicación (Urbanización Felicity, La Estrella).
  update public.dp_tiendas set
    direccion_recogida = 'Urbanización Felicity, La Estrella, Antioquia (te confirmamos torre y apartamento por WhatsApp)',
    contenido = contenido || jsonb_build_object(
      'banner_url', u || 'photo-1505252827206-b0ef670590f6?auto=format&fit=crop&w=1600&q=75',
      'direccion', 'Urbanización Felicity, La Estrella, Antioquia',
      'mapa_lat', 6.1526068,
      'mapa_lng', -75.6518412)
  where id = t;
end $$;

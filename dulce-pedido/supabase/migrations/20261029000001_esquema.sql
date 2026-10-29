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

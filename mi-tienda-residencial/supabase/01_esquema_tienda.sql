-- ===================== TABLAS =====================
create table public.tiendas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  nombre text not null,
  conjunto text not null default '',
  eslogan text not null default '',
  logo_url text,
  whatsapp text not null check (whatsapp ~ '^[0-9]{8,15}$'),
  prefijo_pedido text not null default 'MTR' check (prefijo_pedido ~ '^[A-Z]{2,5}$'),
  torres text[] not null default '{}',
  domicilio_activo boolean not null default true,
  recogida_activa boolean not null default true,
  costo_domicilio integer not null default 0 check (costo_domicilio >= 0),
  domicilio_gratis_desde integer not null default 0 check (domicilio_gratis_desde >= 0),
  domicilio_minimo integer not null default 0 check (domicilio_minimo >= 0),
  pedido_minimo integer not null default 0 check (pedido_minimo >= 0),
  punto_recogida text not null default '',
  tiempo_estimado text not null default '',
  activa boolean not null default true,
  creada_en timestamptz not null default now()
);

create table public.horarios (
  id bigint generated always as identity primary key,
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  dias smallint[] not null,
  abre time not null,
  cierra time not null
);
create index on public.horarios (tienda_id);

create table public.metodos_pago (
  id bigint generated always as identity primary key,
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  tipo text not null check (tipo in ('nequi','daviplata','transferencia','efectivo')),
  nombre text not null,
  titular text not null default '',
  banco text not null default '',
  tipo_cuenta text not null default '',
  numero text not null default '',
  documento text not null default '',
  qr_imagen text not null default '',
  instrucciones text not null default '',
  activo boolean not null default true,
  orden smallint not null default 0,
  unique (tienda_id, tipo)
);

create table public.categorias (
  id bigint generated always as identity primary key,
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  slug text not null,
  nombre text not null,
  emoji text not null default '',
  orden smallint not null default 0,
  activa boolean not null default true,
  unique (tienda_id, slug)
);

create table public.productos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  categoria_id bigint references public.categorias(id) on delete set null,
  slug text not null,
  nombre text not null,
  descripcion text not null default '',
  unidad text not null default '',
  precio integer not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  imagen_url text,
  emoji text not null default '',
  codigo_barras text,
  activo boolean not null default true,
  orden integer not null default 0,
  actualizado_en timestamptz not null default now(),
  unique (tienda_id, slug),
  unique (tienda_id, codigo_barras)
);
create index on public.productos (tienda_id, activo);
create index on public.productos (categoria_id);

create table public.miembros_tienda (
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rol text not null check (rol in ('dueno','admin','vendedor')),
  primary key (tienda_id, user_id)
);
create index on public.miembros_tienda (user_id);

create table public.pedidos (
  id uuid primary key default gen_random_uuid(),
  tienda_id uuid not null references public.tiendas(id) on delete restrict,
  numero text not null,
  solicitud_id uuid not null,
  cliente_nombre text not null,
  cliente_telefono text not null,
  torre text not null default '',
  apto text not null default '',
  tipo_entrega text not null check (tipo_entrega in ('domicilio','recogida')),
  subtotal integer not null,
  costo_domicilio integer not null default 0,
  total integer not null,
  total_aprobado integer not null,
  metodo_pago text not null check (metodo_pago in ('nequi','daviplata','transferencia','efectivo')),
  referencia_pago text not null default '',
  efectivo_con integer not null default 0,
  cambio integer not null default 0,
  comprobante_ruta text,
  estado_pago text not null check (estado_pago in ('pendiente_verificacion','contra_entrega','verificado','rechazado')),
  estado_pedido text not null default 'pendiente' check (estado_pedido in ('pendiente','confirmado','preparando','listo','entregado','cancelado')),
  notas text not null default '',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (tienda_id, numero),
  unique (tienda_id, solicitud_id)
);
create index on public.pedidos (tienda_id, creado_en desc);

create table public.pedido_items (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  producto_id uuid references public.productos(id) on delete set null,
  nombre text not null,
  precio_unitario integer not null,
  cantidad integer not null check (cantidad > 0),
  subtotal integer not null
);
create index on public.pedido_items (pedido_id);
create index on public.pedido_items (producto_id);

create table public.pedido_eventos (
  id bigint generated always as identity primary key,
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  tipo text not null check (tipo in ('pedido','pago')),
  de text,
  a text not null,
  usuario_id uuid references auth.users(id) on delete set null,
  fecha timestamptz not null default now()
);
create index on public.pedido_eventos (pedido_id);
create index on public.pedido_eventos (usuario_id);

-- ===================== SEGURIDAD (RLS) =====================
alter table public.tiendas enable row level security;
alter table public.horarios enable row level security;
alter table public.metodos_pago enable row level security;
alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.miembros_tienda enable row level security;
alter table public.pedidos enable row level security;
alter table public.pedido_items enable row level security;
alter table public.pedido_eventos enable row level security;

-- ¿El usuario actual es miembro de la tienda (con alguno de los roles)?
-- (03_ajustes.sql la mueve al esquema "privado")
create or replace function public.es_miembro(p_tienda uuid, p_roles text[] default array['dueno','admin','vendedor'])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.miembros_tienda m
    where m.tienda_id = p_tienda and m.user_id = (select auth.uid()) and m.rol = any (p_roles)
  );
$$;
revoke execute on function public.es_miembro(uuid, text[]) from public, anon;
grant execute on function public.es_miembro(uuid, text[]) to authenticated;

create policy "tiendas: lectura" on public.tiendas for select to anon, authenticated
  using (activa or (select public.es_miembro(id)));
create policy "tiendas: admin edita" on public.tiendas for update to authenticated
  using ((select public.es_miembro(id, array['dueno','admin']))) with check ((select public.es_miembro(id, array['dueno','admin'])));

create policy "horarios: lectura" on public.horarios for select to anon, authenticated using (true);
create policy "horarios: admin" on public.horarios for all to authenticated
  using ((select public.es_miembro(tienda_id, array['dueno','admin']))) with check ((select public.es_miembro(tienda_id, array['dueno','admin'])));

create policy "pagos: lectura" on public.metodos_pago for select to anon, authenticated
  using (activo or (select public.es_miembro(tienda_id)));
create policy "pagos: admin" on public.metodos_pago for all to authenticated
  using ((select public.es_miembro(tienda_id, array['dueno','admin']))) with check ((select public.es_miembro(tienda_id, array['dueno','admin'])));

create policy "categorias: lectura" on public.categorias for select to anon, authenticated
  using (activa or (select public.es_miembro(tienda_id)));
create policy "categorias: admin" on public.categorias for all to authenticated
  using ((select public.es_miembro(tienda_id, array['dueno','admin']))) with check ((select public.es_miembro(tienda_id, array['dueno','admin'])));

create policy "productos: lectura" on public.productos for select to anon, authenticated
  using (activo or (select public.es_miembro(tienda_id)));
create policy "productos: admin" on public.productos for all to authenticated
  using ((select public.es_miembro(tienda_id, array['dueno','admin']))) with check ((select public.es_miembro(tienda_id, array['dueno','admin'])));

create policy "miembros: ver los propios" on public.miembros_tienda for select to authenticated
  using (user_id = (select auth.uid()));

-- Pedidos: los residentes NO leen ni escriben directamente (usan funciones)
create policy "pedidos: personal lee" on public.pedidos for select to authenticated
  using ((select public.es_miembro(tienda_id)));
create policy "pedidos: personal actualiza" on public.pedidos for update to authenticated
  using ((select public.es_miembro(tienda_id))) with check ((select public.es_miembro(tienda_id)));
create policy "items: personal lee" on public.pedido_items for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and (select public.es_miembro(p.tienda_id))));
create policy "eventos: personal lee" on public.pedido_eventos for select to authenticated
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and (select public.es_miembro(p.tienda_id))));

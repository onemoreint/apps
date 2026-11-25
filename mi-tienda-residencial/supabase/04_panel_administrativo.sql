-- ============ INVITACIONES (quién puede entrar al panel) ============
create table public.invitaciones (
  id bigint generated always as identity primary key,
  tienda_id uuid not null references public.tiendas(id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rol text not null check (rol in ('dueno','admin','vendedor')),
  creada_en timestamptz not null default now(),
  usada_en timestamptz,
  unique (tienda_id, email)
);
create index on public.invitaciones (email);
alter table public.invitaciones enable row level security;
create policy "invitaciones: admin" on public.invitaciones for all to authenticated
  using ((select privado.es_miembro(tienda_id, array['dueno','admin'])))
  with check ((select privado.es_miembro(tienda_id, array['dueno','admin'])));

-- Al iniciar sesión: si el correo (ya confirmado) tiene invitaciones, se vuelve miembro.
create or replace function public.reclamar_invitaciones()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_email text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is not null then
    insert into public.miembros_tienda (tienda_id, user_id, rol)
      select i.tienda_id, (select auth.uid()), i.rol from public.invitaciones i
      where i.email = v_email and i.usada_en is null
    on conflict (tienda_id, user_id) do update set rol = excluded.rol;
    update public.invitaciones set usada_en = now() where email = v_email and usada_en is null;
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'slug', t.slug, 'nombre', t.nombre, 'rol', m.rol) order by t.nombre)
    from public.miembros_tienda m join public.tiendas t on t.id = m.tienda_id
    where m.user_id = (select auth.uid())), '[]'::jsonb);
end;
$$;
revoke execute on function public.reclamar_invitaciones() from public, anon;
grant execute on function public.reclamar_invitaciones() to authenticated;

-- ============ CAMBIO DE ESTADOS (con historial) ============
create or replace function public.cambiar_estado_pedido(p_pedido uuid, p_tipo text, p_estado text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare p public.pedidos%rowtype;
begin
  select * into p from public.pedidos where id = p_pedido for update;
  if not found or not privado.es_miembro(p.tienda_id) then
    return public._error('permiso', 'No tienes acceso a este pedido.');
  end if;

  if p_tipo = 'pedido' then
    if p_estado not in ('pendiente','confirmado','preparando','listo','entregado','cancelado') then
      return public._error('estado', 'Estado no válido.');
    end if;
    if p.estado_pedido = 'cancelado' then
      return public._error('estado', 'Un pedido cancelado no se puede reabrir. Pide al residente que haga uno nuevo.');
    end if;
    if p.estado_pedido = p_estado then return jsonb_build_object('ok', true, 'pedido', public._pedido_publico(p.id)); end if;
    if p_estado = 'cancelado' then
      update public.productos pr set stock = pr.stock + i.cantidad, actualizado_en = now()
      from public.pedido_items i where i.pedido_id = p.id and i.producto_id = pr.id;
    end if;
    update public.pedidos set estado_pedido = p_estado, actualizado_en = now() where id = p.id;
    insert into public.pedido_eventos (pedido_id, tipo, de, a, usuario_id) values (p.id, 'pedido', p.estado_pedido, p_estado, (select auth.uid()));
    if p_estado = 'entregado' and p.estado_pago = 'contra_entrega' then
      update public.pedidos set estado_pago = 'verificado' where id = p.id;
      insert into public.pedido_eventos (pedido_id, tipo, de, a, usuario_id) values (p.id, 'pago', 'contra_entrega', 'verificado', (select auth.uid()));
    end if;
  elsif p_tipo = 'pago' then
    if p_estado not in ('pendiente_verificacion','contra_entrega','verificado','rechazado') then
      return public._error('estado', 'Estado de pago no válido.');
    end if;
    if p.estado_pago = p_estado then return jsonb_build_object('ok', true, 'pedido', public._pedido_publico(p.id)); end if;
    update public.pedidos set estado_pago = p_estado, actualizado_en = now() where id = p.id;
    insert into public.pedido_eventos (pedido_id, tipo, de, a, usuario_id) values (p.id, 'pago', p.estado_pago, p_estado, (select auth.uid()));
  else
    return public._error('tipo', 'Tipo no válido.');
  end if;
  return jsonb_build_object('ok', true, 'pedido', public._pedido_publico(p.id));
end;
$$;
revoke execute on function public.cambiar_estado_pedido(uuid, text, text) from public, anon;
grant execute on function public.cambiar_estado_pedido(uuid, text, text) to authenticated;

-- El personal no cambia estados "a mano" en la tabla: solo con la función (queda historial)
drop policy "pedidos: personal actualiza" on public.pedidos;

-- ============ REPORTE DE VENTAS ============
create or replace function public.resumen_ventas(p_tienda uuid, p_dias integer default 30)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_desde timestamptz;
begin
  if not privado.es_miembro(p_tienda) then return public._error('permiso', 'Sin acceso.'); end if;
  v_desde := (date_trunc('day', now() at time zone 'America/Bogota') - make_interval(days => greatest(p_dias, 1) - 1)) at time zone 'America/Bogota';
  return jsonb_build_object(
    'ok', true,
    'desde', v_desde,
    'pedidos', (select count(*) from public.pedidos where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido <> 'cancelado'),
    'cancelados', (select count(*) from public.pedidos where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido = 'cancelado'),
    'ventas', (select coalesce(sum(total), 0) from public.pedidos where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido <> 'cancelado'),
    'entregado', (select coalesce(sum(total), 0) from public.pedidos where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido = 'entregado'),
    'por_verificar', (select count(*) from public.pedidos where tienda_id = p_tienda and estado_pago = 'pendiente_verificacion' and estado_pedido <> 'cancelado'),
    'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'pedidos', n, 'ventas', v) order by dia) from (
        select (creado_en at time zone 'America/Bogota')::date dia, count(*) n, sum(total) v
        from public.pedidos where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido <> 'cancelado'
        group by 1) d), '[]'::jsonb),
    'por_metodo', coalesce((select jsonb_agg(jsonb_build_object('metodo', metodo_pago, 'pedidos', n, 'ventas', v) order by v desc) from (
        select metodo_pago, count(*) n, sum(total) v from public.pedidos
        where tienda_id = p_tienda and creado_en >= v_desde and estado_pedido <> 'cancelado' group by 1) m), '[]'::jsonb),
    'top_productos', coalesce((select jsonb_agg(jsonb_build_object('nombre', nombre, 'cantidad', c, 'ventas', v) order by c desc, v desc) from (
        select i.nombre, sum(i.cantidad) c, sum(i.subtotal) v
        from public.pedido_items i join public.pedidos p on p.id = i.pedido_id
        where p.tienda_id = p_tienda and p.creado_en >= v_desde and p.estado_pedido <> 'cancelado'
        group by i.nombre order by 2 desc, 3 desc limit 10) t), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.resumen_ventas(uuid, integer) from public, anon;
grant execute on function public.resumen_ventas(uuid, integer) to authenticated;

-- ============ FOTOS DE PRODUCTOS (Storage) ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotos: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and (select privado.es_miembro(((storage.foldername(name))[1])::uuid, array['dueno','admin'])));
create policy "fotos: admin ve" on storage.objects for select to authenticated
  using (bucket_id = 'productos' and (select privado.es_miembro(((storage.foldername(name))[1])::uuid, array['dueno','admin'])));
create policy "fotos: admin cambia" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and (select privado.es_miembro(((storage.foldername(name))[1])::uuid, array['dueno','admin'])));
create policy "fotos: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and (select privado.es_miembro(((storage.foldername(name))[1])::uuid, array['dueno','admin'])));

-- ============ INVITACIÓN DEL DUEÑO (cambiar el correo para otra tienda) ============
insert into public.invitaciones (tienda_id, email, rol)
select id, 'correo-del-dueno@ejemplo.com', 'dueno' from public.tiendas where slug = 'flor-de-lotto';

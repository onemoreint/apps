-- =====================================================================
-- Row Level Security: aislamiento total entre empresas.
-- - authenticated: solo ve/edita filas de SU business_id (vía profiles).
-- - anon: solo lee catálogo público (servicios activos, galería, promociones vigentes,
--   horarios de atención). Nunca lee clientas, citas, pagos ni auditoría.
-- - Las reservas públicas se crean únicamente con la función book_appointment().
-- =====================================================================

-- Negocio del usuario autenticado. SECURITY DEFINER evita recursión de RLS sobre profiles.
create or replace function public.my_business_id() returns uuid
language sql stable security definer set search_path = public as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.is_member(bid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and business_id = bid)
$$;

create or replace function public.has_role(bid uuid, roles public.member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and business_id = bid and role = any(roles))
$$;

revoke all on function public.my_business_id(), public.is_member(uuid), public.has_role(uuid, public.member_role[]) from public, anon, authenticated;
grant execute on function public.my_business_id(), public.is_member(uuid), public.has_role(uuid, public.member_role[]) to authenticated;

-- Activar RLS en todas las tablas
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.staff enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.availability_rules enable row level security;
alter table public.schedule_blocks enable row level security;
alter table public.payments enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.promotions enable row level security;
alter table public.gallery_items enable row level security;
alter table public.consent_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.booking_requests_log enable row level security;

-- ---------- businesses ----------
-- anon solo puede leer columnas públicas (grant por columna) de negocios activos.
revoke select on public.businesses from anon;
grant select (id, name, slug, timezone, address, whatsapp, instagram, welcome, active) on public.businesses to anon;
create policy businesses_public_read on public.businesses for select to anon using (active);
create policy businesses_member_read on public.businesses for select to authenticated using (public.is_member(id));
create policy businesses_owner_update on public.businesses for update to authenticated
  using (public.has_role(id, array['owner','admin']::public.member_role[]))
  with check (public.has_role(id, array['owner','admin']::public.member_role[]));

-- ---------- profiles ----------
create policy profiles_self_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(business_id, array['owner','admin']::public.member_role[]));
create policy profiles_owner_manage on public.profiles for all to authenticated
  using (public.has_role(business_id, array['owner']::public.member_role[]))
  with check (public.has_role(business_id, array['owner']::public.member_role[]));

-- ---------- Tablas privadas del negocio: acceso completo solo para miembros ----------
do $$
declare t text;
begin
  foreach t in array array['staff','services','clients','appointments','availability_rules','schedule_blocks','payments','promotions','gallery_items'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_member(business_id)) with check (public.is_member(business_id))',
      t || '_member_all', t);
  end loop;
end $$;

-- Movimientos de puntos y consentimientos: los miembros leen e insertan; no se editan ni borran (trazabilidad).
create policy loyalty_member_read on public.loyalty_transactions for select to authenticated using (public.is_member(business_id));
create policy loyalty_member_insert on public.loyalty_transactions for insert to authenticated with check (public.is_member(business_id));
create policy consent_member_read on public.consent_records for select to authenticated using (public.is_member(business_id));
create policy consent_member_insert on public.consent_records for insert to authenticated with check (public.is_member(business_id));

-- Auditoría: solo lectura para owner/admin. Se escribe únicamente desde triggers.
create policy audit_admin_read on public.audit_logs for select to authenticated
  using (public.has_role(business_id, array['owner','admin']::public.member_role[]));
-- booking_requests_log: sin políticas → inaccesible salvo funciones SECURITY DEFINER.

-- ---------- Lectura pública del catálogo ----------
create policy services_public_read on public.services for select to anon using (active);
create policy gallery_public_read on public.gallery_items for select to anon using (true);
create policy promotions_public_read on public.promotions for select to anon
  using (active and current_date between valid_from and valid_to);
create policy staff_public_read on public.staff for select to anon using (active);
create policy availability_public_read on public.availability_rules for select to anon using (true);

-- anon nunca escribe directamente
revoke insert, update, delete on all tables in schema public from anon;

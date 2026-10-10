-- =============================================================================
-- OptiConsulta · Migración 0004 · RLS y privilegios
-- -----------------------------------------------------------------------------
-- Principio: anon no tiene acceso a ninguna tabla. authenticated solo tiene los
-- privilegios de tabla que su política permite; todo alta o cambio sensible
-- (crear organización, membresías, permisos, invitaciones) pasa por RPC.
-- =============================================================================

-- RLS activada en todas las tablas del esquema public creadas hasta aquí.
alter table public.organizations    enable row level security;
alter table public.locations        enable row level security;
alter table public.profiles         enable row level security;
alter table public.memberships      enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.org_settings     enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.invitations      enable row level security;

-- Nota: no se usa FORCE ROW LEVEL SECURITY. Las funciones SECURITY DEFINER
-- pertenecen a postgres (BYPASSRLS en Supabase) y deben poder leer membresías
-- sin recursión; FORCE no añadiría protección frente a anon/authenticated.

-- Privilegios: partir de cero y conceder lo mínimo.
revoke all on table
  public.organizations, public.locations, public.profiles, public.memberships,
  public.permissions, public.role_permissions, public.org_settings,
  public.audit_logs, public.invitations
from anon, authenticated;

grant select on public.organizations    to authenticated;
grant update (trade_name, legal_name, nit, timezone) on public.organizations to authenticated;
grant select on public.locations        to authenticated;
grant insert (organization_id, name, address, city, phone) on public.locations to authenticated;
grant update (name, address, city, phone, is_active)        on public.locations to authenticated;
grant select on public.profiles         to authenticated;
grant update (full_name, phone)         on public.profiles to authenticated;
grant select on public.memberships      to authenticated;
grant select on public.permissions      to authenticated;
grant select on public.role_permissions to authenticated;
grant select on public.org_settings     to authenticated;
grant update (discount_threshold_pct, cylinder_convention, receipt_footer) on public.org_settings to authenticated;
grant select on public.audit_logs       to authenticated;
grant select on public.invitations      to authenticated;

-- Las secuencias de identidad no se usan desde el cliente.
revoke all on all sequences in schema public from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Políticas
-- -----------------------------------------------------------------------------

-- organizations
create policy organizations_select on public.organizations
  for select to authenticated
  using ((select private.is_member(id)));

create policy organizations_update on public.organizations
  for update to authenticated
  using ((select private.has_permission(id, 'settings.manage')))
  with check ((select private.has_permission(id, 'settings.manage')));

-- locations
create policy locations_select on public.locations
  for select to authenticated
  using ((select private.is_member(organization_id)));

create policy locations_insert on public.locations
  for insert to authenticated
  with check ((select private.has_permission(organization_id, 'settings.manage')));

create policy locations_update on public.locations
  for update to authenticated
  using ((select private.has_permission(organization_id, 'settings.manage')))
  with check ((select private.has_permission(organization_id, 'settings.manage')));

-- profiles: el propio y los de colegas de alguna organización compartida.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.shares_org_with(id)));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- memberships: cada miembro ve el equipo de su organización. Sin escritura directa.
create policy memberships_select on public.memberships
  for select to authenticated
  using ((select private.is_member(organization_id)) or user_id = (select auth.uid()));

-- permissions: catálogo público para usuarios autenticados.
create policy permissions_select on public.permissions
  for select to authenticated
  using (true);

-- role_permissions
create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using ((select private.is_member(organization_id)));

-- org_settings
create policy org_settings_select on public.org_settings
  for select to authenticated
  using ((select private.is_member(organization_id)));

create policy org_settings_update on public.org_settings
  for update to authenticated
  using ((select private.has_permission(organization_id, 'settings.manage')))
  with check ((select private.has_permission(organization_id, 'settings.manage')));

-- audit_logs: solo lectura con permiso.
create policy audit_logs_select on public.audit_logs
  for select to authenticated
  using ((select private.has_permission(organization_id, 'audit.read')));

-- invitations: quien gestiona usuarios.
create policy invitations_select on public.invitations
  for select to authenticated
  using ((select private.has_permission(organization_id, 'users.manage')));

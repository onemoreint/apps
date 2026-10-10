-- =============================================================================
-- OptiConsulta · Migración 0005 · Funciones RPC de tenencia y acceso
-- -----------------------------------------------------------------------------
-- Toda función expuesta es SECURITY DEFINER con search_path vacío, verifica la
-- sesión y el permiso internamente y registra auditoría.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Crear organización (onboarding). El creador queda como propietario.
-- -----------------------------------------------------------------------------
create or replace function public.create_organization(
  p_trade_name    text,
  p_slug          text,
  p_legal_name    text,
  p_nit           text,
  p_timezone      text,
  p_location_name text,
  p_location_city text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_org uuid;
  v_loc uuid;
begin
  if v_uid is null then
    raise exception 'Sesión requerida' using errcode = '28000';
  end if;

  -- Límite anti-abuso: un usuario no puede crear más de 3 organizaciones reales.
  if (select count(*) from public.organizations o
       where o.created_by = v_uid and not o.is_demo) >= 3 then
    raise exception 'Límite de organizaciones alcanzado' using errcode = '54000';
  end if;

  insert into public.organizations (slug, trade_name, legal_name, nit, timezone, created_by)
  values (
    lower(trim(p_slug)),
    trim(p_trade_name),
    nullif(trim(p_legal_name), ''),
    nullif(trim(p_nit), ''),
    coalesce(nullif(trim(p_timezone), ''), 'America/Bogota'),
    v_uid
  )
  returning id into v_org;

  insert into public.org_settings (organization_id) values (v_org);

  insert into public.locations (organization_id, name, city)
  values (v_org, trim(p_location_name), nullif(trim(p_location_city), ''))
  returning id into v_loc;

  insert into public.role_permissions (organization_id, role, permission_code)
  select v_org, d.role, d.permission_code from private.default_role_permissions d;

  insert into public.memberships (organization_id, user_id, role, status, location_id)
  values (v_org, v_uid, 'propietario', 'activa', v_loc);

  perform private.write_audit(v_org, 'organization.create', 'organizations', v_org::text);
  return v_org;
end;
$$;

-- -----------------------------------------------------------------------------
-- Invitaciones
-- -----------------------------------------------------------------------------
create or replace function public.invite_member(
  p_org   uuid,
  p_email text,
  p_role  public.membership_role
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
  v_inv   uuid;
begin
  perform private.require_permission(p_org, 'users.manage');

  if p_role = 'propietario' and private.member_role(p_org) <> 'propietario' then
    raise exception 'Solo un propietario puede invitar a otro propietario' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.memberships m
      join auth.users u on u.id = m.user_id
     where m.organization_id = p_org and lower(u.email) = lower(trim(p_email))
  ) then
    raise exception 'El usuario ya pertenece a la organización' using errcode = '23505';
  end if;

  -- Una sola invitación pendiente por correo: se revoca la anterior.
  update public.invitations
     set revoked_at = now()
   where organization_id = p_org
     and email = lower(trim(p_email))::extensions.citext
     and accepted_at is null and revoked_at is null;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.invitations (organization_id, email, role, token_hash, expires_at, invited_by)
  values (
    p_org,
    lower(trim(p_email)),
    p_role,
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    now() + interval '7 days',
    (select auth.uid())
  )
  returning id into v_inv;

  perform private.write_audit(p_org, 'invitation.create', 'invitations', v_inv::text,
                              jsonb_build_object('role', p_role));
  -- El token en claro se devuelve una sola vez para construir el enlace.
  return v_token;
end;
$$;

create or replace function public.revoke_invitation(p_invitation uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.invitations where id = p_invitation;
  if v_org is null then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_org, 'users.manage');

  update public.invitations set revoked_at = now()
   where id = p_invitation and accepted_at is null and revoked_at is null;

  perform private.write_audit(v_org, 'invitation.revoke', 'invitations', p_invitation::text);
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_email text;
  v_inv   public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'Sesión requerida' using errcode = '28000';
  end if;

  select u.email into v_email from auth.users u
   where u.id = v_uid and u.email_confirmed_at is not null;
  if v_email is null then
    raise exception 'Confirma tu correo antes de aceptar la invitación' using errcode = '42501';
  end if;

  select * into v_inv from public.invitations i
   where i.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex')
   for update;

  -- Mismo mensaje para todos los casos: no revelar qué falló.
  if v_inv.id is null
     or v_inv.accepted_at is not null
     or v_inv.revoked_at is not null
     or v_inv.expires_at < now()
     or lower(v_inv.email::text) <> lower(v_email) then
    raise exception 'Invitación no válida o vencida' using errcode = '42501';
  end if;

  insert into public.memberships (organization_id, user_id, role, status, invited_by)
  values (v_inv.organization_id, v_uid, v_inv.role, 'activa', v_inv.invited_by);

  update public.invitations set accepted_at = now() where id = v_inv.id;

  perform private.write_audit(v_inv.organization_id, 'invitation.accept', 'invitations', v_inv.id::text);
  return v_inv.organization_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Gestión de miembros
-- -----------------------------------------------------------------------------
create or replace function private.assert_owner_remains(p_org uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.memberships
     where organization_id = p_org and role = 'propietario' and status = 'activa'
  ) then
    raise exception 'La organización debe conservar al menos un propietario activo'
      using errcode = '23514';
  end if;
end;
$$;
revoke all on function private.assert_owner_remains(uuid) from public;

create or replace function public.update_member_role(
  p_membership uuid,
  p_role       public.membership_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.memberships%rowtype;
begin
  select * into v_target from public.memberships where id = p_membership;
  if v_target.id is null then
    raise exception 'Miembro no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_target.organization_id, 'users.manage');

  -- Bloquea las membresías de la organización para evaluar el último propietario.
  perform 1 from public.memberships
   where organization_id = v_target.organization_id for update;

  if v_target.user_id = (select auth.uid()) then
    raise exception 'No puedes cambiar tu propio rol' using errcode = '42501';
  end if;
  if (v_target.role = 'propietario' or p_role = 'propietario')
     and private.member_role(v_target.organization_id) <> 'propietario' then
    raise exception 'Solo un propietario puede asignar o retirar el rol propietario'
      using errcode = '42501';
  end if;

  update public.memberships set role = p_role where id = p_membership;
  perform private.assert_owner_remains(v_target.organization_id);
end;
$$;

create or replace function public.set_member_status(
  p_membership uuid,
  p_status     public.membership_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.memberships%rowtype;
begin
  select * into v_target from public.memberships where id = p_membership;
  if v_target.id is null then
    raise exception 'Miembro no encontrado' using errcode = 'P0002';
  end if;
  perform private.require_permission(v_target.organization_id, 'users.manage');

  perform 1 from public.memberships
   where organization_id = v_target.organization_id for update;

  if v_target.user_id = (select auth.uid()) then
    raise exception 'No puedes suspender tu propia cuenta' using errcode = '42501';
  end if;
  if v_target.role = 'propietario'
     and private.member_role(v_target.organization_id) <> 'propietario' then
    raise exception 'Solo un propietario puede suspender a otro propietario' using errcode = '42501';
  end if;

  update public.memberships set status = p_status where id = p_membership;
  perform private.assert_owner_remains(v_target.organization_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Permisos por rol (solo propietario mediante roles.manage)
-- -----------------------------------------------------------------------------
create or replace function public.set_role_permission(
  p_org     uuid,
  p_role    public.membership_role,
  p_perm    text,
  p_granted boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_permission(p_org, 'roles.manage');

  if p_role = 'propietario' then
    raise exception 'Los permisos del propietario no se modifican' using errcode = '42501';
  end if;
  if not exists (select 1 from public.permissions where code = p_perm) then
    raise exception 'Permiso inexistente: %', p_perm using errcode = '22023';
  end if;

  if p_granted then
    insert into public.role_permissions (organization_id, role, permission_code)
    values (p_org, p_role, p_perm)
    on conflict do nothing;
  else
    delete from public.role_permissions
     where organization_id = p_org and role = p_role and permission_code = p_perm;
  end if;
end;
$$;

-- Permisos efectivos del usuario de la sesión en una organización.
create or replace function public.my_permissions(p_org uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select rp.permission_code
    from public.memberships m
    join public.role_permissions rp
      on rp.organization_id = m.organization_id and rp.role = m.role
   where m.organization_id = p_org
     and m.user_id = (select auth.uid())
     and m.status = 'activa'
   order by 1;
$$;

-- -----------------------------------------------------------------------------
-- Control de intentos de acceso: 5 fallos en 15 minutos bloquean 15 minutos.
-- Complementa los límites por IP de Supabase Auth.
-- -----------------------------------------------------------------------------
create or replace function private.email_hash(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(lower(trim(coalesce(p_email, ''))), 'sha256'), 'hex');
$$;
revoke all on function private.email_hash(text) from public;

create or replace function public.login_guard(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count  int;
  v_oldest timestamptz;
begin
  select count(*), min(created_at) into v_count, v_oldest
    from (
      select created_at from private.login_failures
       where email_hash = private.email_hash(p_email)
         and created_at > now() - interval '15 minutes'
       order by created_at desc
       limit 5
    ) recent;

  if v_count >= 5 then
    return jsonb_build_object(
      'allowed', false,
      'retry_after_seconds',
      greatest(1, ceil(extract(epoch from (v_oldest + interval '15 minutes' - now())))::int)
    );
  end if;
  return jsonb_build_object('allowed', true, 'retry_after_seconds', 0);
end;
$$;

create or replace function public.record_login_failure(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := private.email_hash(p_email);
begin
  -- Tope por correo para que la tabla no pueda inflarse sin límite.
  if (select count(*) from private.login_failures
       where email_hash = v_hash and created_at > now() - interval '15 minutes') < 20 then
    insert into private.login_failures (email_hash) values (v_hash);
  end if;
  delete from private.login_failures where created_at < now() - interval '1 day';
end;
$$;

-- Solo un usuario autenticado puede limpiar sus propios fallos: un atacante
-- sin la contraseña no puede reiniciar el contador.
create or replace function public.clear_login_failures()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = (select auth.uid());
  if v_email is not null then
    delete from private.login_failures where email_hash = private.email_hash(v_email);
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Privilegios de ejecución. Supabase concede EXECUTE a anon y authenticated por
-- defecto en el esquema public: se revoca todo y se concede explícitamente.
-- -----------------------------------------------------------------------------
revoke all on function public.create_organization(text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.invite_member(uuid, text, public.membership_role)           from public, anon, authenticated;
revoke all on function public.revoke_invitation(uuid)                                     from public, anon, authenticated;
revoke all on function public.accept_invitation(text)                                     from public, anon, authenticated;
revoke all on function public.update_member_role(uuid, public.membership_role)            from public, anon, authenticated;
revoke all on function public.set_member_status(uuid, public.membership_status)           from public, anon, authenticated;
revoke all on function public.set_role_permission(uuid, public.membership_role, text, boolean) from public, anon, authenticated;
revoke all on function public.my_permissions(uuid)                                        from public, anon, authenticated;
revoke all on function public.login_guard(text)                                           from public, anon, authenticated;
revoke all on function public.record_login_failure(text)                                  from public, anon, authenticated;
revoke all on function public.clear_login_failures()                                      from public, anon, authenticated;

grant execute on function public.create_organization(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.invite_member(uuid, text, public.membership_role)           to authenticated;
grant execute on function public.revoke_invitation(uuid)                                     to authenticated;
grant execute on function public.accept_invitation(text)                                     to authenticated;
grant execute on function public.update_member_role(uuid, public.membership_role)            to authenticated;
grant execute on function public.set_member_status(uuid, public.membership_status)           to authenticated;
grant execute on function public.set_role_permission(uuid, public.membership_role, text, boolean) to authenticated;
grant execute on function public.my_permissions(uuid)                                        to authenticated;
grant execute on function public.login_guard(text)                                           to anon, authenticated;
grant execute on function public.record_login_failure(text)                                  to anon, authenticated;
grant execute on function public.clear_login_failures()                                      to authenticated;

-- Las funciones de triggers y auxiliares privadas tampoco deben ser invocables.
revoke all on all functions in schema private from anon;

-- =============================================================================
-- MesaQR — Storage para fotos del menú y logos
-- Lectura pública. Escritura solo para miembros del negocio, dentro de su carpeta:
--   menu-images/{business_id}/archivo.webp
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 1048576, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.storage_business_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_folder text := split_part(p_name, '/', 1);
begin
  if v_folder ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return v_folder::uuid;
  end if;
  return null;
end;
$$;
revoke all on function public.storage_business_id(text) from public, anon;
grant execute on function public.storage_business_id(text) to authenticated;

create policy "menu images: members insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));

create policy "menu images: members update" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));

create policy "menu images: members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-images' and public.is_member(public.storage_business_id(name)));

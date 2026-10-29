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

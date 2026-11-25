-- La función de roles sale de la API pública (esquema privado)
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to anon, authenticated;
alter function public.es_miembro(uuid, text[]) set schema privado;
grant execute on function privado.es_miembro(uuid, text[]) to anon, authenticated;

-- Corrección: en crear_pedido, los avisos de productos se agregan con
-- array_append (ya incluida en 02_funciones_pedidos.sql de este repositorio).

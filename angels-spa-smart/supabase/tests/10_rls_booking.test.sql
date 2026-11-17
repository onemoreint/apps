-- Pruebas de autorización (RLS) y reservas transaccionales.
-- Ejecutar con: npm run test:db   (ver TESTING.md)
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

-- Utilidad: verifica una condición y detiene todo si falla
create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FALLÓ: %', label; end if;
  raise notice 'ok  %', label;
end $$;
-- Utilidad: verifica que una sentencia falle con un mensaje que contenga `expect`
create or replace function pg_temp.fails(sql text, expect text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlerrm ilike '%' || expect || '%' then raise notice 'ok  %', label; return; end if;
    raise exception 'FALLÓ: % (error inesperado: %)', label, sqlerrm;
  end;
  raise exception 'FALLÓ: % (no produjo error)', label;
end $$;
grant execute on all functions in schema pg_temp to anon, authenticated;
set client_min_messages = notice;

-- ---------- Datos de prueba (ficticios) como superusuario ----------
insert into auth.users values ('a0000000-0000-4000-8000-000000000001', 'duena-a@test.local'), ('b0000000-0000-4000-8000-000000000001', 'duena-b@test.local');
insert into businesses (id, name, slug) values
  ('a0000000-0000-4000-8000-0000000000aa', 'Salón A', 'salon-a'),
  ('b0000000-0000-4000-8000-0000000000bb', 'Salón B', 'salon-b');
insert into profiles (id, business_id, role) values
  ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-0000000000aa', 'owner'),
  ('b0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-0000000000bb', 'owner');
insert into staff (id, business_id, name) values
  ('a0000000-0000-4000-8000-0000000000a1', 'a0000000-0000-4000-8000-0000000000aa', 'Profesional A'),
  ('b0000000-0000-4000-8000-0000000000b1', 'b0000000-0000-4000-8000-0000000000bb', 'Profesional B');
insert into services (id, business_id, name, duration_min, price, active) values
  ('a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000aa', 'Manicure', 60, 25000, true),
  ('a0000000-0000-4000-8000-00000000a502', 'a0000000-0000-4000-8000-0000000000aa', 'Oculto', 60, 1, false),
  ('b0000000-0000-4000-8000-00000000b501', 'b0000000-0000-4000-8000-0000000000bb', 'Pedicure', 60, 30000, true);
-- Horario 8:00–20:00 todos los días (pruebas independientes del día de ejecución)
insert into availability_rules (business_id, staff_id, weekday, start_time, end_time)
select 'a0000000-0000-4000-8000-0000000000aa'::uuid, 'a0000000-0000-4000-8000-0000000000a1'::uuid, d, '08:00'::time, '20:00'::time from generate_series(0, 6) d
union all
select 'b0000000-0000-4000-8000-0000000000bb'::uuid, 'b0000000-0000-4000-8000-0000000000b1'::uuid, d, '08:00'::time, '20:00'::time from generate_series(0, 6) d;
insert into clients (id, business_id, name, phone) values
  ('b0000000-0000-4000-8000-00000000c001', 'b0000000-0000-4000-8000-0000000000bb', 'Clienta Privada B', '573109990001');
insert into appointments (id, business_id, client_id, service_id, staff_id, starts_at, ends_at, status, price) values
  ('b0000000-0000-4000-8000-00000000d001', 'b0000000-0000-4000-8000-0000000000bb', 'b0000000-0000-4000-8000-00000000c001', 'b0000000-0000-4000-8000-00000000b501', 'b0000000-0000-4000-8000-0000000000b1',
   ((current_date + 7)::timestamp + time '10:00') at time zone 'America/Bogota', ((current_date + 7)::timestamp + time '11:00') at time zone 'America/Bogota', 'confirmada', 30000);

create or replace function pg_temp.at(days int, hhmm text) returns timestamptz language sql as
$$ select ((current_date + days)::timestamp + hhmm::time) at time zone 'America/Bogota' $$;
grant execute on function pg_temp.at(int, text) to anon, authenticated;

\echo '--- Visitante anónimo (portal público) ---'
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.ok((select count(*) from clients) = 0, 'anon no puede leer clientas');
select pg_temp.ok((select count(*) from appointments) = 0, 'anon no puede leer citas');
select pg_temp.ok((select count(*) from payments) = 0, 'anon no puede leer pagos');
select pg_temp.ok((select count(*) from audit_logs) = 0, 'anon no puede leer auditoría');
select pg_temp.ok((select count(*) from services where business_id = 'a0000000-0000-4000-8000-0000000000aa') = 1, 'anon solo ve servicios activos');
select pg_temp.fails($$select settings from businesses$$, 'permission denied', 'anon no lee la configuración interna del negocio');
select pg_temp.ok((select count(*) from businesses) = 2, 'anon lee columnas públicas de negocios');
select pg_temp.fails($$insert into appointments (business_id, client_id, service_id, staff_id, starts_at, ends_at) values ('a0000000-0000-4000-8000-0000000000aa', gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), now() + interval '1 hour')$$, 'permission denied', 'anon no puede insertar citas directamente');
select pg_temp.fails($$insert into clients (business_id, name, phone) values ('a0000000-0000-4000-8000-0000000000aa', 'Hack', '573000000000')$$, 'permission denied', 'anon no puede insertar clientas directamente');
select pg_temp.fails($$select public.slot_problem('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-0000000000a1', now(), now())$$, 'permission denied', 'anon no ejecuta funciones internas');
select pg_temp.fails($$select public.set_appointment_status('b0000000-0000-4000-8000-00000000d001', 'cancelada')$$, 'permission denied', 'anon no puede cambiar estados');

-- Reserva pública válida
select pg_temp.ok((select status = 'pendiente' from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(7, '10:00'), 'Clienta Prueba Uno', '310 555 0101', 'Francés', true, false)), 'reserva pública crea cita pendiente');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(7, '10:30'), 'Clienta Prueba Dos', '3105550202', '', true, false)$$, 'ocupado', 'rechaza horario superpuesto');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(7, '15:00'), 'Clienta Prueba Uno', '+57 310-555-0101', '', true, false)$$, 'duplicada', 'rechaza solicitud duplicada (mismo teléfono normalizado)');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '10:00'), 'Clienta Tres', '3105550303', '', false, false)$$, 'consentimiento', 'exige autorización de datos');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '10:00'), 'Clienta Tres', '12345', '', true, false)$$, 'telefono', 'valida teléfono');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '10:00'), '<script>', '3105550303', '', true, false)$$, 'nombre', 'valida nombre');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a502', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '10:00'), 'Clienta Tres', '3105550303', '', true, false)$$, 'servicio_inactivo', 'no reserva servicios ocultos');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'b0000000-0000-4000-8000-00000000b501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '10:00'), 'Clienta Tres', '3105550303', '', true, false)$$, 'servicio_inactivo', 'no mezcla servicios de otra empresa');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', now() - interval '1 day', 'Clienta Tres', '3105550303', '', true, false)$$, 'fecha_pasada', 'no reserva en el pasado');
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(8, '19:30'), 'Clienta Tres', '3105550303', '', true, false)$$, 'fuera_de_horario', 'respeta horario de atención');
-- Límite por teléfono: 3 aceptadas en 24 h
select book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(9 + i, '09:00'), 'Clienta Insistente', '3105559999', '', true, false) from generate_series(0, 2) i;
select pg_temp.fails($$select * from book_appointment('a0000000-0000-4000-8000-0000000000aa', 'a0000000-0000-4000-8000-00000000a501', 'a0000000-0000-4000-8000-0000000000a1', pg_temp.at(13, '09:00'), 'Clienta Insistente', '3105559999', '', true, false)$$, 'limite', 'limita solicitudes por teléfono');
select pg_temp.ok((select count(*) from get_busy_intervals('a0000000-0000-4000-8000-0000000000aa', now(), now() + interval '30 days')) = 4, 'portal obtiene horarios ocupados sin datos personales');
reset role;

\echo '--- Dueña del Salón A (authenticated) ---'
set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', false);
select pg_temp.ok((select count(*) from clients) = 2, 'A ve solo sus clientas');
select pg_temp.ok((select count(*) from clients where business_id = 'b0000000-0000-4000-8000-0000000000bb') = 0, 'A no ve clientas de B');
select pg_temp.ok((select count(*) from appointments where business_id = 'b0000000-0000-4000-8000-0000000000bb') = 0, 'A no ve citas de B');
select pg_temp.fails($$insert into clients (business_id, name, phone) values ('b0000000-0000-4000-8000-0000000000bb', 'Intrusa', '573100000000')$$, 'row-level security', 'A no puede crear clientas en B');
update appointments set internal_notes = 'hack' where id = 'b0000000-0000-4000-8000-00000000d001';
select pg_temp.fails($$select set_appointment_status('b0000000-0000-4000-8000-00000000d001', 'cancelada')$$, 'no_encontrado', 'A no puede cambiar estado de citas de B');
select pg_temp.fails($$select anonymize_client('b0000000-0000-4000-8000-00000000c001')$$, 'no_encontrado', 'A no puede suprimir clientas de B');
-- Superposición directa: la restricción EXCLUDE lo impide incluso sin pasar por la función
select pg_temp.fails($$insert into appointments (business_id, client_id, service_id, staff_id, starts_at, ends_at, status) select business_id, client_id, service_id, staff_id, starts_at + interval '15 min', ends_at + interval '15 min', 'confirmada' from appointments where business_id = 'a0000000-0000-4000-8000-0000000000aa' order by starts_at limit 1$$, 'appointments_no_overlap', 'la base de datos impide citas superpuestas');
-- Estados y fidelización
select set_appointment_status(id, 'confirmada') from appointments where client_notes = 'Francés';
select set_appointment_status(id, 'completada') from appointments where client_notes = 'Francés';
select set_appointment_status(id, 'completada') from appointments where client_notes = 'Francés';
select pg_temp.ok((select sum(points) from loyalty_transactions) = 10, 'completar otorga puntos una sola vez');
select set_appointment_status(id, 'cancelada') from appointments where client_notes = 'Francés';
select pg_temp.ok((select sum(points) from loyalty_transactions) = 0, 'cancelar revierte los puntos');
-- Pagos
select set_appointment_status(id, 'confirmada') from appointments where client_notes = 'Francés';
insert into payments (business_id, appointment_id, client_id, amount, kind, method, paid_on)
select business_id, id, client_id, 10000, 'anticipo', 'Nequi', current_date from appointments where client_notes = 'Francés';
select pg_temp.fails($$insert into payments (business_id, appointment_id, client_id, amount, kind, method, paid_on) select business_id, id, client_id, 20000, 'abono', 'Efectivo', current_date from appointments where client_notes = 'Francés'$$, 'pago_excede_saldo', 'no permite pagar más que el precio');
select pg_temp.ok((select count(*) from audit_logs) > 0 and (select count(*) from audit_logs where business_id <> 'a0000000-0000-4000-8000-0000000000aa') = 0, 'A ve solo su auditoría');
delete from audit_logs;
select pg_temp.ok((select count(*) from audit_logs) > 0, 'la auditoría no se puede borrar');
reset role;
select pg_temp.ok((select internal_notes from appointments where id = 'b0000000-0000-4000-8000-00000000d001') = '', 'el update de A sobre B no tuvo efecto');
select pg_temp.ok((select count(*) from audit_logs where action = 'update' and entity = 'appointments' and detail ? 'status') >= 3, 'cambios de estado quedan auditados');

\echo '--- Dueña del Salón B ---'
set role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-4000-8000-000000000001', false);
select pg_temp.ok((select count(*) from clients) = 1 and (select name from clients) = 'Clienta Privada B', 'B ve solo sus clientas');
select pg_temp.ok((select count(*) from payments) = 0, 'B no ve pagos de A');
reset role;
\echo 'TODAS LAS PRUEBAS DE BASE DE DATOS PASARON'

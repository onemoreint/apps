#!/usr/bin/env bash
# Ejecuta las migraciones y las pruebas de RLS/reservas en un PostgreSQL local y efímero.
# Requiere binarios de PostgreSQL 15+ (initdb, pg_ctl, psql). No usa servicios externos.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-54329}"
DIR="$(mktemp -d /tmp/angels-db-XXXX)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then RUN_AS=(sudo -u postgres); command -v sudo >/dev/null || RUN_AS=(su postgres -s /bin/bash -c); chown postgres "$DIR"; fi
run() { if [ ${#RUN_AS[@]} -eq 0 ]; then "$@"; elif [ "${RUN_AS[0]}" = "su" ]; then "${RUN_AS[@]}" "$(printf '%q ' "$@")"; else "${RUN_AS[@]}" "$@"; fi; }
cleanup() { run "$PGBIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT

run "$PGBIN/initdb" -D "$DIR/data" -U postgres -E UTF8 --locale=C.UTF-8 >/dev/null
run "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -w start >/dev/null
PSQL=("$PGBIN/psql" -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
run "${PSQL[@]}" -c "create database angels_test" >/dev/null
DB=("${PSQL[@]}" -d angels_test)

echo "▸ Aplicando stub local de Supabase y migraciones"
run "${DB[@]}" -f "$ROOT/supabase/tests/00_local_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "  · $(basename "$f")"; run "${DB[@]}" -f "$f"; done

echo "▸ Pruebas de autorización y reservas"
run "${DB[@]}" -f "$ROOT/supabase/tests/10_rls_booking.test.sql" 2>&1 | sed -n 's/^.*NOTICE:  //p; /TODAS LAS/p; /FALLÓ/p; /ERROR/p'

echo "▸ Prueba de concurrencia: 8 reservas simultáneas del mismo horario"
SQL="set role anon; select * from book_appointment('a0000000-0000-4000-8000-0000000000aa','a0000000-0000-4000-8000-00000000a501','a0000000-0000-4000-8000-0000000000a1', ((current_date + 20)::timestamp + time '16:00') at time zone 'America/Bogota', 'Clienta Carrera', '31055520'||lpad(\$n::text,2,'0'), '', true, false);"
for n in $(seq 1 8); do (run "${DB[@]}" -c "${SQL//\$n/$n}" >/dev/null 2>&1 && echo ok || echo rechazada) > "$DIR/r$n" & done
wait
OK=$(cat "$DIR"/r* | grep -c '^ok$' || true)
COUNT=$(run "${DB[@]}" -tA -c "select count(*) from appointments where starts_at = ((current_date + 20)::timestamp + time '16:00') at time zone 'America/Bogota'")
echo "  aceptadas=$OK, citas en BD para ese horario=$COUNT"
if [ "$OK" = "1" ] && [ "$COUNT" = "1" ]; then echo "ok  solo una de 8 reservas concurrentes se aceptó"; else echo "FALLÓ: condición de carrera"; exit 1; fi
echo "✔ Base de datos: todas las pruebas pasaron"

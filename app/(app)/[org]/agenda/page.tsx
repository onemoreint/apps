import type { Metadata } from "next";
import Link from "next/link";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { addDays, isValidDate, todayIn, utcToZoned, weekdayIndex, zonedToUtc } from "@/lib/tz";
import { APPOINTMENT_STATUS, patientName } from "@/lib/clinical-labels";
import { Badge, statusTone } from "@/components/ui/badge";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { agendaViewSchema } from "@/modules/agenda/schemas";
import { AppointmentActions, AppointmentForm } from "./agenda-client";

export const metadata: Metadata = { title: "Agenda" };

const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function longDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return `${WEEKDAYS[weekdayIndex(date)]} ${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`;
}

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ vista?: string; fecha?: string; profesional?: string; nueva?: string; paciente?: string }>;
}) {
  const { org: slug } = await params;
  const sp = await searchParams;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "agenda.read")) return <Forbidden what="la agenda" />;

  const tz = ctx.org.timezone;
  const today = todayIn(tz);
  const view = agendaViewSchema.parse(sp.vista);
  const date = sp.fecha && isValidDate(sp.fecha) ? sp.fecha : today;
  const professionalFilter = sp.profesional ?? "";

  // Rango de fechas de la vista (calendario local de la óptica).
  let from = date;
  let days = 1;
  if (view === "semana") {
    from = addDays(date, -weekdayIndex(date));
    days = 7;
  } else if (view === "mes") {
    const first = `${date.slice(0, 7)}-01`;
    from = addDays(first, -weekdayIndex(first));
    const nextMonth = addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7) + "-01";
    const lastDay = addDays(nextMonth, -1);
    days = Math.round((Date.parse(addDays(lastDay, 7 - weekdayIndex(lastDay))) - Date.parse(from)) / 864e5);
  }
  const to = addDays(from, days);

  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", ctx.org.id)
    .gte("starts_at", zonedToUtc(from, "00:00", tz).toISOString())
    .lt("starts_at", zonedToUtc(to, "00:00", tz).toISOString())
    .order("starts_at");
  if (professionalFilter) query = query.eq("professional_id", professionalFilter);

  const [{ data: appointments }, { data: professionals }, { data: locations }] = await Promise.all([
    query,
    supabase.from("professionals").select("id, full_name, is_active").eq("organization_id", ctx.org.id).order("full_name"),
    supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).eq("is_active", true).order("created_at"),
  ]);

  const patientIds = [...new Set((appointments ?? []).map((a) => a.patient_id).concat(sp.paciente ? [sp.paciente] : []))];
  const { data: patients } = patientIds.length
    ? await supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname, doc_type, doc_number").in("id", patientIds)
    : { data: [] };
  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));
  const profName = new Map((professionals ?? []).map((p) => [p.id, p.full_name]));
  const canWrite = can(ctx, "agenda.write");

  const byDay = new Map<string, NonNullable<typeof appointments>>();
  for (const a of appointments ?? []) {
    const d = utcToZoned(a.starts_at, tz).date;
    byDay.set(d, [...(byDay.get(d) ?? []), a]);
  }

  const step = view === "dia" ? 1 : view === "semana" ? 7 : 0;
  const prev = view === "mes" ? addDays(`${date.slice(0, 7)}-01`, -1).slice(0, 7) + "-01" : addDays(date, -step);
  const next = view === "mes" ? addDays(`${date.slice(0, 7)}-28`, 4).slice(0, 7) + "-01" : addDays(date, step);
  const href = (changes: Record<string, string>) => {
    const q = new URLSearchParams({ vista: view, fecha: date, ...(professionalFilter ? { profesional: professionalFilter } : {}), ...changes });
    return `/${slug}/agenda?${q.toString()}`;
  };
  const title =
    view === "dia"
      ? longDate(date)
      : view === "semana"
        ? `Semana del ${longDate(from).toLowerCase()}`
        : `${MONTHS[Number(date.slice(5, 7)) - 1]} de ${date.slice(0, 4)}`;

  const item = (a: NonNullable<typeof appointments>[number], compact = false) => {
    const p = patientById.get(a.patient_id);
    const start = utcToZoned(a.starts_at, tz).time;
    const end = utcToZoned(a.ends_at, tz).time;
    return (
      <li key={a.id} className={`grid gap-1 rounded-[var(--radius-control)] border border-linea bg-white p-3 ${a.status === "cancelada" ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm">
            <span className="font-semibold text-tinta">
              {start}–{end}
            </span>{" "}
            {p ? (
              <Link href={`/${slug}/pacientes/${p.id}`} className="text-turquesa underline-offset-4 hover:underline">
                {patientName(p)}
              </Link>
            ) : (
              "Paciente"
            )}
          </p>
          <Badge tone={statusTone[a.status]}>{APPOINTMENT_STATUS[a.status]}</Badge>
        </div>
        {!compact ? (
          <p className="text-[13px] text-texto-suave">
            {profName.get(a.professional_id)}
            {a.reason ? ` · ${a.reason}` : ""}
            {a.cancel_reason ? ` · Cancelada: ${a.cancel_reason}` : ""}
          </p>
        ) : (
          <p className="text-[12px] text-texto-suave">{profName.get(a.professional_id)}</p>
        )}
        {canWrite && !compact && ["programada", "confirmada"].includes(a.status) ? (
          <AppointmentActions slug={slug} id={a.id} status={a.status} />
        ) : null}
      </li>
    );
  };

  const prefillPatient = sp.paciente ? patientById.get(sp.paciente) : undefined;

  return (
    <>
      <PageHeader title="Agenda" description={`Horas en ${tz}.`} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Navegar fechas" className="flex flex-wrap items-center gap-2">
          <Link href={href({ fecha: prev })} className="rounded-[var(--radius-control)] border border-linea bg-white px-3 py-2 text-sm hover:border-tinta-suave">
            Anterior
          </Link>
          <Link href={href({ fecha: today })} className="rounded-[var(--radius-control)] border border-linea bg-white px-3 py-2 text-sm hover:border-tinta-suave">
            Hoy
          </Link>
          <Link href={href({ fecha: next })} className="rounded-[var(--radius-control)] border border-linea bg-white px-3 py-2 text-sm hover:border-tinta-suave">
            Siguiente
          </Link>
          <h2 className="ml-2 text-lg font-semibold first-letter:uppercase">{title}</h2>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Vista" className="flex overflow-hidden rounded-[var(--radius-control)] border border-linea bg-white text-sm">
            {(["dia", "semana", "mes"] as const).map((v) => (
              <Link
                key={v}
                href={href({ vista: v })}
                aria-current={view === v ? "page" : undefined}
                className={`px-3 py-2 ${view === v ? "bg-agua font-semibold text-tinta" : "text-texto-suave hover:text-tinta"}`}
              >
                {v === "dia" ? "Día" : v === "semana" ? "Semana" : "Mes"}
              </Link>
            ))}
          </nav>
          <form action={`/${slug}/agenda`} className="flex items-center gap-2">
            <input type="hidden" name="vista" value={view} />
            <input type="hidden" name="fecha" value={date} />
            <label htmlFor="profesional" className="sr-only">
              Profesional
            </label>
            <select id="profesional" name="profesional" defaultValue={professionalFilter} className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-2 text-sm">
              <option value="">Todos los profesionales</option>
              {(professionals ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
            <button type="submit" className="min-h-10 rounded-[var(--radius-control)] border border-linea bg-white px-3 text-sm hover:border-tinta-suave">
              Filtrar
            </button>
          </form>
        </div>
      </div>

      <div className={`grid gap-6 ${canWrite ? "xl:grid-cols-[1fr_380px]" : ""}`}>
        <div className="min-w-0">
          {view === "dia" ? (
            (byDay.get(date) ?? []).length ? (
              <ul className="grid gap-2">{(byDay.get(date) ?? []).map((a) => item(a))}</ul>
            ) : (
              <p className="rounded-[var(--radius-panel)] border border-dashed border-linea bg-white p-6 text-sm text-texto-suave">
                No hay citas este día{professionalFilter ? " para este profesional" : ""}.
              </p>
            )
          ) : view === "semana" ? (
            <div className="grid gap-3 md:grid-cols-7">
              {Array.from({ length: 7 }, (_, i) => addDays(from, i)).map((d) => (
                <section key={d} aria-label={longDate(d)} className="grid content-start gap-2">
                  <Link
                    href={href({ vista: "dia", fecha: d })}
                    className={`text-sm font-semibold ${d === today ? "text-turquesa" : "text-tinta"} underline-offset-4 hover:underline`}
                  >
                    {WEEKDAYS[weekdayIndex(d)]?.slice(0, 3)} {Number(d.slice(8))}
                  </Link>
                  <ul className="grid gap-2">{(byDay.get(d) ?? []).map((a) => item(a, true))}</ul>
                </section>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
                <caption className="sr-only">Citas por día de {title}</caption>
                <thead>
                  <tr>
                    {WEEKDAYS.map((w) => (
                      <th key={w} scope="col" className="pb-2 text-left font-semibold text-tinta">
                        {w.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: days / 7 }, (_, row) => (
                    <tr key={row}>
                      {Array.from({ length: 7 }, (_, col) => {
                        const d = addDays(from, row * 7 + col);
                        const list = (byDay.get(d) ?? []).filter((a) => a.status !== "cancelada");
                        const inMonth = d.slice(0, 7) === date.slice(0, 7);
                        return (
                          <td key={d} className={`h-20 border border-linea p-2 align-top ${inMonth ? "bg-white" : "bg-fondo text-texto-suave"}`}>
                            <Link href={href({ vista: "dia", fecha: d })} className={`block ${d === today ? "font-semibold text-turquesa" : ""}`}>
                              {Number(d.slice(8))}
                              {list.length ? (
                                <span className="mt-1 block text-[12px] text-tinta">
                                  {list.length} {list.length === 1 ? "cita" : "citas"}
                                </span>
                              ) : null}
                            </Link>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {canWrite ? (
          <Panel title="Agendar cita">
            {(professionals ?? []).some((p) => p.is_active) ? (
              <AppointmentForm
                slug={slug}
                defaultDate={date}
                professionals={(professionals ?? []).filter((p) => p.is_active).map((p) => ({ value: p.id, label: p.full_name }))}
                locations={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
                prefill={prefillPatient ? { id: prefillPatient.id, name: patientName(prefillPatient), doc: `${prefillPatient.doc_type} ${prefillPatient.doc_number}` } : null}
                defaultProfessional={professionalFilter}
                open={sp.nueva === "1"}
              />
            ) : (
              <p className="text-sm text-texto-suave">Registra al menos un profesional activo para agendar citas.</p>
            )}
          </Panel>
        ) : null}
      </div>
    </>
  );
}

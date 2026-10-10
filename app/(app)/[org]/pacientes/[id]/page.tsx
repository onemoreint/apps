import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { getMyProfessional } from "@/lib/professional";
import { formatDate, formatDateTime } from "@/lib/format";
import { todayIn, utcToZoned } from "@/lib/tz";
import {
  ageFrom,
  APPOINTMENT_STATUS,
  ENCOUNTER_STATUS,
  formatDiopter,
  patientName,
  PRESCRIPTION_STATUS,
} from "@/lib/clinical-labels";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { getCodeLabels } from "@/modules/catalogs/queries";
import { CONSENT_CHANNELS } from "@/modules/patients/schemas";
import { ConsentForm, RevokeConsentButton } from "./consent-actions";
import { StartEncounterForm } from "./start-encounter";

export const metadata: Metadata = { title: "Paciente" };

const linkButton =
  "inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta hover:border-tinta-suave";

export default async function PacientePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "patients.read")) notFound();

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!patient) notFound();

  const tz = ctx.org.timezone;
  const today = todayIn(tz);
  const canClinical = can(ctx, "clinical.read");
  const canRx = can(ctx, "prescription.read") || canClinical;
  const me = await getMyProfessional(ctx);

  const [consents, texts, appointments, encounters, prescriptions, locations, professionals] = await Promise.all([
    supabase.from("consents").select("*").eq("patient_id", id).order("recorded_at", { ascending: false }),
    supabase.from("consent_texts").select("id, kind, version, title, is_active").eq("organization_id", ctx.org.id),
    can(ctx, "agenda.read")
      ? supabase.from("appointments").select("*").eq("patient_id", id).order("starts_at", { ascending: false }).limit(20)
      : Promise.resolve({ data: [] as never[] }),
    canClinical
      ? supabase
          .from("clinical_encounters")
          .select("id, status, started_at, professional_id, reason_for_visit")
          .eq("patient_id", id)
          .order("started_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as never[] }),
    canRx
      ? supabase
          .from("prescriptions")
          .select("id, series_id, version, status, origin, created_at, validated_at, professional_id, external_issuer_name, lens_type")
          .eq("patient_id", id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("locations").select("id, name").eq("organization_id", ctx.org.id).eq("is_active", true).order("created_at"),
    supabase.from("professionals").select("id, full_name").eq("organization_id", ctx.org.id),
  ]);

  const textById = new Map((texts.data ?? []).map((t) => [t.id, t]));
  const profName = new Map((professionals.data ?? []).map((p) => [p.id, p.full_name]));
  const activeDataConsent = (consents.data ?? []).some(
    (c) => c.decision === "otorgado" && !c.revoked_at && textById.get(c.consent_text_id)?.kind === "tratamiento_datos",
  );
  const activeTexts = (texts.data ?? []).filter((t) => t.is_active);

  // Fórmulas agrupadas por serie: se muestra la versión más reciente de cada una.
  const series = new Map<string, NonNullable<typeof prescriptions.data>[number][]>();
  for (const p of prescriptions.data ?? []) series.set(p.series_id, [...(series.get(p.series_id) ?? []), p]);
  const rxIds = (prescriptions.data ?? []).filter((p) => p.status === "validada").map((p) => p.id);
  const { data: eyes } = rxIds.length
    ? await supabase.from("prescription_eyes").select("prescription_id, eye, sphere, cylinder, axis, addition").in("prescription_id", rxIds)
    : { data: [] };

  const encounterIds = (encounters.data ?? []).map((e) => e.id);
  const { data: diagnoses } = encounterIds.length
    ? await supabase.from("encounter_diagnoses").select("encounter_id, cie10_code").in("encounter_id", encounterIds).eq("kind", "principal")
    : { data: [] };
  const dxLabels = await getCodeLabels([
    ...(diagnoses ?? []).map((d) => ({ catalog: "cie10", code: d.cie10_code })),
    { catalog: "tipo_documento", code: patient.doc_type },
  ]);
  const dxByEncounter = new Map((diagnoses ?? []).map((d) => [d.encounter_id, d.cie10_code]));

  const pendingAppointments = (appointments.data ?? []).filter(
    (a) => ["programada", "confirmada"].includes(a.status) && a.professional_id === me?.id && utcToZoned(a.starts_at, tz).date === today,
  );

  const age = ageFrom(patient.birth_date, today);
  const docLabel = dxLabels.get(`tipo_documento:${patient.doc_type}`) ?? patient.doc_type;

  return (
    <>
      <PageHeader
        title={patientName(patient)}
        description={[
          `${docLabel} ${patient.doc_number}`,
          age !== null ? `${age} años` : null,
          patient.phone,
          patient.payer_name,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            {can(ctx, "patients.write") ? (
              <Link href={`/${slug}/pacientes/${id}/editar`} className={linkButton}>
                Editar ficha
              </Link>
            ) : null}
            {can(ctx, "agenda.write") ? (
              <Link href={`/${slug}/agenda?nueva=1&paciente=${id}`} className={linkButton}>
                Agendar cita
              </Link>
            ) : null}
            {can(ctx, "prescription.external") && activeDataConsent ? (
              <Link href={`/${slug}/formulas/nueva?paciente=${id}&origen=externa`} className={linkButton}>
                Registrar fórmula externa
              </Link>
            ) : null}
          </div>
        }
      />

      {!activeDataConsent ? (
        <div className="mb-6 max-w-3xl">
          <p role="status" className="rounded-[var(--radius-control)] border border-aviso/30 bg-aviso-fondo px-3 py-2.5 text-sm text-aviso">
            Este paciente no tiene autorización vigente de tratamiento de datos. Regístrala antes de iniciar una consulta o
            una fórmula.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="grid content-start gap-6">
          {can(ctx, "clinical.write") ? (
            <Panel title="Atender" description={me ? `Consulta a nombre de ${me.full_name}.` : undefined}>
              {!me ? (
                <p className="text-sm text-texto-suave">
                  Tu usuario no está vinculado a un profesional. Pide que te registren en Profesionales para poder atender.
                </p>
              ) : !activeDataConsent ? (
                <p className="text-sm text-texto-suave">Primero registra la autorización de tratamiento de datos.</p>
              ) : (
                <div className="flex flex-wrap items-start gap-3">
                  <StartEncounterForm
                    slug={slug}
                    patientId={id}
                    locations={locations.data ?? []}
                    appointments={pendingAppointments.map((a) => ({ id: a.id, label: `Cita de las ${utcToZoned(a.starts_at, tz).time}` }))}
                  />
                  {can(ctx, "prescription.write") ? (
                    <Link href={`/${slug}/formulas/nueva?paciente=${id}&origen=interna`} className={linkButton}>
                      Fórmula sin consulta
                    </Link>
                  ) : null}
                </div>
              )}
            </Panel>
          ) : null}

          {canClinical ? (
            <Panel title="Consultas">
              {encounters.data?.length ? (
                <ul className="divide-y divide-linea">
                  {encounters.data.map((e) => {
                    const dx = dxByEncounter.get(e.id);
                    return (
                      <li key={e.id} className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0">
                        <div>
                          <Link href={`/${slug}/consultas/${e.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">
                            {formatDateTime(e.started_at, tz)}
                          </Link>
                          <p className="text-sm text-texto-suave">
                            {profName.get(e.professional_id) ?? "Profesional"}
                            {dx ? ` · ${dx} ${dxLabels.get(`cie10:${dx}`) ?? ""}` : e.reason_for_visit ? ` · ${e.reason_for_visit.slice(0, 80)}` : ""}
                          </p>
                        </div>
                        <Badge tone={statusTone[e.status]}>{ENCOUNTER_STATUS[e.status]}</Badge>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-texto-suave">Sin consultas registradas.</p>
              )}
            </Panel>
          ) : null}

          {canRx ? (
            <Panel title="Fórmulas" description="Se muestra la última versión de cada fórmula; el historial está en su detalle.">
              {series.size ? (
                <ul className="divide-y divide-linea">
                  {[...series.values()].map((versions) => {
                    const latest = versions[0]!;
                    const current = versions.find((v) => v.status === "validada");
                    const od = eyes?.find((e) => e.prescription_id === current?.id && e.eye === "OD");
                    const oi = eyes?.find((e) => e.prescription_id === current?.id && e.eye === "OI");
                    return (
                      <li key={latest.series_id} className="grid gap-1 py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/${slug}/formulas/${latest.id}`} className="font-medium text-turquesa underline-offset-4 hover:underline">
                            {latest.origin === "externa"
                              ? `Externa · ${latest.external_issuer_name}`
                              : `Interna · ${profName.get(latest.professional_id ?? "") ?? "Profesional"}`}
                          </Link>
                          <span className="flex gap-2">
                            {versions.length > 1 ? <Badge>v{latest.version}</Badge> : null}
                            <Badge tone={statusTone[latest.status]}>{PRESCRIPTION_STATUS[latest.status]}</Badge>
                          </span>
                        </div>
                        <p className="text-sm text-texto-suave">
                          {formatDate(latest.created_at, tz)}
                          {od || oi
                            ? ` · OD ${formatDiopter(od?.sphere)} ${od?.cylinder ? `${formatDiopter(od.cylinder)} × ${od.axis}°` : ""} · OI ${formatDiopter(oi?.sphere)} ${oi?.cylinder ? `${formatDiopter(oi.cylinder)} × ${oi.axis}°` : ""}`
                            : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-texto-suave">Sin fórmulas registradas.</p>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <Panel title="Autorizaciones">
            {consents.data?.length ? (
              <ul className="mb-5 grid gap-3">
                {consents.data.map((c) => {
                  const t = textById.get(c.consent_text_id);
                  const channel = CONSENT_CHANNELS.find((ch) => ch.value === c.channel)?.label;
                  return (
                    <li key={c.id} className="grid gap-1 border-b border-linea pb-3 last:border-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-tinta">
                          {t?.title ?? "Texto"} <span className="font-normal text-texto-suave">v{t?.version}</span>
                        </p>
                        <Badge tone={c.revoked_at ? "neutro" : c.decision === "otorgado" ? "exito" : "error"}>
                          {c.revoked_at ? "Revocada" : c.decision === "otorgado" ? "Otorgada" : "Negada"}
                        </Badge>
                      </div>
                      <p className="text-[13px] text-texto-suave">
                        {formatDateTime(c.recorded_at, tz)} · {channel}
                        {c.signed_by_guardian ? " · firmó el acudiente" : ""}
                        {c.revoked_at ? ` · revocada el ${formatDate(c.revoked_at, tz)}: ${c.revocation_reason}` : ""}
                      </p>
                      {!c.revoked_at && c.decision === "otorgado" && can(ctx, "patients.write") ? (
                        <RevokeConsentButton slug={slug} patientId={id} consentId={c.id} />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-texto-suave">Sin autorizaciones registradas.</p>
            )}
            {can(ctx, "patients.write") ? (
              activeTexts.length ? (
                <ConsentForm slug={slug} patientId={id} texts={activeTexts.map((t) => ({ id: t.id, label: `${t.title} (v${t.version})` }))} />
              ) : (
                <p className="text-sm text-texto-suave">
                  La óptica aún no ha publicado sus textos de autorización. Quien gestiona privacidad debe hacerlo en «Privacidad».
                </p>
              )
            ) : null}
          </Panel>

          {can(ctx, "agenda.read") ? (
            <Panel title="Citas">
              {appointments.data?.length ? (
                <ul className="grid gap-2">
                  {appointments.data.map((a) => (
                    <li key={a.id} className="flex items-start justify-between gap-2 text-sm">
                      <span>
                        {formatDateTime(a.starts_at, tz)}
                        <span className="block text-[13px] text-texto-suave">{profName.get(a.professional_id)}</span>
                      </span>
                      <Badge tone={statusTone[a.status]}>{APPOINTMENT_STATUS[a.status]}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-texto-suave">Sin citas.</p>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { getMyProfessional } from "@/lib/professional";
import { formatDateTime } from "@/lib/format";
import { rdaGaps } from "@/lib/rda";
import {
  ENCOUNTER_STATUS,
  formatDiopter,
  patientName,
  PRESCRIPTION_STATUS,
  REFRACTION_METHODS,
} from "@/lib/clinical-labels";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { getCatalogOptions, getCodeLabels, SMALL_CATALOGS } from "@/modules/catalogs/queries";
import { EncounterEditor } from "./encounter-editor";
import { AmendmentForm } from "./amendment-form";
import { toFormValues, type TemplateSection } from "./form-values";

export const metadata: Metadata = { title: "Consulta" };

type Labels = Map<string, string>;
const lbl = (labels: Labels, catalog: string, code: string | null) =>
  code ? `${labels.get(`${catalog}:${code}`) ?? "Código"} (${code})` : "—";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-[13px] font-semibold text-tinta">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm">{value?.trim() ? value : <span className="text-texto-suave">Sin registrar</span>}</dd>
    </div>
  );
}

export default async function ConsultaPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "clinical.read")) notFound();

  const supabase = await createClient();
  const { data: e } = await supabase.from("clinical_encounters").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!e) notFound();

  const [patientRes, locationRes, profRes, va, rx, dx, px, amendments, rxList, settings, professionals] = await Promise.all([
    supabase.from("patients").select("*").eq("id", e.patient_id).single(),
    supabase.from("locations").select("id, name, reps_code").eq("id", e.location_id).single(),
    supabase.from("professionals").select("id, full_name, doc_type, doc_number").eq("id", e.professional_id).single(),
    supabase.from("encounter_visual_acuity").select("*").eq("encounter_id", id),
    supabase.from("encounter_refractions").select("*").eq("encounter_id", id),
    supabase.from("encounter_diagnoses").select("*").eq("encounter_id", id).order("position"),
    supabase.from("encounter_procedures").select("*").eq("encounter_id", id),
    supabase.from("encounter_amendments").select("*").eq("encounter_id", id).order("created_at"),
    supabase.from("prescriptions").select("id, version, status, created_at").eq("encounter_id", id).order("created_at"),
    supabase.from("org_settings").select("av_notation").eq("organization_id", ctx.org.id).single(),
    supabase.from("professionals").select("id, full_name").eq("organization_id", ctx.org.id),
  ]);
  const patient = patientRes.data;
  if (!patient) notFound();

  const allergies = (e.allergies as { type_code: string; allergen: string }[]) ?? [];
  const family = (e.family_history as { cie10_code: string; relationship_code: string }[]) ?? [];
  const risks = (e.risk_factors as { type_code: string; name: string }[]) ?? [];
  const template = (e.template_snapshot as TemplateSection[]) ?? [];
  const findings = (e.findings as Record<string, string>) ?? {};

  const labels = await getCodeLabels([
    ...(dx.data ?? []).map((d) => ({ catalog: "cie10", code: d.cie10_code })),
    ...(px.data ?? []).map((p) => ({ catalog: "cups", code: p.cups_code })),
    ...family.map((f) => ({ catalog: "cie10", code: f.cie10_code })),
    ...(
      [
        ["modalidad", e.modality_code],
        ["grupo_servicio", e.service_group_code],
        ["entorno_atencion", e.environment_code],
        ["via_ingreso", e.admission_route_code],
        ["causa_atencion", e.care_cause_code],
        ["condicion_destino", e.discharge_condition_code],
      ] as const
    ).map(([catalog, code]) => ({ catalog, code })),
  ]);

  const me = await getMyProfessional(ctx);
  const isAuthor = me?.id === e.professional_id;
  const editable = e.status === "borrador" && isAuthor && can(ctx, "clinical.write");
  const profName = new Map((professionals.data ?? []).map((p) => [p.id, p.full_name]));

  const gaps = rdaGaps({
    location: { reps_code: locationRes.data?.reps_code ?? null },
    patient,
    encounter: e,
    diagnoses: (dx.data ?? []).map((d) => ({ kind: d.kind, diagnosis_type_code: d.diagnosis_type_code })),
    professional: profRes.data ?? null,
  });

  let integrity: boolean | null = null;
  if (e.status === "finalizada") {
    const { data } = await supabase.rpc("verify_encounter_integrity", { p_encounter: id });
    integrity = data ?? null;
  }

  const tz = ctx.org.timezone;
  const header = (
    <PageHeader
      title={`Consulta de ${patientName(patient)}`}
      description={`${formatDateTime(e.started_at, tz)} · ${profRes.data?.full_name ?? "Profesional"} · ${locationRes.data?.name ?? ""}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={statusTone[e.status]}>{ENCOUNTER_STATUS[e.status]}</Badge>
          <Link href={`/${slug}/pacientes/${patient.id}`} className="text-sm text-turquesa underline-offset-4 hover:underline">
            Ver ficha del paciente
          </Link>
        </div>
      }
    />
  );

  const rdaPanel = (
    <Panel title="Datos para el RDA" description="Resumen Digital de Atención de consulta externa (anexo técnico de la Res. 1888 de 2025). OptiConsulta todavía no lo genera ni lo envía.">
      {gaps.missing.length === 0 ? (
        <p className="text-sm text-exito">Están todos los datos que OptiConsulta verifica para el RDA.</p>
      ) : (
        <ul className="grid gap-1.5 text-sm">
          {gaps.missing.map((g) => (
            <li key={g.element}>
              <span className="font-medium text-tinta">{g.label}</span>{" "}
              <span className="text-texto-suave">
                · elemento {g.element} · se corrige en {g.where === "sede" ? "Configuración > Sedes" : g.where === "paciente" ? "la ficha del paciente" : g.where === "profesional" ? "Profesionales" : "esta consulta"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {gaps.recommended.length ? (
        <p className="mt-3 text-[13px] text-texto-suave">Recomendados: {gaps.recommended.map((g) => g.label.toLowerCase()).join(", ")}.</p>
      ) : null}
    </Panel>
  );

  const prescriptionsPanel =
    can(ctx, "prescription.read") || isAuthor ? (
      <Panel title="Fórmulas de esta consulta">
        {rxList.data?.length ? (
          <ul className="mb-3 grid gap-2">
            {rxList.data.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/${slug}/formulas/${p.id}`} className="text-turquesa underline-offset-4 hover:underline">
                  Fórmula v{p.version} · {formatDateTime(p.created_at, tz)}
                </Link>
                <Badge tone={statusTone[p.status]}>{PRESCRIPTION_STATUS[p.status]}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-3 text-sm text-texto-suave">Aún no hay fórmulas.</p>
        )}
        {isAuthor && can(ctx, "prescription.write") && e.status !== "anulada" ? (
          <Link
            href={`/${slug}/formulas/nueva?paciente=${patient.id}&origen=interna&consulta=${id}`}
            className="inline-flex min-h-10 items-center rounded-[var(--radius-control)] border border-linea bg-white px-4 text-sm font-semibold text-tinta hover:border-tinta-suave"
          >
            Crear fórmula desde esta consulta
          </Link>
        ) : null}
      </Panel>
    ) : null;

  if (editable) {
    const catalogs = await getCatalogOptions(SMALL_CATALOGS);
    return (
      <>
        {header}
        <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
          <EncounterEditor
            slug={slug}
            encounterId={id}
            version={e.version}
            template={template}
            avNotation={settings.data?.av_notation ?? null}
            catalogs={catalogs}
            defaults={toFormValues(e, va.data ?? [], rx.data ?? [], dx.data ?? [], px.data ?? [], labels)}
          />
          <div className="grid content-start gap-6">
            {rdaPanel}
            {prescriptionsPanel}
          </div>
        </div>
      </>
    );
  }

  const vaCell = (eye: string, distance: string, correction: string) =>
    va.data?.find((v) => v.eye === eye && v.distance === distance && v.correction === correction)?.value ?? "—";

  return (
    <>
      {header}
      {e.status === "anulada" ? (
        <p role="status" className="mb-6 max-w-3xl rounded-[var(--radius-control)] border border-error/30 bg-error-fondo px-3 py-2.5 text-sm text-error">
          Borrador anulado: {e.annul_reason}
        </p>
      ) : null}
      {e.status === "borrador" ? (
        <p role="status" className="mb-6 max-w-3xl rounded-[var(--radius-control)] border border-aviso/30 bg-aviso-fondo px-3 py-2.5 text-sm text-aviso">
          Consulta en curso. Solo {profRes.data?.full_name} puede editarla.
        </p>
      ) : null}
      {integrity === false ? (
        <p role="alert" className="mb-6 max-w-3xl rounded-[var(--radius-control)] border border-error/30 bg-error-fondo px-3 py-2.5 text-sm text-error">
          Alerta de integridad: el contenido de esta consulta no coincide con el sello registrado al finalizarla. Informa al
          administrador para revisar la auditoría y las copias de seguridad.
        </p>
      ) : null}

      <div className="grid gap-6 2xl:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-6">
          <Panel title="Atención">
            <dl className="grid gap-4 md:grid-cols-3">
              <Field label="Modalidad" value={lbl(labels, "modalidad", e.modality_code)} />
              <Field label="Grupo de servicio" value={lbl(labels, "grupo_servicio", e.service_group_code)} />
              <Field label="Entorno" value={lbl(labels, "entorno_atencion", e.environment_code)} />
              <Field label="Vía de ingreso" value={lbl(labels, "via_ingreso", e.admission_route_code)} />
              <Field label="Causa de la atención" value={lbl(labels, "causa_atencion", e.care_cause_code)} />
              <Field label="Condición y destino" value={lbl(labels, "condicion_destino", e.discharge_condition_code)} />
            </dl>
          </Panel>

          <Panel title="Anamnesis">
            <dl className="grid gap-4">
              <Field label="Motivo de consulta" value={e.reason_for_visit} />
              <Field label="Enfermedad actual" value={e.current_illness} />
              <Field label="Antecedentes personales" value={e.personal_history} />
              <Field label="Antecedentes oculares" value={e.ocular_history} />
              <Field label="Medicamentos" value={e.medications} />
              <Field label="Alergias" value={allergies.map((a) => a.allergen).join(", ")} />
              <Field label="Antecedentes familiares" value={family.map((f) => lbl(labels, "cie10", f.cie10_code)).join(", ")} />
              <Field label="Factores de riesgo" value={risks.map((r) => r.name).join(", ")} />
            </dl>
          </Panel>

          <Panel title="Agudeza visual">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="text-left text-tinta">
                  <tr>
                    <th scope="col" className="py-1 font-semibold">Ojo</th>
                    <th scope="col" className="py-1 font-semibold">Lejos sin</th>
                    <th scope="col" className="py-1 font-semibold">Lejos con</th>
                    <th scope="col" className="py-1 font-semibold">Cerca sin</th>
                    <th scope="col" className="py-1 font-semibold">Cerca con</th>
                    <th scope="col" className="py-1 font-semibold">Estenopeico</th>
                  </tr>
                </thead>
                <tbody>
                  {(["OD", "OI", "AO"] as const).map((eye) => (
                    <tr key={eye} className="border-t border-linea">
                      <th scope="row" className="py-1.5 text-left font-semibold">{eye}</th>
                      <td>{vaCell(eye, "lejos", "sin")}</td>
                      <td>{vaCell(eye, "lejos", "con")}</td>
                      <td>{vaCell(eye, "cerca", "sin")}</td>
                      <td>{vaCell(eye, "cerca", "con")}</td>
                      <td>{vaCell(eye, "lejos", "estenopeico")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Refracción">
            {rx.data?.length ? (
              <div className="grid gap-4">
                {REFRACTION_METHODS.filter((m) => rx.data?.some((r) => r.method === m.value)).map((m) => (
                  <div key={m.value} className="overflow-x-auto">
                    <h3 className="mb-1 text-sm font-semibold">{m.label}</h3>
                    <table className="w-full min-w-[520px] text-sm">
                      <thead className="text-left text-texto-suave">
                        <tr>
                          <th scope="col" className="font-medium">Ojo</th>
                          <th scope="col" className="font-medium">Esfera</th>
                          <th scope="col" className="font-medium">Cilindro</th>
                          <th scope="col" className="font-medium">Eje</th>
                          <th scope="col" className="font-medium">Adición</th>
                          <th scope="col" className="font-medium">Prisma</th>
                          <th scope="col" className="font-medium">AV</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rx.data
                          ?.filter((r) => r.method === m.value)
                          .sort((a, b) => a.eye.localeCompare(b.eye))
                          .map((r) => (
                            <tr key={r.id} className="border-t border-linea">
                              <th scope="row" className="py-1 text-left font-semibold">{r.eye}</th>
                              <td>{formatDiopter(r.sphere)}</td>
                              <td>{formatDiopter(r.cylinder)}</td>
                              <td>{r.axis ?? "—"}{r.axis !== null ? "°" : ""}</td>
                              <td>{formatDiopter(r.addition)}</td>
                              <td>{r.prism ? `${r.prism} Δ ${r.prism_base ?? ""}` : "—"}</td>
                              <td>{r.visual_acuity ?? "—"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-texto-suave">Sin refracción registrada.</p>
            )}
          </Panel>

          {template.length ? (
            <Panel title="Examen">
              <dl className="grid gap-4">
                {template.map((s) => (
                  <Field key={s.key} label={s.label} value={findings[s.key]} />
                ))}
              </dl>
            </Panel>
          ) : null}

          <Panel title="Diagnóstico y plan">
            <dl className="grid gap-4">
              <div>
                <dt className="text-[13px] font-semibold text-tinta">Diagnósticos</dt>
                <dd className="text-sm">
                  {dx.data?.length ? (
                    <ol className="grid gap-1">
                      {dx.data.map((d) => (
                        <li key={d.id}>
                          {d.kind === "principal" ? "Principal: " : "Relacionado: "}
                          {lbl(labels, "cie10", d.cie10_code)} · tipo {d.diagnosis_type_code}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <span className="text-texto-suave">Sin registrar</span>
                  )}
                </dd>
              </div>
              <Field
                label="Procedimientos"
                value={(px.data ?? []).map((p) => `${lbl(labels, "cups", p.cups_code)} · ${p.mode}${p.notes ? ` · ${p.notes}` : ""}`).join("\n")}
              />
              <Field label="Análisis" value={e.assessment} />
              <Field label="Conducta y plan" value={e.plan} />
            </dl>
          </Panel>

          {e.status === "finalizada" ? (
            <Panel
              title="Adendas"
              description={`Finalizada el ${formatDateTime(e.finalized_at ?? e.started_at, tz)}. El contenido original no cambia; las correcciones se agregan aquí con su autor.`}
            >
              {amendments.data?.length ? (
                <ul className="mb-5 grid gap-4">
                  {amendments.data.map((a) => (
                    <li key={a.id} className="border-l-2 border-turquesa pl-3">
                      <p className="text-[13px] text-texto-suave">
                        {formatDateTime(a.created_at, tz)} · {profName.get(a.professional_id)} · Motivo: {a.reason}
                      </p>
                      <p className="whitespace-pre-wrap text-sm">{a.content}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-5 text-sm text-texto-suave">Sin adendas.</p>
              )}
              {can(ctx, "clinical.write") && me ? <AmendmentForm slug={slug} encounterId={id} /> : null}
              {integrity ? <p className="mt-4 text-[13px] text-exito">Sello de integridad verificado.</p> : null}
            </Panel>
          ) : null}
        </div>
        <div className="grid content-start gap-6">
          {rdaPanel}
          {prescriptionsPanel}
        </div>
      </div>
    </>
  );
}

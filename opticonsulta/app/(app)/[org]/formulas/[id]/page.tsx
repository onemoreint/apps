import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { getMyProfessional } from "@/lib/professional";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatDiopter, LENS_TYPES, patientName, PRESCRIPTION_STATUS } from "@/lib/clinical-labels";
import { Badge, statusTone } from "@/components/ui/badge";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { PrescriptionEditor } from "../prescription-editor";
import { prescriptionToForm } from "../prescription-values";
import { PrescriptionActions } from "./prescription-actions";

export const metadata: Metadata = { title: "Fórmula" };

export default async function FormulaPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "prescription.read") && !can(ctx, "clinical.read")) notFound();

  const supabase = await createClient();
  const { data: p } = await supabase.from("prescriptions").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!p) notFound();

  const [{ data: eyes }, { data: patient }, { data: series }, { data: professionals }] = await Promise.all([
    supabase.from("prescription_eyes").select("*").eq("prescription_id", id),
    supabase.from("patients").select("id, first_name, second_name, first_surname, second_surname").eq("id", p.patient_id).single(),
    supabase.from("prescriptions").select("id, version, status, created_at, version_reason, professional_id").eq("series_id", p.series_id).order("version"),
    supabase.from("professionals").select("id, full_name").eq("organization_id", ctx.org.id),
  ]);
  if (!patient) notFound();
  const profName = new Map((professionals ?? []).map((x) => [x.id, x.full_name]));

  const me = await getMyProfessional(ctx);
  const canEditInternal = p.origin === "interna" && can(ctx, "prescription.write") && me?.id === p.professional_id;
  const canEditExternal = p.origin === "externa" && can(ctx, "prescription.external") && p.transcribed_by === ctx.userId;
  const editable = p.status === "borrador" && (canEditInternal || canEditExternal);
  const canVersion =
    p.status === "validada" &&
    (p.origin === "interna" ? can(ctx, "prescription.write") && Boolean(me) : can(ctx, "prescription.external")) &&
    !(series ?? []).some((s) => s.status === "borrador");
  const author = p.author_snapshot as { full_name?: string; external_issuer_name?: string; transcribed_by_name?: string } | null;
  const tz = ctx.org.timezone;

  const history = (
    <Panel title="Historial de versiones">
      <ol className="grid gap-2">
        {(series ?? []).map((s) => (
          <li key={s.id} className="grid gap-0.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              {s.id === id ? (
                <span className="font-semibold text-tinta">Versión {s.version} (esta)</span>
              ) : (
                <Link href={`/${slug}/formulas/${s.id}`} className="text-turquesa underline-offset-4 hover:underline">
                  Versión {s.version}
                </Link>
              )}
              <Badge tone={statusTone[s.status]}>{PRESCRIPTION_STATUS[s.status]}</Badge>
            </div>
            <p className="text-[13px] text-texto-suave">
              {formatDateTime(s.created_at, tz)}
              {s.professional_id ? ` · ${profName.get(s.professional_id)}` : ""}
              {s.version_reason ? ` · Motivo: ${s.version_reason}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </Panel>
  );

  const header = (
    <PageHeader
      title={`Fórmula ${p.origin === "externa" ? "externa " : ""}v${p.version}`}
      description={
        <>
          <Link href={`/${slug}/pacientes/${patient.id}`} className="text-turquesa underline-offset-4 hover:underline">
            {patientName(patient)}
          </Link>
          {p.origin === "interna"
            ? ` · ${profName.get(p.professional_id ?? "") ?? "Profesional"}`
            : ` · Emitida por ${p.external_issuer_name}${p.external_issued_on ? ` el ${formatDate(p.external_issued_on, "UTC")}` : ""}`}
          {p.encounter_id && can(ctx, "clinical.read") ? (
            <>
              {" · "}
              <Link href={`/${slug}/consultas/${p.encounter_id}`} className="text-turquesa underline-offset-4 hover:underline">
                ver consulta
              </Link>
            </>
          ) : null}
        </>
      }
      actions={<Badge tone={statusTone[p.status]}>{PRESCRIPTION_STATUS[p.status]}</Badge>}
    />
  );

  if (editable) {
    return (
      <>
        {header}
        <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
          <PrescriptionEditor
            slug={slug}
            origin={p.origin}
            target={{ id: p.id, draftVersion: p.draft_version }}
            defaults={prescriptionToForm(p, eyes ?? [])}
            cylinderConventionLabel={p.origin === "interna" && p.cylinder_convention ? `cilindro ${p.cylinder_convention}` : null}
          />
          <div className="grid min-w-0 content-start gap-6">{history}</div>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      {p.status === "anulada" ? (
        <p role="status" className="mb-6 max-w-3xl rounded-[var(--radius-control)] border border-error/30 bg-error-fondo px-3 py-2.5 text-sm text-error">
          Anulada: {p.annul_reason}
        </p>
      ) : null}
      {p.status === "reemplazada" ? (
        <p role="status" className="mb-6 max-w-3xl rounded-[var(--radius-control)] border border-linea bg-fondo px-3 py-2.5 text-sm text-texto-suave">
          Esta versión fue reemplazada por una corrección posterior. Consulta el historial.
        </p>
      ) : null}
      <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
        <div className="grid min-w-0 content-start gap-6">
          <Panel title="Valores">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Valores por ojo</caption>
                <thead className="text-left text-texto-suave">
                  <tr>
                    {["Ojo", "Esfera", "Cilindro", "Eje", "Adición", "Prisma", "DNP", "Altura", "AV"].map((h) => (
                      <th key={h} scope="col" className="pb-1 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(["OD", "OI"] as const).map((eye) => {
                    const e = eyes?.find((x) => x.eye === eye);
                    return (
                      <tr key={eye} className="border-t border-linea">
                        <th scope="row" className="py-1.5 text-left font-semibold">{eye}</th>
                        <td>{formatDiopter(e?.sphere)}</td>
                        <td>{formatDiopter(e?.cylinder)}</td>
                        <td>{e?.axis !== null && e?.axis !== undefined ? `${e.axis}°` : "—"}</td>
                        <td>{formatDiopter(e?.addition)}</td>
                        <td>{e?.prism ? `${e.prism} Δ ${e.prism_base ?? ""}` : "—"}</td>
                        <td>{e?.dnp ?? "—"}</td>
                        <td>{e?.height ?? "—"}</td>
                        <td>{e?.visual_acuity ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
              <div>
                <dt className="font-semibold text-tinta">Tipo de lente</dt>
                <dd>{LENS_TYPES.find((l) => l.value === p.lens_type)?.label ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-tinta">DP lejos / cerca</dt>
                <dd>
                  {p.pd_far ?? "—"} / {p.pd_near ?? "—"} mm
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-tinta">Uso</dt>
                <dd>{p.usage ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-tinta">Convención</dt>
                <dd>{p.cylinder_convention ? `Cilindro ${p.cylinder_convention}` : "No indicada"}</dd>
              </div>
            </dl>
            {p.observations ? <p className="mt-3 whitespace-pre-wrap text-sm">{p.observations}</p> : null}
            {p.validated_at ? (
              <p className="mt-4 text-[13px] text-texto-suave">
                {p.origin === "interna"
                  ? `Validada por ${author?.full_name ?? "el profesional"} el ${formatDateTime(p.validated_at, tz)}.`
                  : `Transcripción confirmada por ${author?.transcribed_by_name ?? "el usuario"} el ${formatDateTime(p.validated_at, tz)}.`}{" "}
                Código de verificación: {p.content_hash?.slice(0, 12)}
              </p>
            ) : null}
          </Panel>
          <PrescriptionActions
            slug={slug}
            id={p.id}
            canPrint={p.status === "validada"}
            canVersion={canVersion}
            canAnnul={p.status === "validada" && (p.origin === "interna" ? can(ctx, "prescription.write") : can(ctx, "prescription.external"))}
          />
        </div>
        <div className="grid min-w-0 content-start gap-6">{history}</div>
      </div>
    </>
  );
}

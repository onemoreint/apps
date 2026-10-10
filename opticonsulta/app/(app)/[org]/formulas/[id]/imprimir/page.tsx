import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { ageFrom, formatDiopter, LENS_TYPES, patientName } from "@/lib/clinical-labels";
import { todayIn } from "@/lib/tz";
import { PrintButton } from "@/components/ui/print-button";

export const metadata: Metadata = { title: "Fórmula para imprimir" };

type Author = {
  full_name?: string;
  profession?: string;
  professional_card?: string | null;
  credential_verified?: boolean;
  external_issuer_name?: string;
  external_issuer_card?: string | null;
  external_issued_on?: string | null;
  transcribed_by_name?: string;
};

const PROFESSION: Record<string, string> = { optometra: "Optómetra", oftalmologo: "Oftalmólogo", otro: "Profesional de la salud" };

export default async function ImprimirFormulaPage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "prescription.read") && !can(ctx, "clinical.read")) notFound();

  const supabase = await createClient();
  const { data: p } = await supabase.from("prescriptions").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  // Solo la versión vigente se imprime.
  if (!p || p.status !== "validada" || !p.validated_at) notFound();

  const [{ data: eyes }, { data: patient }, { data: encounter }, { data: locations }] = await Promise.all([
    supabase.from("prescription_eyes").select("*").eq("prescription_id", id),
    supabase.from("patients").select("*").eq("id", p.patient_id).single(),
    p.encounter_id ? supabase.from("clinical_encounters").select("location_id").eq("id", p.encounter_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("locations").select("*").eq("organization_id", ctx.org.id).order("created_at"),
  ]);
  if (!patient) notFound();
  const location = locations?.find((l) => l.id === encounter?.location_id) ?? locations?.[0];
  const author = (p.author_snapshot ?? {}) as Author;
  const tz = ctx.org.timezone;
  const age = ageFrom(patient.birth_date, todayIn(tz));

  return (
    <div className="mx-auto max-w-[720px]">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/${slug}/formulas/${id}`} className="text-sm text-turquesa underline-offset-4 hover:underline">
          Volver a la fórmula
        </Link>
        <PrintButton />
      </div>

      <article className="grid gap-6 rounded-[var(--radius-panel)] border border-linea bg-white p-8 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-linea pb-4">
          <div>
            <p className="text-xl font-semibold text-tinta">{ctx.org.trade_name}</p>
            {ctx.org.legal_name ? <p className="text-sm">{ctx.org.legal_name}</p> : null}
            {ctx.org.nit ? <p className="text-sm">NIT {ctx.org.nit}</p> : null}
          </div>
          <div className="text-right text-sm">
            {location ? (
              <>
                <p>{location.name}</p>
                <p>{[location.address, location.city].filter(Boolean).join(", ")}</p>
                {location.phone ? <p>Tel. {location.phone}</p> : null}
              </>
            ) : null}
          </div>
        </header>

        <div>
          <h1 className="text-lg font-semibold">
            {p.origin === "externa" ? "Transcripción de fórmula óptica externa" : "Fórmula óptica"}
          </h1>
          <p className="text-sm text-texto-suave">Fecha: {formatDate(p.validated_at, tz)}</p>
        </div>

        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">Paciente: </dt>
            <dd className="inline">{patientName(patient)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Documento: </dt>
            <dd className="inline">
              {patient.doc_type} {patient.doc_number}
            </dd>
          </div>
          {age !== null ? (
            <div>
              <dt className="inline font-semibold">Edad: </dt>
              <dd className="inline">{age} años</dd>
            </div>
          ) : null}
        </dl>

        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Valores de la fórmula</caption>
          <thead>
            <tr className="border-b-2 border-tinta text-left">
              {["", "Esfera", "Cilindro", "Eje", "Adición", "Prisma", "DNP", "Altura"].map((h) => (
                <th key={h} scope="col" className="py-2 pr-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(["OD", "OI"] as const).map((eye) => {
              const e = eyes?.find((x) => x.eye === eye);
              return (
                <tr key={eye} className="border-b border-linea">
                  <th scope="row" className="py-2 pr-2 text-left font-semibold">{eye}</th>
                  <td className="pr-2">{formatDiopter(e?.sphere)}</td>
                  <td className="pr-2">{formatDiopter(e?.cylinder)}</td>
                  <td className="pr-2">{e?.axis !== null && e?.axis !== undefined ? `${e.axis}°` : "—"}</td>
                  <td className="pr-2">{formatDiopter(e?.addition)}</td>
                  <td className="pr-2">{e?.prism ? `${e.prism} Δ base ${e.prism_base}` : "—"}</td>
                  <td className="pr-2">{e?.dnp ? `${e.dnp} mm` : "—"}</td>
                  <td className="pr-2">{e?.height ? `${e.height} mm` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <dl className="grid gap-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline font-semibold">Tipo de lente: </dt>
            <dd className="inline">{LENS_TYPES.find((l) => l.value === p.lens_type)?.label ?? "—"}</dd>
          </div>
          {p.pd_far || p.pd_near ? (
            <div>
              <dt className="inline font-semibold">Distancia pupilar: </dt>
              <dd className="inline">
                {p.pd_far ? `lejos ${p.pd_far} mm` : ""}
                {p.pd_far && p.pd_near ? " · " : ""}
                {p.pd_near ? `cerca ${p.pd_near} mm` : ""}
              </dd>
            </div>
          ) : null}
          {p.usage ? (
            <div>
              <dt className="inline font-semibold">Uso: </dt>
              <dd className="inline">{p.usage}</dd>
            </div>
          ) : null}
          {p.cylinder_convention ? (
            <div>
              <dt className="inline font-semibold">Convención: </dt>
              <dd className="inline">cilindro {p.cylinder_convention}</dd>
            </div>
          ) : null}
        </dl>
        {p.observations ? <p className="whitespace-pre-wrap text-sm">{p.observations}</p> : null}

        <footer className="grid gap-1 border-t border-linea pt-6 text-sm">
          {p.origin === "interna" ? (
            <>
              <div className="mt-8 w-64 border-t border-texto" aria-hidden="true" />
              <p className="font-semibold">{author.full_name}</p>
              <p>{PROFESSION[author.profession ?? ""] ?? ""}</p>
              {/* La tarjeta solo se imprime si alguien registró su verificación. */}
              {author.credential_verified && author.professional_card ? <p>Tarjeta profesional {author.professional_card}</p> : null}
            </>
          ) : (
            <p>
              Fórmula emitida por {author.external_issuer_name}
              {author.external_issuer_card ? ` (registro ${author.external_issuer_card})` : ""}
              {author.external_issued_on ? ` el ${formatDate(author.external_issued_on, "UTC")}` : ""}. Transcrita por{" "}
              {author.transcribed_by_name} en {ctx.org.trade_name}; esta óptica no la emitió.
            </p>
          )}
          <p className="mt-3 text-[12px] text-texto-suave">
            Versión {p.version} · Código de verificación {p.content_hash?.slice(0, 12)}
          </p>
        </footer>
      </article>
    </div>
  );
}

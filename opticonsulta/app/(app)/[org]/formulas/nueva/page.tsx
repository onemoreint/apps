import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { getMyProfessional } from "@/lib/professional";
import { patientName } from "@/lib/clinical-labels";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { PrescriptionEditor } from "../prescription-editor";
import { emptyPrescription } from "../prescription-values";

export const metadata: Metadata = { title: "Nueva fórmula" };

export default async function NuevaFormulaPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ paciente?: string; origen?: string; consulta?: string }>;
}) {
  const { org: slug } = await params;
  const sp = await searchParams;
  const ctx = await getOrgContext(slug);
  const origin = sp.origen === "externa" ? "externa" : "interna";
  if (!z.uuid().safeParse(sp.paciente).success) notFound();

  if (origin === "externa" && !can(ctx, "prescription.external")) return <Forbidden what="el registro de fórmulas externas" />;
  if (origin === "interna" && !can(ctx, "prescription.write")) return <Forbidden what="la creación de fórmulas" />;
  const me = origin === "interna" ? await getMyProfessional(ctx) : null;
  if (origin === "interna" && !me) {
    return (
      <p className="max-w-prose text-texto-suave">
        Tu usuario no está vinculado a un profesional activo. Pide que te registren en Profesionales para emitir fórmulas.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", sp.paciente!).eq("organization_id", ctx.org.id).maybeSingle();
  if (!patient) notFound();
  const { data: settings } = await supabase.from("org_settings").select("cylinder_convention").eq("organization_id", ctx.org.id).single();

  let encounterId: string | null = null;
  let subjective = null;
  if (origin === "interna" && sp.consulta && z.uuid().safeParse(sp.consulta).success) {
    const { data: enc } = await supabase
      .from("clinical_encounters")
      .select("id, patient_id, professional_id")
      .eq("id", sp.consulta)
      .maybeSingle();
    if (enc && enc.patient_id === patient.id && enc.professional_id === me?.id) {
      encounterId = enc.id;
      const { data: rows } = await supabase.from("encounter_refractions").select("*").eq("encounter_id", enc.id).eq("method", "subjetivo");
      const pick = (eye: "OD" | "OI") => {
        const r = rows?.find((x) => x.eye === eye);
        if (!r) return {};
        const s = (v: string | number | null) => (v === null ? "" : String(v));
        return {
          sphere: s(r.sphere),
          cylinder: s(r.cylinder),
          axis: s(r.axis),
          addition: s(r.addition),
          prism: s(r.prism),
          prismBase: (r.prism_base ?? "") as "",
          visualAcuity: s(r.visual_acuity),
        };
      };
      if (rows?.length) subjective = { od: pick("OD"), oi: pick("OI") };
    }
  }

  const convention = settings?.cylinder_convention;
  return (
    <>
      <PageHeader
        title={origin === "externa" ? "Registrar fórmula externa" : "Nueva fórmula"}
        description={
          <>
            Paciente:{" "}
            <Link href={`/${slug}/pacientes/${patient.id}`} className="text-turquesa underline-offset-4 hover:underline">
              {patientName(patient)}
            </Link>
            {origin === "interna" ? ` · Autor: ${me?.full_name}` : ""}
            {encounterId ? " · vinculada a la consulta" : ""}
          </>
        }
      />
      <PrescriptionEditor
        slug={slug}
        origin={origin}
        target={{ patientId: patient.id, encounterId }}
        defaults={emptyPrescription()}
        subjective={subjective}
        cylinderConventionLabel={origin === "interna" && convention ? `cilindro ${convention}` : null}
      />
    </>
  );
}

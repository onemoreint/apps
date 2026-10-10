import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { can, getOrgContext } from "@/lib/authz";
import { createClient } from "@/lib/supabase/server";
import { patientName } from "@/lib/clinical-labels";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { getCatalogOptions, getCodeLabels, SMALL_CATALOGS } from "@/modules/catalogs/queries";
import { fromPatientRow } from "@/modules/patients/schemas";
import { PatientForm } from "../../patient-form";

export const metadata: Metadata = { title: "Editar paciente" };

export default async function EditarPacientePage({ params }: { params: Promise<{ org: string; id: string }> }) {
  const { org: slug, id } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "patients.write")) return <Forbidden what="la edición de pacientes" />;

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).eq("organization_id", ctx.org.id).maybeSingle();
  if (!patient) notFound();

  const [catalogs, labels] = await Promise.all([
    getCatalogOptions(SMALL_CATALOGS),
    getCodeLabels([
      { catalog: "municipio", code: patient.residence_municipality_code },
      { catalog: "ocupacion", code: patient.occupation_code },
    ]),
  ]);

  return (
    <>
      <PageHeader title={`Editar ficha de ${patientName(patient)}`} description="Si otra persona guarda cambios a la vez, el sistema te pedirá recargar para no sobrescribirlos." />
      <PatientForm
        slug={slug}
        catalogs={catalogs}
        defaults={fromPatientRow(patient)}
        existing={{ id: patient.id, version: patient.version }}
        initialLabels={{
          municipality: labels.get(`municipio:${patient.residence_municipality_code}`) ?? null,
          occupation: labels.get(`ocupacion:${patient.occupation_code}`) ?? null,
        }}
      />
    </>
  );
}

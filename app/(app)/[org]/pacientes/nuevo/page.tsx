import type { Metadata } from "next";
import { can, getOrgContext } from "@/lib/authz";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { getCatalogOptions, SMALL_CATALOGS } from "@/modules/catalogs/queries";
import { PatientForm } from "../patient-form";

export const metadata: Metadata = { title: "Registrar paciente" };

export default async function NuevoPacientePage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params;
  const ctx = await getOrgContext(slug);
  if (!can(ctx, "patients.write")) return <Forbidden what="el registro de pacientes" />;
  const catalogs = await getCatalogOptions(SMALL_CATALOGS);

  return (
    <>
      <PageHeader
        title="Registrar paciente"
        description="Solo son obligatorios el documento, el primer nombre y el primer apellido. Antes de atenderlo, registra su autorización de tratamiento de datos en la ficha."
      />
      <PatientForm
        slug={slug}
        catalogs={catalogs}
        initialLabels={{ municipality: null, occupation: null }}
        defaults={{
          docType: catalogs.tipo_documento?.[0]?.code ?? "",
          docNumber: "",
          firstName: "",
          secondName: "",
          firstSurname: "",
          secondSurname: "",
          birthDate: "",
          sexCode: "",
          genderIdentityCode: "",
          nationalityCode: "",
          ethnicityCode: "",
          ethnicCommunity: "",
          disabilityCode: "",
          occupationCode: "",
          residenceCountryCode: "",
          residenceMunicipalityCode: "",
          residenceZoneCode: "",
          payerCode: "",
          payerName: "",
          phone: "",
          email: "",
          address: "",
          guardianName: "",
          guardianDoc: "",
          guardianRelationship: "",
        }}
      />
    </>
  );
}

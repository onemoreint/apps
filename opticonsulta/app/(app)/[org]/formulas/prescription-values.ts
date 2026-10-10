import type { PrescriptionFormValues } from "@/modules/clinical/schemas";
import type { Database, PrescriptionRow } from "@/lib/supabase/database.types";

type EyeRow = Database["public"]["Tables"]["prescription_eyes"]["Row"];
const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v));

const emptyEye = (): PrescriptionFormValues["od"] => ({
  sphere: "",
  cylinder: "",
  axis: "",
  addition: "",
  prism: "",
  prismBase: "",
  dnp: "",
  height: "",
  visualAcuity: "",
});

export function emptyPrescription(): PrescriptionFormValues {
  return {
    lensType: "",
    usage: "",
    pdFar: "",
    pdNear: "",
    observations: "",
    od: emptyEye(),
    oi: emptyEye(),
    externalIssuerName: "",
    externalIssuerCard: "",
    externalIssuedOn: "",
    cylinderConvention: "",
  };
}

export function prescriptionToForm(p: PrescriptionRow, eyes: EyeRow[]): PrescriptionFormValues {
  const eye = (name: "OD" | "OI"): PrescriptionFormValues["od"] => {
    const e = eyes.find((x) => x.eye === name);
    if (!e) return emptyEye();
    return {
      sphere: s(e.sphere),
      cylinder: s(e.cylinder),
      axis: s(e.axis),
      addition: s(e.addition),
      prism: s(e.prism),
      prismBase: e.prism_base ?? "",
      dnp: s(e.dnp),
      height: s(e.height),
      visualAcuity: s(e.visual_acuity),
    };
  };
  return {
    lensType: p.lens_type ?? "",
    usage: s(p.usage),
    pdFar: s(p.pd_far),
    pdNear: s(p.pd_near),
    observations: s(p.observations),
    od: eye("OD"),
    oi: eye("OI"),
    externalIssuerName: s(p.external_issuer_name),
    externalIssuerCard: s(p.external_issuer_card),
    externalIssuedOn: s(p.external_issued_on),
    cylinderConvention: p.cylinder_convention ?? "",
  };
}

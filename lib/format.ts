// Formatos locales de Colombia. Las fechas se guardan en UTC y se muestran en
// la zona horaria configurada por la organización.

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone }).format(new Date(iso));
}

/**
 * Formatea pesos colombianos. Recibe el valor como string decimal (tal como lo
 * devuelve PostgreSQL para numeric) o como número entero de pesos.
 */
export function formatCOP(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

const AUDIT_LABELS: Record<string, string> = {
  "organization.create": "Creó la óptica",
  "invitation.create": "Invitó a un usuario",
  "invitation.revoke": "Anuló una invitación",
  "invitation.accept": "Aceptó una invitación",
  insert: "Creó",
  update: "Modificó",
  delete: "Eliminó",
};

const ENTITY_LABELS: Record<string, string> = {
  organizations: "datos de la óptica",
  locations: "sede",
  memberships: "membresía",
  role_permissions: "permiso de rol",
  org_settings: "parámetros",
  invitations: "invitación",
};

export function describeAudit(action: string, entity: string): string {
  const verb = AUDIT_LABELS[action] ?? action;
  if (action.includes(".")) return verb;
  return `${verb} ${ENTITY_LABELS[entity] ?? entity}`;
}

import { z } from "zod";
import { emailSchema } from "@/modules/auth/schemas";
import type { MembershipRole } from "@/lib/supabase/database.types";

export const ROLES: { value: MembershipRole; label: string; summary: string }[] = [
  { value: "propietario", label: "Propietario", summary: "Control total, incluidos permisos de roles. Sin acceso clínico por defecto." },
  { value: "administrador", label: "Administrador", summary: "Operación, usuarios y configuración. Sin acceso clínico." },
  { value: "optometra", label: "Optómetra", summary: "Historia clínica y fórmulas. Consulta ventas y laboratorio." },
  { value: "asistente", label: "Asistente", summary: "Agenda, pacientes, ventas, laboratorio y entregas." },
  { value: "cajero", label: "Cajero", summary: "Caja, pagos y ventas. Sin acceso clínico." },
];

export const roleLabel = (role: MembershipRole): string =>
  ROLES.find((r) => r.value === role)?.label ?? role;

export const roleSchema = z.enum(["propietario", "administrador", "optometra", "asistente", "cajero"], {
  message: "Elige un rol",
});

export const inviteSchema = z.object({
  email: emailSchema,
  role: roleSchema,
});

export const memberRoleSchema = z.object({
  membershipId: z.uuid(),
  role: roleSchema,
});

export const memberStatusSchema = z.object({
  membershipId: z.uuid(),
  status: z.enum(["activa", "suspendida"]),
});

export type InviteInput = z.input<typeof inviteSchema>;

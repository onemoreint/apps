import { z } from "zod";
import { isValidDate } from "@/lib/tz";

export const DURATIONS = [15, 20, 30, 40, 45, 60, 90] as const;

export const appointmentSchema = z.object({
  patientId: z.uuid({ message: "Busca y elige un paciente" }),
  professionalId: z.uuid({ message: "Elige el profesional" }),
  locationId: z.uuid({ message: "Elige la sede" }),
  date: z.string().refine(isValidDate, "Elige una fecha válida"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escribe la hora en formato 24 h, por ejemplo 14:30"),
  duration: z.enum(DURATIONS.map(String) as [string, ...string[]], { message: "Elige la duración" }),
  reason: z.string().trim().max(200, "Máximo 200 caracteres"),
});

export type AppointmentInput = z.input<typeof appointmentSchema>;

export const agendaViewSchema = z.enum(["dia", "semana", "mes"]).catch("dia");

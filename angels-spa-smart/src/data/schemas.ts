import { z } from 'zod'
import { normalizePhone } from '../lib/phone'

export const nameSchema = z
  .string()
  .trim()
  .min(3, 'Escribe tu nombre (mínimo 3 letras).')
  .max(80, 'El nombre es demasiado largo.')
  .regex(/^[\p{L}\s.'-]+$/u, 'El nombre solo puede contener letras.')

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => normalizePhone(v) !== null, 'Ingresa un celular válido (ej. 301 234 5678).')

export const publicBookingSchema = z.object({
  serviceId: z.string().min(1, 'Selecciona un servicio.'),
  staffId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha.'),
  startMin: z.number().int().min(0).max(1440),
  name: nameSchema,
  phone: phoneSchema,
  notes: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  consents: z.object({ dataTreatment: z.boolean(), marketing: z.boolean() }),
  honeypot: z.string().optional(),
})

export const contactStepSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  notes: z.string().max(500, 'Máximo 500 caracteres.').optional(),
  dataTreatment: z.literal(true, { error: 'Necesitamos tu autorización para gestionar la reserva.' }),
  marketing: z.boolean(),
  website: z.string().max(0).optional(), // honeypot
})
export type ContactStep = z.infer<typeof contactStepSchema>

export const clientFormSchema = z.object({
  name: z.string().trim().min(2, 'Nombre obligatorio.').max(80),
  phone: phoneSchema,
  birthday: z
    .string()
    .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Formato MM-DD')
    .or(z.literal(''))
    .optional(),
  preferences: z.string().max(500).optional(),
  notes: z.string().max(2000).optional(),
  marketing: z.boolean(),
  birthdayConsent: z.boolean(),
})
export type ClientForm = z.infer<typeof clientFormSchema>

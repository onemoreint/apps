import { z } from 'zod'

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'settings.invalidColor')
const optionalText = z.string().trim().max(160).optional().or(z.literal(''))

export const organizationSchema = z.object({
  name: z.string().trim().min(2, 'org.errors.nameRequired').max(160),
  nit: optionalText,
  country: optionalText,
  city: optionalText,
  sector: optionalText,
  primaryColor: hex,
  secondaryColor: hex,
})

export const organizationDetailsSchema = organizationSchema.extend({
  address: optionalText,
  phone: optionalText,
  email: z.string().trim().email('auth.validation.email').optional().or(z.literal('')),
  responsible: optionalText,
})

export type OrganizationValues = z.infer<typeof organizationSchema>
export type OrganizationDetailsValues = z.infer<typeof organizationDetailsSchema>

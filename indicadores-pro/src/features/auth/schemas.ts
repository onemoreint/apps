import { z } from 'zod'

/**
 * Esquemas de validación. Los mensajes son claves i18n; la pantalla las traduce.
 * Las mismas reglas se aplican en el servidor (Supabase Auth / Edge Functions).
 */
export const passwordRule = z
  .string()
  .min(8, 'auth.validation.password')
  .regex(/[A-Za-zÀ-ÿ]/, 'auth.validation.password')
  .regex(/\d/, 'auth.validation.password')

export const loginSchema = z.object({
  email: z.string().trim().email('auth.validation.email'),
  password: z.string().min(1, 'auth.validation.passwordRequired'),
})

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(3, 'auth.validation.fullName'),
    email: z.string().trim().email('auth.validation.email'),
    password: passwordRule,
    passwordConfirm: z.string(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    path: ['passwordConfirm'],
    message: 'auth.validation.passwordMatch',
  })

export const recoverSchema = z.object({
  email: z.string().trim().email('auth.validation.email'),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
export type RecoverValues = z.infer<typeof recoverSchema>

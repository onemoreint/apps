import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { FormAlert } from '@/components/form-alert'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toUserMessageKey } from '@/lib/errors'
import { useAuth } from './auth-context'
import { AuthLayout } from './auth-layout'
import { registerSchema, type RegisterValues } from './schemas'

export function RegisterPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [confirmSent, setConfirmSent] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', password: '', passwordConfirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ fullName, email, password }) => {
    setError(null)
    try {
      const result = await signUp({ fullName, email, password })
      if (result.status === 'confirm_email') setConfirmSent(true)
      else navigate('/', { replace: true })
    } catch (e) {
      setError(toUserMessageKey(e))
    }
  })

  return (
    <AuthLayout title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')}>
      {confirmSent ? (
        <div className="space-y-4">
          <FormAlert tone="success">{t('auth.confirmEmailSent')}</FormAlert>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/login">{t('auth.backToLogin')}</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {error && <FormAlert tone="error">{t(error)}</FormAlert>}
          <Field label={t('auth.fullName')} error={errors.fullName && t(errors.fullName.message!)}>
            <Input autoComplete="name" autoFocus {...form.register('fullName')} />
          </Field>
          <Field label={t('auth.email')} error={errors.email && t(errors.email.message!)}>
            <Input type="email" autoComplete="email" inputMode="email" {...form.register('email')} />
          </Field>
          <Field
            label={t('auth.password')}
            hint={t('auth.passwordHint')}
            error={errors.password && t(errors.password.message!)}
          >
            <PasswordInput autoComplete="new-password" {...form.register('password')} />
          </Field>
          <Field label={t('auth.passwordConfirm')} error={errors.passwordConfirm && t(errors.passwordConfirm.message!)}>
            <PasswordInput autoComplete="new-password" {...form.register('passwordConfirm')} />
          </Field>
          <Button type="submit" className="w-full" loading={isSubmitting}>
            {isSubmitting ? t('auth.signingUp') : t('auth.signUp')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('auth.signIn')}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}

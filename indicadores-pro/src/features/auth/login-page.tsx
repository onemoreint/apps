import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FormAlert } from '@/components/form-alert'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toUserMessageKey } from '@/lib/errors'
import { useAuth } from './auth-context'
import { AuthLayout } from './auth-layout'
import { DemoButton } from './demo-button'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await signIn(values.email, values.password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(toUserMessageKey(e))
    }
  })

  return (
    <AuthLayout title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <FormAlert tone="error">{t(error)}</FormAlert>}
        <Field label={t('auth.email')} error={errors.email && t(errors.email.message!)}>
          <Input type="email" autoComplete="email" inputMode="email" autoFocus {...form.register('email')} />
        </Field>
        <Field label={t('auth.password')} error={errors.password && t(errors.password.message!)}>
          <PasswordInput autoComplete="current-password" {...form.register('password')} />
        </Field>
        <div className="flex justify-end">
          <Link to="/recuperar" className="text-sm font-medium text-primary hover:underline">
            {t('auth.forgot')}
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/registro" className="font-medium text-primary hover:underline">
            {t('auth.signUp')}
          </Link>
        </p>
      </form>
      <div className="mt-6">
        <DemoButton />
      </div>
    </AuthLayout>
  )
}

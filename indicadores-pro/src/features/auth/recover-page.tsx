import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FormAlert } from '@/components/form-alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { toUserMessageKey } from '@/lib/errors'
import { useAuth } from './auth-context'
import { AuthLayout } from './auth-layout'
import { recoverSchema, type RecoverValues } from './schemas'

export function RecoverPage() {
  const { t } = useTranslation()
  const { requestPasswordReset } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const form = useForm<RecoverValues>({ resolver: zodResolver(recoverSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (e) {
      setError(toUserMessageKey(e))
    }
  })

  return (
    <AuthLayout title={t('auth.recoverTitle')} subtitle={t('auth.recoverSubtitle')}>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <FormAlert tone="error">{t(error)}</FormAlert>}
        {sent && <FormAlert tone="success">{t('auth.resetSent')}</FormAlert>}
        <Field label={t('auth.email')} error={errors.email && t(errors.email.message!)}>
          <Input type="email" autoComplete="email" inputMode="email" autoFocus {...form.register('email')} />
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          {t('auth.sendLink')}
        </Button>
        <p className="text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('auth.backToLogin')}
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}

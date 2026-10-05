import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormAlert } from '@/components/form-alert'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { appConfig } from '@/config/app.config'
import { useAuth } from '@/features/auth/auth-context'
import { OnboardingProgress } from '@/features/dashboard/onboarding-progress'
import { toUserMessageKey } from '@/lib/errors'
import { BrandPreview } from './brand-preview'
import { ColorInput } from './color-field'
import { useOrganization } from './organization-context'
import { organizationSchema, type OrganizationValues } from './schemas'

export function CreateOrganizationPage() {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const { create, organizations } = useOrganization()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const form = useForm<OrganizationValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      nit: '',
      country: 'Colombia',
      city: '',
      sector: '',
      primaryColor: appConfig.defaultBrand.primary,
      secondaryColor: appConfig.defaultBrand.secondary,
    },
  })
  const { errors, isSubmitting } = form.formState
  const [name, primary, secondary] = form.watch(['name', 'primaryColor', 'secondaryColor'])

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null)
    try {
      await create({ ...values, nit: values.nit || undefined })
      toast.success(t('org.created'))
      navigate('/', { replace: true })
    } catch (e) {
      setError(toUserMessageKey(e, 'org.errors.createFailed'))
    }
  })

  const msg = (m?: string) => (m ? t(m) : undefined)

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            {t('topbar.signOut')}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <OnboardingProgress current={0} />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <form onSubmit={onSubmit} noValidate className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('org.createTitle')}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{t('org.createSubtitle')}</p>
            </div>
            {error && <FormAlert tone="error">{t(error)}</FormAlert>}
            <Field label={t('org.name')} error={msg(errors.name?.message)}>
              <Input autoFocus autoComplete="organization" {...form.register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('org.nit')} optionalText={t('common.optional')} error={msg(errors.nit?.message)}>
                <Input {...form.register('nit')} />
              </Field>
              <Field label={t('org.sector')} optionalText={t('common.optional')} error={msg(errors.sector?.message)}>
                <Input {...form.register('sector')} />
              </Field>
              <Field label={t('org.country')} optionalText={t('common.optional')} error={msg(errors.country?.message)}>
                <Input autoComplete="country-name" {...form.register('country')} />
              </Field>
              <Field label={t('org.city')} optionalText={t('common.optional')} error={msg(errors.city?.message)}>
                <Input autoComplete="address-level2" {...form.register('city')} />
              </Field>
              <Field label={t('org.primaryColor')} error={msg(errors.primaryColor?.message)}>
                <Controller
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => <ColorInput {...field} />}
                />
              </Field>
              <Field label={t('org.secondaryColor')} error={msg(errors.secondaryColor?.message)}>
                <Controller
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => <ColorInput {...field} />}
                />
              </Field>
            </div>
            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              {organizations.length > 0 && (
                <Button type="button" variant="secondary" onClick={() => navigate('/')}>
                  {t('common.cancel')}
                </Button>
              )}
              <Button type="submit" loading={isSubmitting}>
                {isSubmitting ? t('org.creating') : t('org.create')}
              </Button>
            </div>
          </form>
          <aside className="space-y-2">
            <p className="text-sm font-medium">{t('org.preview')}</p>
            <BrandPreview name={name} primary={primary} secondary={secondary} />
          </aside>
        </div>
      </main>
    </div>
  )
}

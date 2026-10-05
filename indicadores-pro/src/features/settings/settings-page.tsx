import { zodResolver } from '@hookform/resolvers/zod'
import { Settings2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { EmptyState } from '@/components/empty-state'
import { FormAlert } from '@/components/form-alert'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { BrandPreview } from '@/features/organization/brand-preview'
import { ColorInput } from '@/features/organization/color-field'
import { useOrganization } from '@/features/organization/organization-context'
import { organizationDetailsSchema, type OrganizationDetailsValues } from '@/features/organization/schemas'
import { toUserMessageKey } from '@/lib/errors'
import { cn } from '@/lib/utils'

type Tab = 'org' | 'system'

export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('org')
  const tabs: { id: Tab; label: string }[] = [
    { id: 'org', label: t('settings.orgTab') },
    { id: 'system', label: t('settings.systemTab') },
  ]
  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div role="tablist" aria-label={t('settings.title')} className="mb-6 flex gap-1 border-b">
        {tabs.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`panel-${x.id}`}
            onClick={() => setTab(x.id)}
            className={cn(
              '-mb-px h-11 border-b-2 px-4 text-sm font-medium transition-colors',
              tab === x.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {x.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'org' ? (
          <OrganizationForm />
        ) : (
          <Card>
            <EmptyState
              icon={Settings2}
              title={t('placeholder.title')}
              body={t('placeholder.body', { phase: 'Fase 3' })}
            />
          </Card>
        )}
      </div>
    </>
  )
}

function OrganizationForm() {
  const { t } = useTranslation()
  const { active, update, can } = useOrganization()
  const editable = can('org.manage')
  const [error, setError] = useState<string | null>(null)

  const toValues = (): OrganizationDetailsValues => ({
    name: active?.name ?? '',
    nit: active?.nit ?? '',
    address: active?.address ?? '',
    phone: active?.phone ?? '',
    email: active?.email ?? '',
    country: active?.country ?? '',
    city: active?.city ?? '',
    sector: active?.sector ?? '',
    responsible: active?.responsible ?? '',
    primaryColor: active?.primaryColor ?? '#2563EB',
    secondaryColor: active?.secondaryColor ?? '#0F172A',
  })

  const form = useForm<OrganizationDetailsValues>({
    resolver: zodResolver(organizationDetailsSchema),
    defaultValues: toValues(),
  })
  const { errors, isSubmitting, isDirty } = form.formState

  // Si cambia la organización activa, se recarga el formulario.
  useEffect(() => {
    form.reset(toValues())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id])

  const [name, primary, secondary] = form.watch(['name', 'primaryColor', 'secondaryColor'])
  const msg = (m?: string) => (m ? t(m) : undefined)
  const empty = (v?: string) => (v && v.trim() ? v.trim() : null)

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null)
    try {
      await update({
        name: v.name.trim(),
        nit: empty(v.nit),
        address: empty(v.address),
        phone: empty(v.phone),
        email: empty(v.email),
        country: empty(v.country),
        city: empty(v.city),
        sector: empty(v.sector),
        responsible: empty(v.responsible),
        primaryColor: v.primaryColor,
        secondaryColor: v.secondaryColor,
      })
      form.reset(v)
      toast.success(t('settings.orgSaved'))
    } catch (e) {
      setError(toUserMessageKey(e, 'org.errors.saveFailed'))
    }
  })

  if (!active) return null

  return (
    <form onSubmit={onSubmit} noValidate>
      <fieldset disabled={!editable || isSubmitting} className="space-y-6">
        {!editable && <FormAlert tone="info">{t('settings.readOnly')}</FormAlert>}
        {error && <FormAlert tone="error">{t(error)}</FormAlert>}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{t('settings.identity')}</CardTitle>
              {active.isDemo && <Badge tone="demo">{t('common.demoBadge')}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t('org.name')} error={msg(errors.name?.message)} className="sm:col-span-2">
              <Input {...form.register('name')} />
            </Field>
            <Field label={t('org.nit')} optionalText={t('common.optional')} error={msg(errors.nit?.message)}>
              <Input {...form.register('nit')} />
            </Field>
            <Field label={t('org.sector')} optionalText={t('common.optional')} error={msg(errors.sector?.message)}>
              <Input {...form.register('sector')} />
            </Field>
            <Field label={t('settings.responsible')} optionalText={t('common.optional')} error={msg(errors.responsible?.message)} className="sm:col-span-2">
              <Input {...form.register('responsible')} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.contact')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={t('settings.address')} optionalText={t('common.optional')} error={msg(errors.address?.message)} className="sm:col-span-2">
              <Input autoComplete="street-address" {...form.register('address')} />
            </Field>
            <Field label={t('settings.phone')} optionalText={t('common.optional')} error={msg(errors.phone?.message)}>
              <Input type="tel" autoComplete="tel" {...form.register('phone')} />
            </Field>
            <Field label={t('settings.email')} optionalText={t('common.optional')} error={msg(errors.email?.message)}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
            <Field label={t('org.country')} optionalText={t('common.optional')} error={msg(errors.country?.message)}>
              <Input autoComplete="country-name" {...form.register('country')} />
            </Field>
            <Field label={t('org.city')} optionalText={t('common.optional')} error={msg(errors.city?.message)}>
              <Input autoComplete="address-level2" {...form.register('city')} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.brand')}</CardTitle>
            <CardDescription>{t('settings.brandHint')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
              <Field label={t('org.primaryColor')} error={msg(errors.primaryColor?.message)}>
                <Controller control={form.control} name="primaryColor" render={({ field }) => <ColorInput {...field} />} />
              </Field>
              <Field label={t('org.secondaryColor')} error={msg(errors.secondaryColor?.message)}>
                <Controller control={form.control} name="secondaryColor" render={({ field }) => <ColorInput {...field} />} />
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-2 md:col-span-1 xl:col-span-2">{t('settings.logosLater')}</p>
            </div>
            <BrandPreview name={name} primary={primary} secondary={secondary} />
          </CardContent>
        </Card>

        {editable && (
          <div className="sticky bottom-0 -mx-4 flex justify-end gap-3 border-t bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
            <Button type="button" variant="secondary" disabled={!isDirty} onClick={() => form.reset(toValues())}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              {isSubmitting ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  )
}

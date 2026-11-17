import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Calendar, Check, CheckCircle2, ChevronLeft, Clock, MessageCircle, Moon, Sun, User } from 'lucide-react'
import { useData, useStore } from '../data/store'
import { availableSlots } from '../lib/availability'
import { addDays, formatDateLong, formatTime, parseDate, today, weekdayShort, monthName } from '../lib/time'
import { durationLabel, money } from '../lib/format'
import { buildMessage, waLink } from '../lib/whatsapp'
import { contactStepSchema, type ContactStep } from '../data/schemas'
import { Alert, Button, Card, Checkbox, DemoArt, DemoRibbon, Field, Input, LinkButton, Logo, Textarea, cx } from '../components/ui'
import { APP_MODE } from '../data'
import type { Appointment } from '../types'

const STEPS = ['Servicio', 'Fecha', 'Horario', 'Tus datos', 'Confirmar']

export function BookingFlow() {
  const data = useData()
  const { run } = useStore()
  const [params] = useSearchParams()
  const services = data.services.filter((s) => s.active).sort((a, b) => a.order - b.order)
  const pre = services.find((s) => s.id === params.get('servicio'))
  const [step, setStep] = useState(pre ? 1 : 0)
  const [serviceId, setServiceId] = useState<string | null>(pre?.id ?? null)
  const [date, setDate] = useState<string | null>(null)
  const [startMin, setStartMin] = useState<number | null>(null)
  const [contact, setContact] = useState<ContactStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<Appointment | null>(null)

  const service = services.find((s) => s.id === serviceId)
  const staff = data.staff.find((s) => s.active)
  const base = useMemo(
    () =>
      service && staff
        ? { business: data.business, rules: data.availability, blocks: data.blocks, appointments: data.appointments, staffId: staff.id, durationMin: service.durationMin }
        : null,
    [service, staff, data],
  )

  const days = useMemo(() => {
    const t = today()
    const n = Math.min(data.business.maxDaysAhead, 28)
    return Array.from({ length: n + 1 }, (_, i) => addDays(t, i)).map((d) => ({ date: d, count: base ? availableSlots({ ...base, date: d }).length : 0 }))
  }, [base, data.business.maxDaysAhead])

  const slots = useMemo(() => (base && date ? availableSlots({ ...base, date }) : []), [base, date])

  const form = useForm<ContactStep>({
    resolver: zodResolver(contactStepSchema),
    defaultValues: contact ?? { name: '', phone: '', notes: params.get('diseno') ?? '', dataTreatment: false as unknown as true, marketing: false, website: '' },
    mode: 'onTouched',
  })

  const go = (n: number) => {
    setError(null)
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function confirm() {
    if (!service || !date || startMin === null || !contact) return
    setBusy(true)
    setError(null)
    const res = await run((a) =>
      a.createPublicBooking({
        serviceId: service.id,
        staffId: staff?.id,
        date,
        startMin,
        name: contact.name,
        phone: contact.phone,
        notes: contact.notes,
        consents: { dataTreatment: contact.dataTreatment, marketing: contact.marketing },
        honeypot: contact.website,
      }),
    )
    setBusy(false)
    if (res.ok) setDone(res.value)
    else {
      setError(res.error)
      // Si el horario se ocupó mientras tanto, regresar a elegir horario
      if (/reservado|bloqueado|próximo|horario/i.test(res.error)) setStartMin(null)
    }
  }

  if (done && service && contact) {
    const msg = buildMessage('solicitud', { businessName: data.business.name, clientName: contact.name, serviceName: service.name, date: done.date, startMin: done.startMin })
    return (
      <Shell>
        <Card className="mx-auto max-w-lg animate-fade-up p-7 text-center sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold">¡Solicitud recibida!</h1>
          <p className="mt-2 text-ink-600">
            Tu cita queda <strong>pendiente de confirmación</strong>. Te confirmaremos por WhatsApp.
          </p>
          <div className="my-6 rounded-3xl bg-blush-50 p-5 text-left text-sm">
            <Summary service={service.name} date={done.date} startMin={done.startMin} duration={service.durationMin} price={done.price} name={contact.name} />
          </div>
          <p className="mb-3 text-sm text-ink-600">¿Quieres avisarnos de inmediato? Envía el mensaje ya preparado:</p>
          <LinkButton href={waLink(data.business.whatsapp, msg)} external variant="whatsapp" size="lg" className="w-full">
            <MessageCircle className="h-5 w-5" /> Enviar por WhatsApp
          </LinkButton>
          <Link to="/" className="mt-4 inline-block text-sm text-ink-600 underline-offset-4 hover:underline">
            Volver al inicio
          </Link>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          {step > 0 ? (
            <button onClick={() => go(step - 1)} className="inline-flex min-h-[44px] items-center gap-1 rounded-full pr-3 text-sm text-ink-600 hover:text-ink">
              <ChevronLeft className="h-5 w-5" /> Atrás
            </button>
          ) : (
            <Link to="/" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-ink-600 hover:text-ink">
              <ArrowLeft className="h-4 w-4" /> Inicio
            </Link>
          )}
          <span className="text-sm text-ink-400">
            Paso {step + 1} de {STEPS.length}
          </span>
        </div>

        {/* Progreso */}
        <ol className="mb-8 grid grid-cols-5 gap-1.5" aria-label="Progreso de la reserva">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col gap-1.5">
              <span className={cx('h-1.5 rounded-full transition-colors', i <= step ? 'bg-rose-700' : 'bg-blush-100')} />
              <span className={cx('hidden text-[11px] sm:block', i === step ? 'font-medium text-rose-800' : 'text-ink-400')} aria-current={i === step ? 'step' : undefined}>
                {s}
              </span>
            </li>
          ))}
        </ol>

        {error && (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        )}

        {/* Paso 1 — Servicio */}
        {step === 0 && (
          <section className="animate-fade-up">
            <h1 className="mb-5 font-display text-3xl font-semibold">¿Qué servicio deseas?</h1>
            <div className="grid grid-cols-1 gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id)
                    setDate(null)
                    setStartMin(null)
                    go(1)
                  }}
                  className={cx('flex items-center gap-4 rounded-3xl border bg-white p-3 text-left transition hover:border-rose hover:shadow-soft', serviceId === s.id ? 'border-rose ring-2 ring-blush-100' : 'border-blush-100')}
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl">
                    <DemoArt tone={s.tone} src={s.imageDataUrl} label={null} alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-semibold">{s.name}</p>
                    <p className="line-clamp-1 text-sm text-ink-600">{s.description}</p>
                    <p className="mt-1 flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1 text-ink-400">
                        <Clock className="h-3.5 w-3.5" /> {durationLabel(s.durationMin)}
                      </span>
                      <span className="font-semibold text-rose-800">{money(s.price)}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Paso 2 — Fecha */}
        {step === 1 && service && (
          <section className="animate-fade-up">
            <h1 className="font-display text-3xl font-semibold">Elige el día</h1>
            <p className="mb-5 mt-1 text-sm text-ink-600">
              {service.name} · {durationLabel(service.durationMin)}
            </p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
              {days.map(({ date: d, count }) => {
                const dt = parseDate(d)
                const disabled = count === 0
                return (
                  <button
                    key={d}
                    disabled={disabled}
                    onClick={() => {
                      setDate(d)
                      setStartMin(null)
                      go(2)
                    }}
                    aria-label={`${formatDateLong(d)}${disabled ? ', sin horarios' : `, ${count} horarios`}`}
                    className={cx(
                      'flex min-h-[78px] flex-col items-center justify-center rounded-2xl border text-center transition',
                      disabled ? 'cursor-not-allowed border-transparent bg-stone-50 text-ink-400/60' : 'border-blush-100 bg-white hover:border-rose hover:shadow-soft',
                      date === d && 'border-rose bg-blush-50 ring-2 ring-blush-100',
                    )}
                  >
                    <span className="text-[11px] uppercase tracking-wider">{weekdayShort(dt.getUTCDay())}</span>
                    <span className="font-display text-2xl font-semibold leading-tight">{dt.getUTCDate()}</span>
                    <span className="text-[10px]">{disabled ? 'Sin cupo' : monthName(dt.getUTCMonth()).slice(0, 3)}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Paso 3 — Horario */}
        {step === 2 && service && date && (
          <section className="animate-fade-up">
            <h1 className="font-display text-3xl font-semibold">Horarios disponibles</h1>
            <p className="mb-5 mt-1 text-sm text-ink-600 first-letter:uppercase">{formatDateLong(date)}</p>
            {slots.length === 0 ? (
              <Alert tone="info">Ya no quedan horarios este día. Elige otra fecha.</Alert>
            ) : (
              ([
                ['Mañana', Sun, slots.filter((s) => s.startMin < 12 * 60)],
                ['Tarde', Moon, slots.filter((s) => s.startMin >= 12 * 60)],
              ] as const).map(([label, Icon, list]) =>
                list.length ? (
                  <div key={label} className="mb-5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-600">
                      <Icon className="h-4 w-4" /> {label}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((s) => (
                        <button
                          key={s.startMin}
                          onClick={() => {
                            setStartMin(s.startMin)
                            go(3)
                          }}
                          className={cx('min-h-[48px] rounded-2xl border bg-white text-sm font-medium transition hover:border-rose hover:bg-blush-50', startMin === s.startMin ? 'border-rose bg-blush-50 text-rose-800' : 'border-blush-100')}
                        >
                          {formatTime(s.startMin)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null,
              )
            )}
          </section>
        )}

        {/* Paso 4 — Datos */}
        {step === 3 && (
          <section className="animate-fade-up">
            <h1 className="mb-5 font-display text-3xl font-semibold">Tus datos</h1>
            <form
              noValidate
              onSubmit={form.handleSubmit((v) => {
                setContact(v)
                go(4)
              })}
              className="space-y-4"
            >
              <Field label="Nombre completo" error={form.formState.errors.name?.message}>
                {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!form.formState.errors.name} autoComplete="name" placeholder="Ej. Ana María López" {...form.register('name')} />}
              </Field>
              <Field label="Celular (WhatsApp)" error={form.formState.errors.phone?.message} hint="Lo usamos solo para confirmar tu cita.">
                {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!form.formState.errors.phone} type="tel" inputMode="tel" autoComplete="tel" placeholder="301 234 5678" {...form.register('phone')} />}
              </Field>
              <Field label="Observaciones (opcional)" error={form.formState.errors.notes?.message}>
                {(id, d) => <Textarea id={id} aria-describedby={d} placeholder="Diseño que te gustaría, largo, color…" {...form.register('notes')} />}
              </Field>
              {/* Campo trampa anti-bots (oculto para personas) */}
              <input type="text" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden {...form.register('website')} />
              <div className="space-y-3 rounded-3xl bg-white p-4">
                <Checkbox
                  checked={!!form.watch('dataTreatment')}
                  onChange={(v) => form.setValue('dataTreatment', v as true, { shouldValidate: true })}
                  label={
                    <>
                      Autorizo a Angels Spa a tratar mis datos para gestionar mi cita, según la{' '}
                      <Link to="/privacidad" target="_blank" className="text-rose-800 underline">
                        política de tratamiento de datos
                      </Link>{' '}
                      (Ley 1581 de 2012). <span className="text-red-700">*</span>
                    </>
                  }
                />
                {form.formState.errors.dataTreatment && <p className="text-sm text-red-700">{form.formState.errors.dataTreatment.message}</p>}
                <Checkbox checked={!!form.watch('marketing')} onChange={(v) => form.setValue('marketing', v)} label="Quiero recibir promociones por WhatsApp (opcional)." />
              </div>
              <Button type="submit" size="lg" className="w-full">
                Continuar
              </Button>
            </form>
          </section>
        )}

        {/* Paso 5 — Confirmar */}
        {step === 4 && service && date && startMin !== null && contact && (
          <section className="animate-fade-up">
            <h1 className="mb-5 font-display text-3xl font-semibold">Revisa tu reserva</h1>
            <Card className="p-5 sm:p-6">
              <Summary service={service.name} date={date} startMin={startMin} duration={service.durationMin} price={service.price} name={contact.name} phone={contact.phone} notes={contact.notes} />
            </Card>
            <p className="my-4 text-sm text-ink-600">Al confirmar, tu cita queda como solicitud pendiente hasta que el salón la confirme.</p>
            <Button size="lg" className="w-full" onClick={confirm} disabled={busy}>
              {busy ? 'Enviando…' : (
                <>
                  <Check className="h-5 w-5" /> Confirmar solicitud
                </>
              )}
            </Button>
          </section>
        )}
        {step === 4 && startMin === null && (
          <Button variant="secondary" className="w-full" onClick={() => go(2)}>
            Elegir otro horario
          </Button>
        )}
      </div>
    </Shell>
  )
}

function Summary({ service, date, startMin, duration, price, name, phone, notes }: { service: string; date: string; startMin: number; duration: number; price: number | null; name: string; phone?: string; notes?: string }) {
  const rows: [React.ComponentType<{ className?: string }>, string, string][] = [
    [Check, 'Servicio', service],
    [Calendar, 'Fecha', formatDateLong(date)],
    [Clock, 'Hora', `${formatTime(startMin)} – ${formatTime(startMin + duration)}`],
    [User, 'A nombre de', name + (phone ? ` · ${phone}` : '')],
  ]
  return (
    <dl className="space-y-3">
      {rows.map(([Icon, k, v]) => (
        <div key={k} className="flex items-start gap-3">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <dt className="w-24 shrink-0 text-ink-400">{k}</dt>
          <dd className="font-medium first-letter:uppercase">{v}</dd>
        </div>
      ))}
      {notes ? (
        <div className="flex items-start gap-3">
          <span className="w-4" />
          <dt className="w-24 shrink-0 text-ink-400">Notas</dt>
          <dd>{notes}</dd>
        </div>
      ) : null}
      <div className="flex items-center justify-between border-t border-blush-100 pt-3">
        <dt className="text-ink-400">Valor estimado</dt>
        <dd className="font-display text-2xl font-semibold text-rose-800">{money(price)}</dd>
      </div>
    </dl>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory pb-16">
      {APP_MODE === 'demo' && <DemoRibbon />}
      <header className="border-b border-blush-100 bg-ivory/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl justify-center">
          <Link to="/">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="px-4 pt-6 sm:pt-10">{children}</main>
    </div>
  )
}

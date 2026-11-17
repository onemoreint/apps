import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, MapPin, MessageCircle } from 'lucide-react'
import { useData } from '../data/store'
import { DemoRibbon, cx } from '../components/ui'
import { durationLabel, money } from '../lib/format'
import { formatDateShort, minToHHMM, today, weekdayName } from '../lib/time'
import { waLink } from '../lib/whatsapp'
import { formatPhone } from '../lib/phone'
import { APP_MODE } from '../data'
import { Nail, NailFan, POLISHES, SHAPES, type NailShape, type Polish } from './nails'
import type { AvailabilityRule } from '../types'

const BERENJENA = '#2A1520'

/** "Lunes a viernes: 09:00–13:00 y 14:00–19:00" agrupando días con el mismo horario. */
function scheduleLines(rules: AvailabilityRule[], staffId?: string) {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const byDay = order.map((wd) => ({
    wd,
    text: rules
      .filter((r) => r.weekday === wd && (!staffId || r.staffId === staffId))
      .sort((a, b) => a.startMin - b.startMin)
      .map((r) => `${minToHHMM(r.startMin)}–${minToHHMM(r.endMin)}`)
      .join(' y '),
  }))
  const groups: { from: number; to: number; text: string }[] = []
  for (const d of byDay) {
    const last = groups[groups.length - 1]
    if (last && last.text === d.text) last.to = d.wd
    else groups.push({ from: d.wd, to: d.wd, text: d.text })
  }
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1)
  return groups.map((g) => ({
    days: g.from === g.to ? cap(weekdayName(g.from)) : `${cap(weekdayName(g.from))} a ${weekdayName(g.to)}`,
    hours: g.text || 'Cerrado',
  }))
}

export function PublicHome() {
  const data = useData()
  const nav = useNavigate()
  const b = data.business
  const services = data.services.filter((s) => s.active).sort((a, c) => a.order - c.order)
  const t = today()
  const promos = data.promotions.filter((p) => p.active && p.validFrom <= t && p.validTo >= t)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
  const wa = waLink(b.whatsapp, `Hola ${b.name}, quiero agendar una cita.`)
  const staff = data.staff.find((s) => s.active)
  const hours = useMemo(() => scheduleLines(data.availability, staff?.id), [data.availability, staff?.id])

  const [polish, setPolish] = useState<Polish>(POLISHES[0])
  const [shape, setShape] = useState<NailShape>('almendra')
  const shapeName = SHAPES.find((s) => s.id === shape)!.name
  const onDark = polish.dark
  const [showFloat, setShowFloat] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowFloat(window.scrollY > window.innerHeight * 0.8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const design = `Diseño elegido en la web: ${polish.name}, forma ${shapeName.toLowerCase()}.`

  return (
    <div className="min-h-screen bg-white text-berenjena">
      {APP_MODE === 'demo' && <DemoRibbon />}

      {/* ---------- Portada: el probador de esmaltes ---------- */}
      <section
        className={cx('relative overflow-hidden transition-colors duration-700', onDark ? 'text-white' : 'text-berenjena')}
        style={{ backgroundColor: polish.base }}
      >
        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Link to="/" className="font-display text-2xl font-semibold italic tracking-tight sm:text-[1.7rem]">
            Angels Spa
          </Link>
          <nav className="hidden items-center gap-8 text-[0.95rem] md:flex" aria-label="Secciones">
            <a href="#servicios" className="underline-offset-8 hover:underline">Servicios</a>
            <a href="#disenos" className="underline-offset-8 hover:underline">Diseños</a>
            <a href="#visitanos" className="underline-offset-8 hover:underline">Dónde estamos</a>
          </nav>
          <Link
            to="/reservar"
            className={cx('inline-flex min-h-[42px] items-center rounded-full px-5 text-[0.95rem] font-medium transition', onDark ? 'bg-white text-berenjena hover:bg-white/90' : 'bg-berenjena text-white hover:bg-berenjena/90')}
          >
            Reservar
          </Link>
        </header>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-x-10 gap-y-8 px-5 pb-12 pt-2 sm:px-8 md:grid-cols-[1.05fr_1fr] md:pb-20 md:pt-10">
          <div className="md:col-start-1 md:row-start-1 md:self-end">
            <h1 className="font-display text-[2.7rem] font-medium leading-[1.02] tracking-[-0.01em] sm:text-6xl lg:text-[4.6rem]">
              Ven con una idea, sal con tus uñas listas.
            </h1>
            <p className={cx('mt-5 max-w-md text-lg leading-relaxed', onDark ? 'text-white/85' : 'text-berenjena/80')}>
              Manicure, pedicure, acrílicas y semipermanentes en Girardota. Prueba aquí el color y la forma que te gustan, y llega con tu diseño ya reservado.
            </p>
          </div>
          {/* Probador */}
          <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
            {/* Arco de tocador: el esmalte siempre resalta, sea cual sea el color de fondo */}
            <div className="mx-auto max-w-[440px] rounded-t-full bg-white px-8 pb-12 pt-20 shadow-[0_30px_60px_-30px_rgba(42,21,32,.45)] sm:px-10 sm:pt-28" role="img" aria-label={`Vista previa: uñas ${shapeName.toLowerCase()} en ${polish.name}`}>
              <NailFan shape={shape} polish={polish} className="mx-auto max-w-[340px]" />
            </div>
            <div className="mx-auto mt-8 max-w-[440px]">
              <fieldset>
                <legend className={cx('mb-3 text-sm', onDark ? 'text-white/80' : 'text-berenjena/75')}>
                  Esmalte: <span className="font-medium">{polish.name}</span>
                </legend>
                <div className="flex flex-wrap gap-2.5">
                  {POLISHES.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPolish(p)}
                      aria-label={p.name}
                      aria-pressed={p.id === polish.id}
                      className={cx(
                        'relative h-11 w-11 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                        p.id === polish.id ? (onDark ? 'ring-2 ring-white ring-offset-2 ring-offset-transparent' : 'ring-2 ring-berenjena ring-offset-2 ring-offset-transparent') : 'hover:scale-105',
                      )}
                      style={{ background: p.tip ? `linear-gradient(180deg, ${p.tip} 0 38%, ${p.base} 38%)` : p.base, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.55), 0 1px 3px rgba(42,21,32,.25)' }}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset className="mt-5">
                <legend className={cx('mb-3 text-sm', onDark ? 'text-white/80' : 'text-berenjena/75')}>
                  Forma: <span className="font-medium">{shapeName}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {SHAPES.map((s) => {
                    const active = s.id === shape
                    const icon = active ? (onDark ? BERENJENA : '#FFFFFF') : onDark ? '#FFFFFF' : BERENJENA
                    return (
                      <button
                        key={s.id}
                        onClick={() => setShape(s.id)}
                        aria-pressed={active}
                        className={cx(
                          'flex min-h-[42px] items-center gap-1.5 rounded-full border px-3 text-sm transition',
                          active
                            ? onDark ? 'border-white bg-white text-berenjena' : 'border-berenjena bg-berenjena text-white'
                            : onDark ? 'border-white/40 hover:border-white' : 'border-berenjena/30 hover:border-berenjena',
                        )}
                      >
                        <Nail shape={s.id} polish={{ id: 'icono', name: '', base: icon, dark: false }} className="h-5 w-3" />
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center md:col-start-1 md:row-start-2 md:self-start">
              <button
                onClick={() => nav(`/reservar?diseno=${encodeURIComponent(design)}`)}
                className={cx(
                  'inline-flex min-h-[54px] items-center justify-center rounded-full px-8 text-base font-medium transition focus-visible:outline-none focus-visible:ring-4',
                  onDark ? 'bg-white text-berenjena hover:bg-white/90 focus-visible:ring-white/40' : 'bg-berenjena text-white hover:bg-berenjena/90 focus-visible:ring-berenjena/30',
                )}
              >
                Reservar con este diseño
              </button>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center gap-2 px-2 text-[0.95rem] underline decoration-1 underline-offset-[6px] hover:decoration-2">
                <MessageCircle className="h-4 w-4" /> Prefiero escribir por WhatsApp
              </a>
          </div>

        </div>
      </section>

      {/* ---------- Carta de servicios ---------- */}
      <section id="servicios" className="mx-auto max-w-4xl scroll-mt-6 px-5 py-16 sm:px-8 md:py-24">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">Servicios</h2>
          <p className="max-w-xs text-berenjena-600">Elige uno y escoge tu horario. Te confirmamos por WhatsApp.</p>
        </div>
        {services.length === 0 ? (
          <p className="text-berenjena-600">Pronto publicaremos nuestros servicios.</p>
        ) : (
          <ul>
            {services.map((s) => (
              <li key={s.id} className="border-t border-berenjena/15 py-6 last:border-b">
                <div className="flex items-baseline gap-3">
                  <h3 className="font-display text-[1.75rem] font-medium leading-tight sm:text-3xl">{s.name}</h3>
                  <span className="mb-1.5 hidden flex-1 border-b-2 border-dotted border-berenjena/25 sm:block" aria-hidden />
                  <span className="ml-auto whitespace-nowrap text-lg font-medium tabular-nums sm:ml-0">{money(s.price)}</span>
                </div>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-xl text-berenjena-600">
                    {s.description} <span className="whitespace-nowrap text-berenjena/60">({durationLabel(s.durationMin)})</span>
                  </p>
                  <Link to={`/reservar?servicio=${s.id}`} className="inline-flex min-h-[40px] items-center self-start rounded-full border border-berenjena/30 px-4 text-sm font-medium transition hover:border-cereza hover:bg-cereza hover:text-white sm:self-auto">
                    Reservar {s.name.toLowerCase()}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {APP_MODE === 'demo' && <p className="mt-4 text-sm text-berenjena/55">Precios y duraciones de ejemplo; el salón los define desde su panel.</p>}
      </section>

      {/* ---------- Promociones ---------- */}
      {promos.length > 0 && (
        <section className="bg-berenjena text-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 md:py-16">
            <h2 className="font-display text-3xl font-medium italic sm:text-4xl">Este mes en el salón</h2>
            <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-2">
              {promos.map((p) => (
                <div key={p.id} className="border-l-2 border-[#E8B4C4] pl-5">
                  <h3 className="font-display text-2xl font-medium">{p.title}</h3>
                  <p className="mt-2 max-w-md text-white/80">{p.description}</p>
                  <p className="mt-3 text-sm text-white/60">Hasta el {formatDateShort(p.validTo)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Diseños ---------- */}
      <section id="disenos" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:px-8 md:py-24">
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">Diseños para inspirarte</h2>
          <a href={`https://www.instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline decoration-1 underline-offset-[6px] hover:decoration-2">
            <AtSign className="h-4 w-4" /> Más trabajos en @{b.instagram}
          </a>
        </div>
        {data.gallery.length === 0 ? (
          <p className="text-berenjena-600">Muy pronto compartiremos nuestros diseños.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
            {data.gallery.map((g, i) => {
              const p = POLISHES[(g.tone + 2) % POLISHES.length]
              const sh = SHAPES[i % SHAPES.length].id
              return (
                <figure key={g.id} className="min-w-0">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem]" style={{ backgroundColor: g.imageDataUrl ? undefined : `${p.base}2E` }}>
                    {g.imageDataUrl ? (
                      <img src={g.imageDataUrl} alt={g.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <>
                        <NailFan shape={sh} polish={p} small className="absolute inset-x-5 bottom-[16%]" />
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs text-berenjena-600">Ilustración de muestra</span>
                      </>
                    )}
                  </div>
                  <figcaption className="mt-3">
                    <p className="font-display text-xl font-medium">{g.title}</p>
                    <p className="text-sm text-berenjena-600">{g.category}</p>
                  </figcaption>
                </figure>
              )
            })}
          </div>
        )}
      </section>

      {/* ---------- Visítanos ---------- */}
      <section id="visitanos" className="scroll-mt-6 bg-[#F6E3E8]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.3fr_1fr] md:py-24">
          <div>
            <h2 className="font-display text-4xl font-medium sm:text-5xl">Calle 10 #17-26</h2>
            <p className="mt-2 text-xl text-berenjena-600">Girardota, Antioquia</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-berenjena px-6 font-medium text-white hover:bg-berenjena/90">
                <MapPin className="h-4 w-4" /> Abrir en Google Maps
              </a>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-berenjena/30 bg-white px-6 font-medium hover:border-berenjena">
                <MessageCircle className="h-4 w-4" /> {formatPhone(b.whatsapp)}
              </a>
            </div>
          </div>
          <div>
            <h3 className="font-display text-2xl font-medium">Horario de atención</h3>
            <dl className="mt-4 divide-y divide-berenjena/10">
              {hours.map((h) => (
                <div key={h.days} className="flex justify-between gap-4 py-2.5">
                  <dt>{h.days}</dt>
                  <dd className={cx('text-right tabular-nums', h.hours === 'Cerrado' && 'text-berenjena/50')}>{h.hours}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="bg-berenjena text-white/75">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="font-display text-xl italic text-white">Angels Spa</p>
          <div className="flex flex-wrap gap-6">
            <a href={`https://www.instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
            <Link to="/privacidad" className="hover:text-white">Tratamiento de datos</Link>
            <Link to="/admin" className="hover:text-white">Acceso del salón</Link>
          </div>
        </div>
      </footer>

      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" tabIndex={showFloat ? 0 : -1} className={cx('fixed bottom-5 right-5 z-40 transition-opacity duration-300', showFloat ? 'opacity-100' : 'pointer-events-none opacity-0')}>
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#1F8F4E] text-white shadow-lg transition hover:scale-105">
        <MessageCircle className="h-7 w-7" />
        </span>
      </a>
    </div>
  )
}

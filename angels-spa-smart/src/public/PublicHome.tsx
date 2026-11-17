import { Link } from 'react-router-dom'
import { ArrowRight, AtSign, CalendarHeart, Clock, Gift, MapPin, MessageCircle, Navigation, Sparkles } from 'lucide-react'
import { useData } from '../data/store'
import { Card, DemoArt, DemoRibbon, LinkButton, Logo, SectionTitle } from '../components/ui'
import { durationLabel, money } from '../lib/format'
import { formatDateShort, today } from '../lib/time'
import { waLink } from '../lib/whatsapp'
import { formatPhone } from '../lib/phone'
import { APP_MODE } from '../data'

export function PublicHome() {
  const data = useData()
  const b = data.business
  const services = data.services.filter((s) => s.active).sort((a, c) => a.order - c.order)
  const t = today()
  const promos = data.promotions.filter((p) => p.active && p.validFrom <= t && p.validTo >= t)
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
  const wa = waLink(b.whatsapp, `Hola ${b.name} 💖 Quisiera información para agendar una cita.`)

  return (
    <div className="min-h-screen bg-ivory text-ink">
      {APP_MODE === 'demo' && <DemoRibbon />}

      {/* Navegación */}
      <header className="sticky top-0 z-30 border-b border-blush-100/70 bg-ivory/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-ink-600 md:flex" aria-label="Secciones">
            <a href="#servicios" className="hover:text-rose-700">Servicios</a>
            <a href="#galeria" className="hover:text-rose-700">Diseños</a>
            {promos.length > 0 && <a href="#promociones" className="hover:text-rose-700">Promociones</a>}
            <a href="#ubicacion" className="hover:text-rose-700">Ubicación</a>
          </nav>
          <Link to="/reservar" className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-rose-700 px-4 text-sm font-medium text-white shadow-glow transition hover:bg-rose-800">
            <CalendarHeart className="h-4 w-4" /> Reservar
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blush/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-champagne/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-2 md:pb-20 md:pt-16">
          <div className="animate-fade-up">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-champagne/50 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-champagne-700">
              <Sparkles className="h-3.5 w-3.5" /> {b.city}
            </p>
            <h1 className="font-display text-[2.8rem] font-semibold leading-[1.02] sm:text-6xl">
              Tus manos, <em className="font-medium text-rose-700">nuestra obra</em> de arte.
            </h1>
            <p className="mt-5 max-w-md text-lg text-ink-600">{b.welcome}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/reservar" className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-rose-700 px-8 text-base font-medium text-white shadow-glow transition hover:bg-rose-800">
                Reservar mi cita <ArrowRight className="h-5 w-5" />
              </Link>
              <LinkButton href={wa} external variant="secondary" size="lg">
                <MessageCircle className="h-5 w-5" /> Escríbenos
              </LinkButton>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-400">
              <Clock className="h-4 w-4" /> Agenda abierta · Lunes a sábado
            </p>
          </div>
          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-[2.5rem] border-8 border-white shadow-soft">
              <DemoArt tone={2} label="Fotografía demostrativa" alt="Espacio para la fotografía principal del salón" />
            </div>
            <Card className="absolute -bottom-5 -left-3 flex items-center gap-3 px-4 py-3 sm:-left-8">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-blush-50 text-rose-700">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Manos y pies</p>
                <p className="text-xs text-ink-400">Cuidado con detalle boutique</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
        <SectionTitle eyebrow="Catálogo" title="Nuestros servicios" text="Elige tu servicio y reserva en menos de un minuto. Confirmamos tu cita por WhatsApp." />
        {services.length === 0 ? (
          <p className="text-ink-600">Pronto publicaremos nuestro catálogo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <Card key={s.id} className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-glow">
                <div className="aspect-[4/3]">
                  <DemoArt tone={s.tone} src={s.imageDataUrl} alt={s.name} label={s.imageDataUrl ? null : 'Demostrativa'} />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-ink-600">{s.description}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-ink-400">
                      <Clock className="h-4 w-4" /> {durationLabel(s.durationMin)}
                    </span>
                    <span className="font-semibold text-rose-800">{money(s.price)}</span>
                  </div>
                  <Link to={`/reservar?servicio=${s.id}`} className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-rose/30 text-sm font-medium text-rose-800 transition group-hover:bg-rose-700 group-hover:text-white">
                    Reservar <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
        {APP_MODE === 'demo' && <p className="mt-4 text-xs text-ink-400">* Precios y duraciones de ejemplo. El salón los define desde su panel.</p>}
      </section>

      {/* Galería */}
      <section id="galeria" className="scroll-mt-20 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionTitle eyebrow="Inspiración" title="Galería de diseños" text="Algunas ideas para tu próxima cita. Cuéntanos tu diseño favorito al reservar." />
          {data.gallery.length === 0 ? (
            <p className="text-ink-600">Muy pronto compartiremos nuestros diseños.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {data.gallery.map((g, i) => (
                <figure key={g.id} className={`group relative overflow-hidden rounded-3xl ${i % 5 === 0 ? 'md:row-span-2' : ''}`}>
                  <div className={i % 5 === 0 ? 'aspect-[3/4] md:h-full md:aspect-auto' : 'aspect-square'}>
                    <DemoArt tone={g.tone} src={g.imageDataUrl} alt={g.title} label={g.demo ? 'Demostrativa' : null} />
                  </div>
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-4 text-white">
                    <p className="text-[11px] uppercase tracking-widest text-white/80">{g.category}</p>
                    <p className="font-display text-xl">{g.title}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="mt-6 text-center">
            <LinkButton href={`https://www.instagram.com/${b.instagram}`} external variant="secondary">
              <AtSign className="h-4 w-4" /> Ver más en Instagram @{b.instagram}
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Promociones */}
      {promos.length > 0 && (
        <section id="promociones" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <SectionTitle eyebrow="Para ti" title="Promociones activas" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {promos.map((p) => (
              <div key={p.id} className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-rose-700 to-rose p-7 text-white shadow-glow">
                <Gift className="absolute -right-4 -top-4 h-28 w-28 text-white/10" />
                <p className="text-xs uppercase tracking-[0.25em] text-white/80">Válida hasta {formatDateShort(p.validTo)}</p>
                <h3 className="mt-2 font-display text-3xl font-semibold">{p.title}</h3>
                <p className="mt-2 max-w-md text-white/90">{p.description}</p>
                <Link to="/reservar" className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-5 text-sm font-medium text-rose-800 hover:bg-ivory">
                  Quiero esta promo <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ubicación */}
      <section id="ubicacion" className="scroll-mt-20 bg-white py-14">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <SectionTitle eyebrow="Visítanos" title="Te esperamos en Girardota" />
            <ul className="space-y-4 text-ink-600">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                <span>{b.address}</span>
              </li>
              <li className="flex gap-3">
                <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                <span>WhatsApp {formatPhone(b.whatsapp)}</span>
              </li>
              <li className="flex gap-3">
                <AtSign className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
                <a className="underline-offset-4 hover:underline" href={`https://www.instagram.com/${b.instagram}`} target="_blank" rel="noopener noreferrer">
                  @{b.instagram}
                </a>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton href={mapUrl} external variant="secondary">
                <Navigation className="h-4 w-4" /> Cómo llegar
              </LinkButton>
              <LinkButton href={wa} external variant="whatsapp">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </LinkButton>
            </div>
          </div>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="group relative block aspect-[4/3] overflow-hidden rounded-4xl border border-blush-100 bg-[radial-gradient(circle_at_center,#F6E1E8,#FFF9F5)]" aria-label="Abrir ubicación en Google Maps">
            <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full text-blush-200" aria-hidden>
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={'h' + i} x1="0" x2="400" y1={i * 38} y2={i * 38 + 12} stroke="currentColor" strokeWidth={i % 3 ? 2 : 6} />
              ))}
              {Array.from({ length: 11 }).map((_, i) => (
                <line key={'v' + i} y1="0" y2="300" x1={i * 40} x2={i * 40 - 18} stroke="currentColor" strokeWidth={i % 4 ? 2 : 6} />
              ))}
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="flex flex-col items-center">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-rose-700 text-white shadow-glow transition group-hover:scale-110">
                  <MapPin className="h-7 w-7" />
                </span>
                <span className="mt-3 rounded-full bg-white px-4 py-1.5 text-sm font-medium shadow-soft">Angels Spa · Calle 10 #17-26</span>
              </div>
            </div>
          </a>
        </div>
      </section>

      <footer className="bg-ink py-10 text-ivory/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 text-sm sm:flex-row sm:px-6">
          <Logo light />
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link to="/privacidad" className="hover:text-white">Tratamiento de datos</Link>
            <Link to="/admin" className="hover:text-white">Acceso administrativo</Link>
          </div>
          <p className="text-xs text-ivory/50">© {new Date().getFullYear()} Angels Spa · Angels Spa Smart</p>
        </div>
      </footer>

      {/* Botón flotante de WhatsApp */}
      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#1F8F4E] text-white shadow-xl transition hover:scale-105">
        <MessageCircle className="h-7 w-7" />
      </a>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useData } from '../data/store'
import { Logo } from '../components/ui'
import { formatPhone } from '../lib/phone'

// Texto base orientativo. Debe ser revisado por la responsable del negocio o un asesor legal
// antes de usarse con clientas reales (Ley 1581 de 2012 y Decreto 1377 de 2013).
export function PrivacyPage() {
  const b = useData().business
  return (
    <div className="min-h-screen bg-ivory px-4 py-8">
      <article className="mx-auto max-w-2xl space-y-4 text-ink-600">
        <Link to="/" className="inline-flex items-center gap-1 text-sm hover:text-ink"><ArrowLeft className="h-4 w-4" /> Volver</Link>
        <Logo />
        <h1 className="font-display text-4xl font-semibold text-ink">Política de tratamiento de datos personales</h1>
        <p className="rounded-2xl bg-champagne-100 px-4 py-3 text-sm text-champagne-700">Borrador orientativo para el MVP. Debe ser validado por el negocio antes de su uso con datos reales.</p>
        <h2 className="font-display text-2xl text-ink">Responsable</h2>
        <p>{b.name}, {b.address}. Contacto: WhatsApp {formatPhone(b.whatsapp)}.</p>
        <h2 className="font-display text-2xl text-ink">Datos que recolectamos</h2>
        <p>Nombre, número de celular, observaciones sobre el servicio y, solo si lo autorizas, fecha de cumpleaños y preferencias de diseño.</p>
        <h2 className="font-display text-2xl text-ink">Finalidades</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Gestionar, confirmar, recordar y reprogramar tus citas.</li>
          <li>Llevar tu historial de servicios y programa de puntos.</li>
          <li>Enviarte promociones y saludos de cumpleaños <strong>solo si lo autorizas expresamente</strong>.</li>
        </ul>
        <h2 className="font-display text-2xl text-ink">Tus derechos</h2>
        <p>Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos, así como revocar la autorización, escribiéndonos por WhatsApp. Atenderemos consultas en máximo 10 días hábiles y reclamos en máximo 15 días hábiles.</p>
        <h2 className="font-display text-2xl text-ink">Seguridad</h2>
        <p>Tus datos se almacenan con acceso restringido al personal autorizado del salón y no se venden ni se ceden a terceros.</p>
      </article>
    </div>
  )
}

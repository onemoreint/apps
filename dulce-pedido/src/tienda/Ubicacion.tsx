import { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, Navigation } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { urlComoLlegar, urlMapaIncrustado } from '@/core/cotizacion';

/** Dirección con mapa pequeño. El mapa se carga solo cuando la sección se ve en pantalla. */
export function Ubicacion({ catalogo }: { catalogo: Catalogo }) {
  const c = catalogo.tienda.contenido;
  const lat = typeof c.mapa_lat === 'number' ? c.mapa_lat : null;
  const lng = typeof c.mapa_lng === 'number' ? c.mapa_lng : null;
  const contenedor = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = contenedor.current;
    if (!el || lat === null) return;
    if (!('IntersectionObserver' in window)) return setVisible(true);
    const obs = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible(true), { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [lat]);

  if (!c.direccion && lat === null) return null;

  return (
    <div className="grid gap-4 overflow-hidden rounded-3xl bg-papel ring-1 ring-linea/70 md:grid-cols-[1fr_1.3fr]">
      <div className="p-5 sm:p-6">
        {c.direccion && (
          <p className="flex items-start gap-2.5 text-[1.05rem] font-semibold text-tinta">
            <MapPin size={20} className="mt-0.5 shrink-0 text-acento" /> {c.direccion}
          </p>
        )}
        {catalogo.tienda.recogida && catalogo.tienda.direccion_recogida && catalogo.tienda.direccion_recogida !== c.direccion && (
          <p className="mt-2 pl-7 text-[14px] text-tinta-2">Recogida: {catalogo.tienda.direccion_recogida}</p>
        )}
        {c.horario_texto && (
          <p className="mt-3 flex items-start gap-2.5 text-[14px] text-tinta-2">
            <Clock size={18} className="mt-0.5 shrink-0 text-acento" /> {c.horario_texto}
          </p>
        )}
        {lat !== null && lng !== null && (
          <a
            href={urlComoLlegar(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primario px-5 py-3 font-semibold text-en-primario hover:brightness-110"
          >
            <Navigation size={18} /> Cómo llegar
          </a>
        )}
      </div>
      {lat !== null && lng !== null && (
        <div ref={contenedor} className="relative h-64 bg-crema-2 md:h-auto md:min-h-72">
          {visible ? (
            <iframe
              title={`Mapa: ${c.direccion || catalogo.tienda.nombre}`}
              src={urlMapaIncrustado(lat, lng)}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-tinta-3">Cargando mapa…</div>
          )}
        </div>
      )}
    </div>
  );
}

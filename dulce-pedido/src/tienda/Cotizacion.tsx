import { useState, type ReactNode } from 'react';
import { Check, Copy, Loader2, MessageCircle, PartyPopper } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { COTIZACION_VACIA, TIPOS_EVENTO, mensajeCotizacion, validarCotizacion, type DatosCotizacion, type ErroresCotizacion } from '@/core/cotizacion';
import { enlaceWhatsApp } from '@/core/whatsapp';
import { sumarDias } from '@/core/fechas';
import { CON_SERVIDOR } from '@/config';
import { registrarCotizacion } from '@/datos/fuente';
import { enlace } from '@/app/ruta';

const campo =
  'mt-1 block w-full rounded-xl border-0 bg-papel px-4 py-3 text-[16px] ring-1 ring-linea placeholder:text-tinta-3 focus:outline-none focus:ring-2 focus:ring-acento';

/** Formulario para pedir una cotización de un pedido especial. */
export function Cotizacion({ catalogo, compacto = false }: { catalogo: Catalogo; compacto?: boolean }) {
  const t = catalogo.tienda;
  const hoy = catalogo.ahora.slice(0, 10);
  const [d, setD] = useState<DatosCotizacion>(COTIZACION_VACIA);
  const [errores, setErrores] = useState<ErroresCotizacion>({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState<{ codigo: string | null; mensaje: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cambiar = (c: Partial<DatosCotizacion>) => {
    setD((x) => ({ ...x, ...c }));
    setErrores((e) => {
      const n = { ...e };
      for (const k of Object.keys(c)) delete n[k as keyof DatosCotizacion];
      return n;
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs = validarCotizacion(d, hoy);
    setErrores(errs);
    if (Object.keys(errs).length) return;
    setEnviando(true);
    try {
      const { codigo } = await registrarCotizacion(t.slug, d);
      setListo({ codigo, mensaje: mensajeCotizacion(d, codigo, t.demo) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos enviar tu solicitud. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <div className="aparecer rounded-3xl bg-papel p-6 text-center ring-1 ring-linea/70">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-rosa text-primario">
          <MessageCircle size={24} />
        </div>
        <h3 className="mt-3 text-2xl font-semibold text-primario">Falta un paso: envíala por WhatsApp</h3>
        <p className="mx-auto mt-2 max-w-md text-tinta-2">
          {listo.codigo && CON_SERVIDOR ? (
            <>
              Tu solicitud <strong className="text-tinta">{listo.codigo}</strong> quedó registrada.{' '}
            </>
          ) : null}
          Envíala por WhatsApp y te responderemos con una propuesta y el valor.
        </p>
        {t.whatsapp && (
          <a
            href={enlaceWhatsApp(t.whatsapp, listo.mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3.5 font-semibold text-white hover:bg-whatsapp-oscuro"
          >
            <MessageCircle size={20} /> Abrir WhatsApp y enviar
          </a>
        )}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(listo.mensaje).then(() => setCopiado(true));
            }}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-primario ring-1 ring-linea hover:bg-crema-2"
          >
            {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
          </button>
          <button
            type="button"
            onClick={() => {
              setListo(null);
              setD(COTIZACION_VACIA);
              setCopiado(false);
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold text-tinta-2 hover:bg-crema-2"
          >
            Hacer otra solicitud
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="rounded-3xl bg-papel p-5 ring-1 ring-linea/70 sm:p-6" aria-label="Solicitar cotización">
      {!compacto && (
        <div className="mb-4 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rosa text-primario">
            <PartyPopper size={22} />
          </span>
          <p className="text-tinta-2">
            Para cumpleaños, bodas, eventos o tortas personalizadas: cuéntanos tu idea y te enviamos una propuesta con precio. No tiene
            costo ni compromiso.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" error={errores.nombre}>
          <input className={campo} value={d.nombre} maxLength={80} autoComplete="name" onChange={(e) => cambiar({ nombre: e.target.value })} aria-invalid={!!errores.nombre} />
        </Campo>
        <Campo etiqueta="Celular / WhatsApp" error={errores.telefono}>
          <input
            className={campo}
            value={d.telefono}
            inputMode="tel"
            autoComplete="tel"
            maxLength={20}
            placeholder="300 123 4567"
            onChange={(e) => cambiar({ telefono: e.target.value })}
            aria-invalid={!!errores.telefono}
          />
        </Campo>
        <Campo etiqueta="Ocasión">
          <select className={campo} value={d.tipo_evento} onChange={(e) => cambiar({ tipo_evento: e.target.value })}>
            <option value="">Elige (opcional)</option>
            {TIPOS_EVENTO.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha del evento (opcional)" error={errores.fecha_evento}>
          <input
            type="date"
            className={campo}
            value={d.fecha_evento}
            min={hoy}
            max={sumarDias(hoy, 730)}
            onChange={(e) => cambiar({ fecha_evento: e.target.value })}
            aria-invalid={!!errores.fecha_evento}
          />
        </Campo>
        <Campo etiqueta="Número de personas (opcional)" error={errores.personas}>
          <input className={campo} value={d.personas} inputMode="numeric" maxLength={4} onChange={(e) => cambiar({ personas: e.target.value })} aria-invalid={!!errores.personas} />
        </Campo>
        <Campo etiqueta="Presupuesto aproximado (opcional)" error={errores.presupuesto}>
          <input
            className={campo}
            value={d.presupuesto}
            inputMode="numeric"
            placeholder="$ en pesos"
            maxLength={14}
            onChange={(e) => cambiar({ presupuesto: e.target.value })}
            aria-invalid={!!errores.presupuesto}
          />
        </Campo>
        <Campo etiqueta="¿Qué quieres?" error={errores.descripcion} className="sm:col-span-2">
          <textarea
            className={`${campo} h-32`}
            value={d.descripcion}
            maxLength={1500}
            placeholder="Ej.: torta de dos pisos para 40 personas, temática de unicornio, sabor chocolate con arequipe, más 30 cupcakes a juego."
            onChange={(e) => cambiar({ descripcion: e.target.value })}
            aria-invalid={!!errores.descripcion}
          />
          <span className="mt-1 block text-right text-xs text-tinta-3">{d.descripcion.length}/1500</span>
        </Campo>
      </div>
      <label className="mt-3 flex gap-3 text-[13px] text-tinta-2">
        <input
          type="checkbox"
          checked={d.acepta_datos}
          onChange={(e) => cambiar({ acepta_datos: e.target.checked })}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primario)]"
          aria-invalid={!!errores.acepta_datos}
        />
        <span>
          Autorizo el uso de mis datos solo para responder esta solicitud, según la{' '}
          <a href={enlace('/privacidad')} target="_blank" rel="noopener" className="font-semibold text-acento underline">
            política de privacidad
          </a>
          .
        </span>
      </label>
      {errores.acepta_datos && <MensajeError>{errores.acepta_datos}</MensajeError>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-rosa/60 px-3 py-2 text-sm font-medium text-peligro">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-primario px-6 py-3.5 font-semibold text-en-primario hover:brightness-110 disabled:opacity-70 sm:w-auto"
      >
        {enviando ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
        {enviando ? 'Enviando…' : 'Solicitar cotización'}
      </button>
    </form>
  );
}

function Campo({ etiqueta, error, children, className = '' }: { etiqueta: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-tinta">{etiqueta}</span>
      {children}
      {error && <MensajeError>{error}</MensajeError>}
    </label>
  );
}

function MensajeError({ children }: { children: ReactNode }) {
  return <span className="mt-1.5 block text-sm font-medium text-peligro">{children}</span>;
}

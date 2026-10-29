import { useState } from 'react';
import { Check, Copy, MessageCircle, TriangleAlert } from 'lucide-react';
import type { Catalogo } from '@/core/tipos';
import { cop } from '@/core/dinero';
import { fechaLarga } from '@/core/fechas';
import { CON_SERVIDOR } from '@/config';
import { enlace } from '@/app/ruta';
import { useTienda } from './estado';

export function Listo({ catalogo }: { catalogo: Catalogo }) {
  const enviado = useTienda((s) => s.enviado);
  const [copiado, setCopiado] = useState(false);
  const [abierto, setAbierto] = useState(false);

  if (!enviado) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-primario">No hay un pedido pendiente</h1>
        <a href={enlace('/catalogo')} className="mt-4 inline-block font-semibold text-acento hover:underline">
          Ver el catálogo
        </a>
      </div>
    );
  }

  const { resumen, datos, mensaje } = enviado;
  const sinNumero = !catalogo.tienda.whatsapp;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 pb-16 pt-8">
      <div className="aparecer rounded-3xl bg-papel p-6 text-center ring-1 ring-linea/70 sm:p-8">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rosa text-primario">
          <MessageCircle size={26} />
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-primario">Falta un paso: envíalo por WhatsApp</h1>
        {resumen.codigo && CON_SERVIDOR && (
          <p className="mt-2 text-tinta-2">
            Tu solicitud <strong className="font-semibold text-tinta">{resumen.codigo}</strong> quedó registrada en la tienda.
          </p>
        )}
        <p className="mt-2 text-tinta-2">
          Tu pedido <strong className="font-semibold">aún no está confirmado</strong>. Al enviar el mensaje, la tienda revisa la
          disponibilidad para el {fechaLarga(datos.fecha)} y te responde con el valor final y la
          forma de pago.
        </p>

        {sinNumero ? (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-crema-2 p-3 text-left text-sm text-tinta-2">
            <TriangleAlert size={18} className="shrink-0 text-aviso" /> Esta tienda todavía no configuró su WhatsApp. Copia el mensaje y
            envíalo por el medio de contacto de la tienda.
          </p>
        ) : (
          <a
            href={enviado.enlace}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setAbierto(true)}
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-4 text-lg font-semibold text-white shadow-[0_10px_24px_-12px_rgba(18,140,74,0.8)] hover:bg-whatsapp-oscuro"
          >
            <MessageCircle size={22} /> {abierto ? 'Abrir WhatsApp otra vez' : 'Abrir WhatsApp y enviar'}
          </a>
        )}
        <button
          type="button"
          onClick={() => void copiar()}
          className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primario ring-1 ring-linea hover:bg-crema-2"
        >
          {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? 'Mensaje copiado' : 'Copiar mensaje'}
        </button>
        {abierto && (
          <p className="mt-4 text-sm text-tinta-3">
            Si WhatsApp no se abrió o no alcanzaste a enviarlo, usa el botón de nuevo o copia el mensaje.
          </p>
        )}
      </div>

      <div className="mt-6 rounded-2xl bg-papel p-5 ring-1 ring-linea/70">
        <h2 className="text-lg font-semibold text-primario">Lo que vas a enviar</h2>
        <ul className="mt-3 space-y-1.5 text-[14px]">
          {resumen.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="text-tinta-2">
                {it.cantidad} × {it.nombre}
                {it.detalle && <span className="block text-xs text-tinta-3">{it.detalle}</span>}
              </span>
              <span className="precio shrink-0">{cop(it.subtotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-linea pt-3 font-semibold">
          <span>Total estimado</span>
          <span className="precio text-primario">
            {cop(resumen.total)}
            {resumen.domicilio_pendiente && <span className="block text-right text-xs font-normal text-tinta-3">+ domicilio por confirmar</span>}
          </span>
        </div>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-medium text-tinta-2">Ver el mensaje completo</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-crema p-3 font-sans text-[13px] text-tinta-2">{mensaje}</pre>
        </details>
      </div>

      <div className="mt-6 text-center">
        <a href={enlace('/')} className="font-semibold text-acento hover:underline">
          Volver al inicio
        </a>
      </div>
    </div>
  );
}

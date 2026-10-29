import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Bike, Loader2, MessageCircle, Store } from 'lucide-react';
import type { Catalogo, DatosPedido } from '@/core/tipos';
import { cop } from '@/core/dinero';
import { calcularLineas, costoDomicilio, detalleLinea, maxHorasPreparacion, subtotalCarrito } from '@/core/carrito';
import { fechaLarga, fechasDisponibles, fechaMinimaPorPreparacion, sumarDias, textoPreparacion, type ReglasFecha } from '@/core/fechas';
import { validarPedido, type ErroresPedido } from '@/core/validar';
import { enlaceWhatsApp, mensajePedido } from '@/core/whatsapp';
import { CON_SERVIDOR } from '@/config';
import { registrarPedido } from '@/datos/fuente';
import { enlace, ir } from '@/app/ruta';
import { useTienda } from './estado';

const campo =
  'mt-1 block h-12 w-full rounded-xl border-0 bg-papel px-4 text-[16px] ring-1 ring-linea placeholder:text-tinta-3 focus:outline-none focus:ring-2 focus:ring-acento';

export function Pedido({ catalogo }: { catalogo: Catalogo }) {
  const t = catalogo.tienda;
  const lineas = useTienda((s) => s.lineas);
  const datos = useTienda((s) => s.datos);
  const editar = useTienda((s) => s.editarDatos);
  const marcarEnviado = useTienda((s) => s.marcarEnviado);
  const [errores, setErrores] = useState<ErroresPedido>({});
  const [errorServidor, setErrorServidor] = useState('');
  const [enviando, setEnviando] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);

  const calc = calcularLineas(lineas, catalogo.productos);
  const validas = calc.filter((l) => !l.problema);
  const subtotal = subtotalCarrito(validas);
  const horas = maxHorasPreparacion(validas);

  // Modalidad por defecto según lo que ofrezca la tienda.
  const modalidad: DatosPedido['modalidad'] =
    datos.modalidad === 'recogida' && !t.recogida ? 'domicilio' : datos.modalidad === 'domicilio' && !t.domicilio ? 'recogida' : datos.modalidad;
  const zona = catalogo.zonas.find((z) => z.id === datos.zona_id);
  const dom = costoDomicilio(modalidad, zona);
  const total = subtotal + (dom.valor ?? 0);

  const reglas: ReglasFecha = useMemo(
    () => ({
      ahora: catalogo.ahora,
      horasPreparacion: horas,
      diasAtencion: t.dias_atencion,
      diasMaxAnticipacion: t.dias_max_anticipacion,
      bloqueadas: catalogo.fechas_bloqueadas,
    }),
    [catalogo, horas, t],
  );
  const opcionesFecha = useMemo(() => fechasDisponibles(reglas, 6), [reglas]);
  const hoy = catalogo.ahora.slice(0, 10);
  const fechaMin = fechaMinimaPorPreparacion(catalogo.ahora, horas);

  if (lineas.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-primario">Tu pedido está vacío</h1>
        <a href={enlace('/catalogo')} className="mt-4 inline-block font-semibold text-acento hover:underline">
          Ver el catálogo
        </a>
      </div>
    );
  }

  const cambiar = (c: Partial<DatosPedido>) => {
    editar(c);
    if (Object.keys(errores).length) setErrores((e) => {
      const n = { ...e };
      for (const k of Object.keys(c)) delete n[k as keyof ErroresPedido];
      return n;
    });
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorServidor('');
    const d: DatosPedido = { ...datos, modalidad };
    const errs = validarPedido(d, {
      tienda: t,
      zonas: catalogo.zonas,
      reglas,
      lineasValidas: validas.length,
      lineasConProblema: calc.length - validas.length,
    });
    setErrores(errs);
    if (Object.keys(errs).length > 0) {
      requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setEnviando(true);
    try {
      const resumen = await registrarPedido(catalogo, lineas, d);
      const mensaje = mensajePedido(d, resumen, zona, t.demo);
      marcarEnviado({ resumen, datos: d, mensaje, enlace: enlaceWhatsApp(t.whatsapp, mensaje) });
      ir('/listo');
    } catch (err) {
      setErrorServidor(err instanceof Error ? err.message : 'No pudimos registrar tu pedido. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-6">
      <a href={enlace('/carrito')} className="mb-2 inline-flex items-center gap-1.5 py-2 text-sm font-medium text-tinta-2 hover:text-primario">
        <ArrowLeft size={18} /> Volver al carrito
      </a>
      <h1 className="text-3xl font-semibold text-primario">Datos del pedido</h1>
      <p className="mt-1 text-tinta-2">Solo lo necesario para preparar y entregar tu pedido.</p>

      <form ref={formulario} onSubmit={enviar} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-6">
          <Bloque titulo="Tus datos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" error={errores.nombre}>
                <input
                  className={campo}
                  value={datos.nombre}
                  onChange={(e) => cambiar({ nombre: e.target.value })}
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={!!errores.nombre}
                />
              </Campo>
              <Campo etiqueta="Celular / WhatsApp" error={errores.telefono}>
                <input
                  className={campo}
                  value={datos.telefono}
                  onChange={(e) => cambiar({ telefono: e.target.value })}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="300 123 4567"
                  maxLength={20}
                  aria-invalid={!!errores.telefono}
                />
              </Campo>
            </div>
          </Bloque>

          <Bloque titulo="¿Para cuándo lo quieres?">
            {horas > 0 && <p className="mb-3 text-sm text-tinta-3">Tu pedido necesita {textoPreparacion(horas).toLowerCase()}.</p>}
            {opcionesFecha.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Fechas disponibles">
                {opcionesFecha.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => cambiar({ fecha: f })}
                    aria-pressed={datos.fecha === f}
                    className={`rounded-full px-3.5 py-2 text-sm font-medium ring-1 first-letter:uppercase transition ${
                      datos.fecha === f ? 'bg-primario text-en-primario ring-primario' : 'bg-papel text-tinta-2 ring-linea hover:bg-crema-2'
                    }`}
                  >
                    {fechaLarga(f)}
                  </button>
                ))}
              </div>
            )}
            <Campo etiqueta="U otra fecha" error={errores.fecha}>
              <input
                type="date"
                className={campo}
                value={datos.fecha}
                min={fechaMin > hoy ? fechaMin : hoy}
                max={sumarDias(hoy, t.dias_max_anticipacion)}
                onChange={(e) => cambiar({ fecha: e.target.value })}
                aria-invalid={!!errores.fecha}
              />
            </Campo>
            {datos.fecha && !errores.fecha && (
              <p className="mt-2 text-sm text-tinta-3">
                Fecha solicitada: {fechaLarga(datos.fecha)}. La disponibilidad la confirma la tienda por WhatsApp.
              </p>
            )}
            {t.franjas.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-tinta">Franja horaria</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.franjas.map((f) => (
                    <label
                      key={f}
                      className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium ring-1 transition ${
                        datos.franja === f ? 'bg-primario text-en-primario ring-primario' : 'bg-papel text-tinta-2 ring-linea hover:bg-crema-2'
                      }`}
                    >
                      <input
                        type="radio"
                        name="franja"
                        className="sr-only"
                        checked={datos.franja === f}
                        onChange={() => cambiar({ franja: f })}
                        aria-invalid={!!errores.franja}
                      />
                      {f}
                    </label>
                  ))}
                </div>
                {errores.franja && <MensajeError>{errores.franja}</MensajeError>}
              </fieldset>
            )}
          </Bloque>

          <Bloque titulo="Entrega">
            <div className="grid gap-3 sm:grid-cols-2">
              {t.recogida && (
                <Opcion
                  activa={modalidad === 'recogida'}
                  onClick={() => cambiar({ modalidad: 'recogida' })}
                  icono={<Store size={20} />}
                  titulo="Recoger"
                  texto={t.direccion_recogida || 'Te enviamos la dirección al confirmar.'}
                />
              )}
              {t.domicilio && (
                <Opcion
                  activa={modalidad === 'domicilio'}
                  onClick={() => cambiar({ modalidad: 'domicilio' })}
                  icono={<Bike size={20} />}
                  titulo="Domicilio"
                  texto="Tarifa según tu zona."
                />
              )}
            </div>
            {errores.modalidad && <MensajeError>{errores.modalidad}</MensajeError>}

            {modalidad === 'domicilio' && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Zona" error={errores.zona_id} className="sm:col-span-2">
                  <select
                    className={campo}
                    value={datos.zona_id}
                    onChange={(e) => cambiar({ zona_id: e.target.value })}
                    aria-invalid={!!errores.zona_id}
                  >
                    <option value="">Elige tu zona…</option>
                    {catalogo.zonas.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.nombre} — {z.tarifa === null ? 'se cotiza' : cop(z.tarifa)}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo etiqueta="Dirección" error={errores.direccion}>
                  <input
                    className={campo}
                    value={datos.direccion}
                    onChange={(e) => cambiar({ direccion: e.target.value })}
                    autoComplete="street-address"
                    placeholder="Calle 10 # 20-30, apto 301"
                    maxLength={200}
                    aria-invalid={!!errores.direccion}
                  />
                </Campo>
                <Campo etiqueta="Barrio" error={errores.barrio}>
                  <input
                    className={campo}
                    value={datos.barrio}
                    onChange={(e) => cambiar({ barrio: e.target.value })}
                    maxLength={80}
                    aria-invalid={!!errores.barrio}
                  />
                </Campo>
              </div>
            )}
          </Bloque>

          <Bloque titulo="Observaciones (opcional)">
            <textarea
              className={`${campo} h-28 py-3`}
              value={datos.observaciones}
              onChange={(e) => cambiar({ observaciones: e.target.value })}
              maxLength={500}
              placeholder="Mensaje para la torta, decoración, alergias que debamos conocer…"
              aria-invalid={!!errores.observaciones}
              aria-label="Observaciones"
            />
            <p className="mt-1 text-right text-xs text-tinta-3">{datos.observaciones.length}/500</p>
          </Bloque>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-20">
          <div className="rounded-2xl bg-papel p-5 ring-1 ring-linea/70">
            <h2 className="text-xl font-semibold text-primario">Resumen</h2>
            <ul className="mt-3 space-y-2 text-[14px]">
              {validas.map((l) => (
                <li key={l.linea.clave} className="flex justify-between gap-3">
                  <span className="text-tinta-2">
                    {l.linea.cantidad} × {l.producto.nombre}
                    {detalleLinea(l.variante, l.linea.sabores) && (
                      <span className="block text-xs text-tinta-3">{detalleLinea(l.variante, l.linea.sabores)}</span>
                    )}
                  </span>
                  <span className="precio shrink-0 font-medium">{cop(l.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-linea pt-3 text-[15px]">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="precio font-medium">{cop(subtotal)}</dd>
              </div>
              {modalidad === 'domicilio' && (
                <div className="flex justify-between">
                  <dt>Domicilio</dt>
                  <dd className="precio font-medium">{dom.pendiente ? (zona ? 'Se cotiza' : 'Elige tu zona') : cop(dom.valor ?? 0)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-lg">
                <dt className="font-semibold">Total estimado</dt>
                <dd className="precio font-bold text-primario">{cop(total)}</dd>
              </div>
            </dl>
            {modalidad === 'domicilio' && dom.pendiente && zona && (
              <p className="mt-2 rounded-lg bg-crema-2 px-3 py-2 text-[13px] text-tinta-2">
                El valor del domicilio se confirma por WhatsApp y puede modificar el total final.
              </p>
            )}

            <label className="mt-4 flex gap-3 text-[13px] text-tinta-2">
              <input
                type="checkbox"
                checked={datos.acepta_datos}
                onChange={(e) => cambiar({ acepta_datos: e.target.checked })}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primario)]"
                aria-invalid={!!errores.acepta_datos}
              />
              <span>
                Autorizo el uso de mis datos solo para gestionar este pedido, según la{' '}
                <a href={enlace('/privacidad')} className="font-semibold text-acento underline" target="_blank" rel="noopener">
                  política de privacidad
                </a>{' '}
                (Ley 1581 de 2012).
              </span>
            </label>
            {errores.acepta_datos && <MensajeError>{errores.acepta_datos}</MensajeError>}
            {errores.carrito && <MensajeError>{errores.carrito}</MensajeError>}
            {errorServidor && (
              <p role="alert" className="mt-3 rounded-lg bg-rosa/60 px-3 py-2 text-sm font-medium text-peligro">
                {errorServidor}
              </p>
            )}
            {Object.keys(errores).length > 0 && (
              <p role="alert" className="mt-3 text-sm font-medium text-peligro">
                Revisa los campos marcados.
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-4 text-base font-semibold text-white shadow-[0_10px_24px_-12px_rgba(18,140,74,0.8)] hover:bg-whatsapp-oscuro disabled:opacity-70"
            >
              {enviando ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
              {enviando ? 'Preparando tu pedido…' : 'Preparar pedido para WhatsApp'}
            </button>
            <p className="mt-2 text-center text-xs text-tinta-3">
              {CON_SERVIDOR
                ? 'Registramos tu solicitud y luego la envías por WhatsApp. La tienda confirma disponibilidad y pago.'
                : 'Modo demostración: el pedido no se guarda; solo se arma el mensaje de WhatsApp.'}
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-papel p-5 ring-1 ring-linea/70">
      <h2 className="mb-3 text-xl font-semibold text-primario">{titulo}</h2>
      {children}
    </section>
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

function Opcion({
  activa,
  onClick,
  icono,
  titulo,
  texto,
}: {
  activa: boolean;
  onClick: () => void;
  icono: ReactNode;
  titulo: string;
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={`flex items-start gap-3 rounded-xl p-4 text-left ring-1 transition ${
        activa ? 'bg-rosa/50 ring-2 ring-acento' : 'bg-papel ring-linea hover:bg-crema-2'
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${activa ? 'bg-primario text-en-primario' : 'bg-crema-2 text-primario'}`}>
        {icono}
      </span>
      <span>
        <span className="block font-semibold text-tinta">{titulo}</span>
        <span className="block text-[13px] text-tinta-3">{texto}</span>
      </span>
    </button>
  );
}

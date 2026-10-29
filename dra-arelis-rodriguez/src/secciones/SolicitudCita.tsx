import { cloneElement, useId, useRef, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { CheckCircle2, Info, LoaderCircle, LockKeyhole, MessageCircle, Send } from 'lucide-react';
import { SERVICIOS, WHATSAPP_VISIBLE } from '../contenido';
import { enlaceWhatsApp, mensajeCita, type SolicitudCita as Datos } from '../whatsapp';
import { hoyISO, validarSolicitud, type Errores } from '../validacion';

const HORARIOS = ['Mañana', 'Tarde', 'Flexible'] as const;
const VACIO: Datos = { nombre: '', telefono: '', servicio: '', dia: '', horario: '', comentario: '' };
const ORDEN: (keyof Datos)[] = ['nombre', 'telefono', 'servicio', 'dia', 'horario', 'comentario'];

export function SolicitudCita({ onPrivacidad }: { onPrivacidad: () => void }) {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [estado, setEstado] = useState<'editando' | 'abriendo' | 'listo'>('editando');
  const [enlace, setEnlace] = useState('');
  const formulario = useRef<HTMLFormElement>(null);
  const exito = useRef<HTMLDivElement>(null);
  const id = useId();

  const cambiar = (campo: keyof Datos, valor: string) => {
    setDatos((d) => ({ ...d, [campo]: valor }));
    if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const encontrados = validarSolicitud(datos);
    setErrores(encontrados);
    const primero = ORDEN.find((c) => encontrados[c]);
    if (primero) {
      formulario.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }
    const url = enlaceWhatsApp(mensajeCita(datos));
    setEnlace(url);
    setEstado('abriendo');
    // Se abre en el mismo clic del usuario para que el navegador no lo bloquee.
    // (Con 'noopener' window.open siempre devuelve null, por eso se corta el vínculo a mano.)
    const ventana = window.open(url, '_blank');
    if (ventana) ventana.opener = null;
    else window.location.href = url; // ventana bloqueada: se abre en la misma pestaña
    window.setTimeout(() => {
      setEstado('listo');
      requestAnimationFrame(() => exito.current?.focus());
    }, 700);
  };

  const nuevaSolicitud = () => {
    setDatos(VACIO);
    setEstado('editando');
  };

  return (
    <section id="cita" aria-labelledby="titulo-cita" className="py-20 md:py-28">
      <div className="contenedor grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div className="revelar lg:pt-4">
          <p className="antetitulo">Solicitar una cita</p>
          <h2 id="titulo-cita" className="text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">
            Tu próxima cita puede comenzar aquí.
          </h2>
          <p className="mt-5 text-[1.08rem] text-gris">
            Completa estos datos y se abrirá WhatsApp con tu solicitud ya escrita, lista para enviarla a la doctora.
          </p>

          <ol className="mt-9 space-y-5">
            {[
              'Llenas el formulario en menos de un minuto.',
              'Se abre WhatsApp con tu mensaje listo: solo presionas «Enviar».',
              'La doctora te responde con la disponibilidad para confirmar tu cita.',
            ].map((paso, i) => (
              <li key={paso} className="flex gap-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-salvia-claro font-serif text-[1.05rem] text-petroleo-oscuro">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-tinta/85">{paso}</span>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex gap-3.5 rounded-2xl border border-salvia/40 bg-salvia-claro/50 p-5 text-[0.97rem]">
            <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-salvia-oscuro" />
            <p className="text-tinta/85">
              <strong className="font-semibold text-petroleo-oscuro">Tu solicitud no confirma automáticamente una cita.</strong>{' '}
              La disponibilidad la confirma la doctora al responderte por WhatsApp.
            </p>
          </div>
        </div>

        <div className="revelar tarjeta relative p-6 sm:p-10" style={{ '--retraso': '120ms' } as React.CSSProperties}>
          {estado === 'listo' ? (
            <div ref={exito} tabIndex={-1} role="status" className="flex flex-col items-center py-10 text-center outline-none sm:py-16">
              <span className="grid size-16 place-items-center rounded-full bg-salvia-claro text-salvia-oscuro">
                <CheckCircle2 aria-hidden className="size-8" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-[1.8rem]">Tu mensaje está listo en WhatsApp</h3>
              <p className="mt-3 max-w-md text-gris">
                Solo falta que presiones <strong className="text-tinta">Enviar</strong> en la conversación. La doctora te
                responderá con la disponibilidad.
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <a href={enlace} target="_blank" rel="noopener noreferrer" className="btn-principal">
                  <MessageCircle aria-hidden className="size-[1.15em]" />
                  ¿No se abrió? Abrir WhatsApp
                </a>
                <button type="button" onClick={nuevaSolicitud} className="btn-secundario">
                  Hacer otra solicitud
                </button>
              </div>
              <p className="mt-6 text-[0.9rem] text-gris">También puedes escribir directamente al {WHATSAPP_VISIBLE}.</p>
            </div>
          ) : (
            <form ref={formulario} onSubmit={enviar} noValidate aria-describedby={`${id}-nota`}>
              <div className="grid gap-6 sm:grid-cols-2">
                <Campo etiqueta="Nombre" nombre="nombre" error={errores.nombre} id={id}>
                  <input
                    className="campo"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    placeholder="¿Cómo te llamas?"
                    value={datos.nombre}
                    onChange={(e) => cambiar('nombre', e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="Número de contacto" opcional nombre="telefono" error={errores.telefono} id={id}>
                  <input
                    className="campo"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={22}
                    placeholder="Ej. +58 412 000 0000"
                    value={datos.telefono}
                    onChange={(e) => cambiar('telefono', e.target.value)}
                  />
                </Campo>
                <Campo etiqueta="Servicio de interés" nombre="servicio" error={errores.servicio} id={id} ancho>
                  <select
                    className="campo appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 fill=%22none%22 stroke=%22%232c5a63%22 stroke-width=%222%22 stroke-linecap=%22round%22 viewBox=%220 0 24 24%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:1.15rem] bg-[right_1rem_center] bg-no-repeat pr-11"
                    value={datos.servicio}
                    onChange={(e) => cambiar('servicio', e.target.value)}
                  >
                    <option value="" disabled>
                      Elige una opción
                    </option>
                    {SERVICIOS.map((s) => (
                      <option key={s.nombre} value={s.nombre}>
                        {s.nombre}
                      </option>
                    ))}
                    <option value="Aún no lo sé, quisiera orientación">Aún no lo sé, quisiera orientación</option>
                  </select>
                </Campo>
                <Campo etiqueta="Día preferido para la cita" nombre="dia" error={errores.dia} id={id}>
                  <input
                    className="campo min-h-[3.2rem]"
                    type="date"
                    min={hoyISO()}
                    value={datos.dia}
                    onChange={(e) => cambiar('dia', e.target.value)}
                  />
                </Campo>
                <fieldset
                  className="sm:col-span-1"
                  aria-invalid={errores.horario ? true : undefined}
                  aria-describedby={errores.horario ? `${id}-horario-error` : undefined}
                >
                  <legend className="mb-2 text-[0.95rem] font-semibold text-tinta">Horario preferido</legend>
                  <div className="grid grid-cols-3 gap-2">
                    {HORARIOS.map((h) => (
                      <label
                        key={h}
                        className="relative flex min-h-[3.2rem] cursor-pointer items-center justify-center rounded-xl border border-arena-oscura bg-white px-2 text-[0.95rem] font-medium text-tinta/85 transition hover:border-salvia has-[:checked]:border-petroleo has-[:checked]:bg-petroleo has-[:checked]:text-white has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-petroleo/20"
                      >
                        <input
                          type="radio"
                          name="horario"
                          className="sr-only"
                          value={h}
                          checked={datos.horario === h}
                          onChange={() => cambiar('horario', h)}
                        />
                        {h}
                      </label>
                    ))}
                  </div>
                  {errores.horario && <MensajeError id={`${id}-horario-error`}>{errores.horario}</MensajeError>}
                </fieldset>
                <Campo etiqueta="Comentario" opcional nombre="comentario" error={errores.comentario} id={id} ancho>
                  <textarea
                    className="campo min-h-28 resize-y"
                    rows={3}
                    maxLength={500}
                    placeholder="Por ejemplo: prefiero después de las 3 p. m., o quisiera consultar antes por WhatsApp."
                    value={datos.comentario}
                    onChange={(e) => cambiar('comentario', e.target.value)}
                  />
                </Campo>
              </div>

              <p id={`${id}-nota`} className="mt-6 flex gap-3 rounded-xl bg-arena/70 p-4 text-[0.9rem] text-tinta/80">
                <LockKeyhole aria-hidden className="mt-0.5 size-4 shrink-0 text-salvia-oscuro" />
                <span>
                  Por tu privacidad, evita incluir información médica o datos clínicos en este mensaje inicial; esos detalles
                  se conversan en la consulta. Esta página no guarda tus datos: solo prepara el mensaje en tu WhatsApp.{' '}
                  <button type="button" onClick={onPrivacidad} className="font-semibold text-petroleo underline underline-offset-2 hover:text-petroleo-oscuro">
                    Privacidad y tratamiento de datos
                  </button>
                </span>
              </p>

              <button type="submit" className="btn-principal mt-6 w-full sm:text-[1.05rem]" disabled={estado === 'abriendo'}>
                {estado === 'abriendo' ? (
                  <>
                    <LoaderCircle aria-hidden className="size-5 animate-spin" /> Abriendo WhatsApp…
                  </>
                ) : (
                  <>
                    <Send aria-hidden className="size-[1.1em]" /> Enviar solicitud por WhatsApp
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-[0.85rem] text-gris">Se abrirá WhatsApp para que envíes el mensaje tú mismo.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function MensajeError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-2 text-[0.88rem] text-[#9c3f2c]">
      {children}
    </p>
  );
}

function Campo({
  etiqueta,
  nombre,
  error,
  opcional,
  ancho,
  id,
  children,
}: {
  etiqueta: string;
  nombre: keyof Datos;
  error?: string;
  opcional?: boolean;
  ancho?: boolean;
  id: string;
  children: ReactElement<Record<string, unknown>>;
}) {
  const campoId = `${id}-${nombre}`;
  const errorId = `${campoId}-error`;
  const hijo = cloneElement(children, {
    id: campoId,
    name: nombre,
    'aria-required': opcional ? undefined : true,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? errorId : undefined,
  });
  return (
    <div className={ancho ? 'sm:col-span-2' : undefined}>
      <label htmlFor={campoId} className="mb-2 flex items-baseline justify-between gap-2 text-[0.95rem] font-semibold text-tinta">
        {etiqueta}
        {opcional && <span className="text-[0.82rem] font-normal text-gris">Opcional</span>}
      </label>
      {hijo}
      {error && <MensajeError id={errorId}>{error}</MensajeError>}
    </div>
  );
}

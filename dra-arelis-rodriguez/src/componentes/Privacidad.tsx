import { forwardRef, useImperativeHandle, useRef } from 'react';
import { X } from 'lucide-react';
import { MOSTRAR_PENDIENTES, NOMBRE, WHATSAPP_VISIBLE } from '../contenido';
import { Pendiente } from './Enlaces';

export interface PrivacidadHandle {
  abrir: () => void;
}

/** Aviso de privacidad y tratamiento de datos, en una ventana accesible (<dialog>). */
export const Privacidad = forwardRef<PrivacidadHandle>(function Privacidad(_, ref) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => ({ abrir: () => dialogo.current?.showModal() }), []);
  const cerrar = () => dialogo.current?.close();

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-privacidad"
      onClick={(e) => e.target === dialogo.current && cerrar()}
      className="m-auto max-h-[88dvh] w-[min(42rem,calc(100%-2rem))] rounded-[1.5rem] bg-crema p-0 text-tinta shadow-elevada backdrop:bg-petroleo-oscuro/45 backdrop:backdrop-blur-sm"
    >
      <div className="sticky top-0 flex items-center justify-between gap-4 border-b border-linea bg-crema/95 px-6 py-5 backdrop-blur sm:px-8">
        <h2 id="titulo-privacidad" className="text-[1.55rem]">
          Privacidad y tratamiento de datos
        </h2>
        <button
          type="button"
          onClick={cerrar}
          className="grid size-11 shrink-0 place-items-center rounded-full text-petroleo-oscuro transition hover:bg-arena"
          aria-label="Cerrar"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="space-y-5 px-6 py-6 text-[0.98rem] text-tinta/85 sm:px-8 [&_h3]:font-sans [&_h3]:text-[1rem] [&_h3]:font-semibold [&_h3]:text-petroleo-oscuro">
        {MOSTRAR_PENDIENTES && <Pendiente>Texto base: revisar con la doctora antes de publicar</Pendiente>}
        <section>
          <h3>Responsable</h3>
          <p>
            {NOMBRE}, odontóloga. Contacto: WhatsApp {WHATSAPP_VISIBLE}.
          </p>
        </section>
        <section>
          <h3>Qué datos se recogen en esta página</h3>
          <p>
            Esta página no tiene registro de usuarios ni base de datos y no guarda la información que escribes. El
            formulario de citas solo prepara un mensaje que se abre en tu propio WhatsApp; tú decides si lo envías.
          </p>
        </section>
        <section>
          <h3>Para qué se usan</h3>
          <p>
            Los datos que envíes por WhatsApp (nombre, número de contacto, servicio de interés, día y horario preferidos y
            tu comentario) se usan únicamente para responder tu consulta y coordinar una posible cita. No se venden ni se
            comparten con terceros para publicidad.
          </p>
        </section>
        <section>
          <h3>Información de salud</h3>
          <p>
            Te pedimos no enviar datos clínicos ni información médica privada en los mensajes iniciales. Esos detalles se
            conversan de forma reservada durante la consulta.
          </p>
        </section>
        <section>
          <h3>Servicios de terceros</h3>
          <p>
            La conversación ocurre en WhatsApp, que tiene sus propias condiciones y política de privacidad. Algunas
            fotografías ilustrativas se cargan desde Unsplash, que puede registrar datos técnicos de la visita, como la
            dirección IP.
          </p>
        </section>
        <section>
          <h3>Tus derechos</h3>
          <p>
            Puedes pedir en cualquier momento que se eliminen tus mensajes y datos de contacto, o consultar qué información
            se conserva, escribiendo al mismo número de WhatsApp.
          </p>
        </section>
        <p className="text-[0.88rem] text-gris">
          El contenido de esta página es informativo y no sustituye una valoración odontológica profesional.
        </p>
      </div>
    </dialog>
  );
});

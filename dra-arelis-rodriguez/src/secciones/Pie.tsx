import { CREDITO, ESPECIALIDAD, HORARIO, NOMBRE, UBICACION, WHATSAPP_VISIBLE } from '../contenido';
import { EnlaceWhatsApp } from '../componentes/Enlaces';
import { mensajeGeneral } from '../whatsapp';

export function Pie({ onPrivacidad }: { onPrivacidad: () => void }) {
  return (
    <footer className="border-t border-linea pt-16 pb-28 sm:pb-16">
      <div className="contenedor grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="font-serif text-[1.6rem] text-petroleo-oscuro">{NOMBRE}</p>
          <p className="mt-1 text-gris">{ESPECIALIDAD} · Servicio de atención odontológica</p>
          <p className="mt-4 text-tinta/85">
            {HORARIO.dias}, de {HORARIO.horas}
            <br />
            <span className="text-gris">Atención con cita previa</span>
          </p>
          {UBICACION && <p className="mt-2 text-gris">{UBICACION}</p>}
        </div>
        <div>
          <p className="text-[0.78rem] font-semibold tracking-[0.14em] text-salvia-oscuro uppercase">Citas y consultas</p>
          <EnlaceWhatsApp
            mensaje={mensajeGeneral()}
            className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-petroleo-oscuro underline-offset-4 hover:underline"
          >
            WhatsApp {WHATSAPP_VISIBLE}
          </EnlaceWhatsApp>
        </div>
        <div>
          <p className="text-[0.78rem] font-semibold tracking-[0.14em] text-salvia-oscuro uppercase">Información</p>
          <ul className="mt-3 space-y-1">
            <li>
              <button type="button" onClick={onPrivacidad} className="min-h-11 text-left text-tinta/85 underline-offset-4 hover:text-petroleo-oscuro hover:underline">
                Privacidad y tratamiento de datos
              </button>
            </li>
            <li>
              <a href="#preguntas" className="inline-flex min-h-11 items-center text-tinta/85 underline-offset-4 hover:text-petroleo-oscuro hover:underline">
                Preguntas frecuentes
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="contenedor mt-12 border-t border-linea pt-8 text-[0.88rem] text-gris">
        <p className="max-w-3xl">
          El contenido de esta página es informativo y no sustituye una valoración odontológica profesional. Las fotografías
          marcadas como «Imagen ilustrativa» no corresponden a la doctora ni a su consultorio.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {NOMBRE}
          </p>
          {CREDITO.mostrar && (
            <a href={CREDITO.enlace} target="_blank" rel="noopener noreferrer" className="text-gris/90 underline-offset-4 hover:text-petroleo hover:underline">
              {CREDITO.texto}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

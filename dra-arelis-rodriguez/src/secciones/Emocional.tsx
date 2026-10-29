import { FOTOS } from '../contenido';
import { EnlaceWhatsApp, EtiquetaIlustrativa } from '../componentes/Enlaces';
import { mensajeGeneral } from '../whatsapp';

export function Emocional() {
  return (
    <section aria-labelledby="titulo-emocional" className="px-3 sm:px-5">
      <div className="relative mx-auto max-w-[78rem] overflow-hidden rounded-[2rem] bg-salvia-claro md:rounded-[2.5rem]">
        <div className="grid md:grid-cols-[1.1fr_0.9fr]">
          <div className="revelar px-7 py-16 sm:px-12 md:py-24 lg:px-20">
            <h2 id="titulo-emocional" className="max-w-xl text-[2.1rem] leading-[1.12] sm:text-[2.65rem]">
              Hay pequeñas decisiones que pueden marcar una gran diferencia.
            </h2>
            <p className="mt-6 max-w-lg text-[1.1rem] text-tinta/75">
              Dedicar tiempo a tu salud bucal es una forma de cuidarte. Si tienes una inquietud, hace tiempo que no
              realizas una valoración o simplemente deseas conocer tus opciones, puedes comenzar con una conversación.
            </p>
            <EnlaceWhatsApp mensaje={mensajeGeneral()} className="btn-principal mt-9">
              Hablemos de tu sonrisa
            </EnlaceWhatsApp>
          </div>
          <div className="relative min-h-72 md:min-h-full">
            <img
              src={FOTOS.consultorio.src}
              alt={FOTOS.consultorio.alt}
              loading="lazy"
              width={1100}
              height={1300}
              className="absolute inset-0 size-full object-cover text-transparent"
              onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-salvia-claro/50 to-transparent md:from-salvia-claro md:via-salvia-claro/10" />
            {FOTOS.consultorio.ilustrativa && <EtiquetaIlustrativa className="absolute right-4 bottom-4" />}
          </div>
        </div>
      </div>
    </section>
  );
}

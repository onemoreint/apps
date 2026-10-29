import { useId, useState } from 'react';
import { Plus } from 'lucide-react';
import { PREGUNTAS } from '../contenido';
import { EnlaceWhatsApp } from '../componentes/Enlaces';
import { mensajeGeneral } from '../whatsapp';

export function Preguntas() {
  const [abierta, setAbierta] = useState<number | null>(0);
  const id = useId();

  return (
    <section id="preguntas" aria-labelledby="titulo-preguntas" className="bg-arena/60 py-20 md:py-28">
      <div className="contenedor grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
        <div className="revelar">
          <p className="antetitulo">Preguntas frecuentes</p>
          <h2 id="titulo-preguntas" className="text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">
            Lo que suelen preguntarnos.
          </h2>
          <p className="mt-5 text-[1.05rem] text-gris">¿Tienes otra duda? Escríbenos y con gusto te respondemos.</p>
          <EnlaceWhatsApp mensaje={mensajeGeneral()} className="btn-secundario mt-7">
            Hacer una pregunta
          </EnlaceWhatsApp>
        </div>

        <ul className="revelar divide-y divide-arena-oscura border-y border-arena-oscura">
          {PREGUNTAS.map((p, i) => {
            const abiertaEsta = abierta === i;
            return (
              <li key={p.pregunta}>
                <h3 className="font-sans text-[1.08rem] font-semibold">
                  <button
                    type="button"
                    id={`${id}-p${i}`}
                    aria-expanded={abiertaEsta}
                    aria-controls={`${id}-r${i}`}
                    onClick={() => setAbierta(abiertaEsta ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-6 text-left text-tinta transition hover:text-petroleo-oscuro"
                  >
                    {p.pregunta}
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full border transition duration-300 ${
                        abiertaEsta ? 'rotate-45 border-petroleo bg-petroleo text-white' : 'border-arena-oscura bg-white text-petroleo'
                      }`}
                    >
                      <Plus aria-hidden className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`${id}-r${i}`}
                  role="region"
                  aria-labelledby={`${id}-p${i}`}
                  className={`grid transition-[grid-template-rows] duration-400 ease-out ${abiertaEsta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  inert={!abiertaEsta}
                >
                  <div className="overflow-hidden">
                    <p className="max-w-2xl pr-12 pb-6 text-gris">{p.respuesta}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

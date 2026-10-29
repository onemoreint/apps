import { Compass, HandHeart, MessageCircleHeart } from 'lucide-react';

const PILARES = [
  {
    icono: MessageCircleHeart,
    titulo: 'Atención cercana',
    texto: 'Un espacio para expresar tus dudas y necesidades, con el tiempo que merecen.',
  },
  {
    icono: Compass,
    titulo: 'Orientación profesional',
    texto: 'Información clara para ayudarte a entender tus opciones y tomar decisiones con tranquilidad.',
  },
  {
    icono: HandHeart,
    titulo: 'Cuidado personalizado',
    texto: 'Cada tratamiento debe responder a la valoración de cada paciente, no a una fórmula general.',
  },
];

export function Confianza() {
  return (
    <section aria-labelledby="titulo-confianza" className="py-20 md:py-28">
      <div className="contenedor">
        <div className="revelar grid gap-6 md:grid-cols-2 md:items-end md:gap-16">
          <div>
            <p className="antetitulo">Nuestro enfoque</p>
            <h2 id="titulo-confianza" className="text-[2.2rem] leading-[1.1] sm:text-[2.8rem]">
              Cuidar tu sonrisa también es cuidar de ti.
            </h2>
          </div>
          <p className="text-[1.1rem] text-gris md:pb-1.5">
            Cada persona tiene necesidades diferentes. Por eso, una buena atención comienza escuchándote, conociendo tus
            inquietudes y orientándote sobre las alternativas adecuadas para tu salud bucal.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {PILARES.map(({ icono: Icono, titulo, texto }, i) => (
            <li
              key={titulo}
              className="revelar tarjeta group p-7 transition duration-500 hover:-translate-y-1 hover:shadow-elevada sm:p-8"
              style={{ '--retraso': `${i * 110}ms` } as React.CSSProperties}
            >
              <span className="grid size-12 place-items-center rounded-2xl bg-salvia-claro text-salvia-oscuro transition duration-500 group-hover:bg-petroleo group-hover:text-white">
                <Icono aria-hidden className="size-[1.4rem]" strokeWidth={1.75} />
              </span>
              <h3 className="mt-6 text-[1.45rem]">{titulo}</h3>
              <p className="mt-2 text-gris">{texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

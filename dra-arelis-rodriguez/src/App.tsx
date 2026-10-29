import { useRef } from 'react';
import { Encabezado } from './secciones/Encabezado';
import { Hero } from './secciones/Hero';
import { Confianza } from './secciones/Confianza';
import { Servicios } from './secciones/Servicios';
import { SobreMi } from './secciones/SobreMi';
import { Emocional } from './secciones/Emocional';
import { SolicitudCita } from './secciones/SolicitudCita';
import { Preguntas } from './secciones/Preguntas';
import { Cierre } from './secciones/Cierre';
import { Pie } from './secciones/Pie';
import { BotonFlotante } from './componentes/BotonFlotante';
import { Privacidad, type PrivacidadHandle } from './componentes/Privacidad';
import { useRevelar } from './componentes/useRevelar';

export default function App() {
  const privacidad = useRef<PrivacidadHandle>(null);
  useRevelar();

  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-[60] rounded-full bg-petroleo px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar al contenido
      </a>
      <Encabezado />
      <main id="contenido">
        <Hero />
        <Confianza />
        <Servicios />
        <SobreMi />
        <Emocional />
        <SolicitudCita onPrivacidad={() => privacidad.current?.abrir()} />
        <Preguntas />
        <Cierre />
      </main>
      <Pie onPrivacidad={() => privacidad.current?.abrir()} />
      <BotonFlotante />
      <Privacidad ref={privacidad} />
    </>
  );
}

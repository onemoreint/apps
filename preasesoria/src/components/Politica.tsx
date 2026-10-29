import { useEffect, useRef } from 'react';
import { CONFIG } from '../config';

interface Props {
  abierta: boolean;
  onCerrar: () => void;
}

/** Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013, Colombia). */
export function Politica({ abierta, onCerrar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal?.();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  const n = CONFIG.responsableNombre;

  return (
    <dialog ref={ref} className="politica" onClose={onCerrar} aria-labelledby="titulo-politica">
      <div className="politica__cabecera">
        <h2 id="titulo-politica">Política de tratamiento de datos personales</h2>
        <button type="button" className="politica__cerrar" onClick={onCerrar} aria-label="Cerrar política">
          ×
        </button>
      </div>
      <div className="politica__cuerpo">
        <h3>1. Responsable</h3>
        <p>
          {n}, {CONFIG.especialidad.toLowerCase()}. WhatsApp {CONFIG.whatsappVisible}. Correo{' '}
          {CONFIG.responsableCorreo}.
        </p>

        <h3>2. Datos que se solicitan</h3>
        <p>
          Nombre, edad, peso, estatura, actividad laboral, hábitos (actividad física, digestión, consumo de agua y
          comidas), sueño, condiciones de salud, medicamentos o suplementos, alergias y objetivos personales.
        </p>

        <h3>3. Finalidad</h3>
        <p>
          Los datos se solicitan porque son esenciales para realizar tu <strong>valoración inicial</strong> y preparar
          tu asesoría personalizada. <strong>No se usarán para ningún otro fin</strong>: no se venden, no se comparten
          con terceros y no se usan para publicidad.
        </p>

        <h3>4. No almacenamiento</h3>
        <p>
          Este formulario <strong>no almacena tus datos en ninguna parte</strong>: no tiene base de datos ni servidor
          que los reciba, y no los guarda en tu navegador. Tus respuestas existen solo en tu pantalla mientras llenas el
          formulario y desaparecen al cerrarlo. Únicamente llegan a {n} si tú decides enviarlas pulsando «Enviar» en
          WhatsApp, y quedan en esa conversación, que puedes pedir que se borre en cualquier momento.
        </p>

        <h3>5. Datos sensibles</h3>
        <p>
          Los datos de salud (peso, estatura, sueño, digestión, condiciones, medicamentos y alergias) son datos
          sensibles. Edad, peso y estatura son indispensables para la valoración; las demás preguntas de salud son
          opcionales. Eres libre de no entregar datos sensibles; en ese caso no será posible realizar la valoración.
          Su tratamiento requiere tu autorización expresa.
        </p>

        <h3>6. Menores de edad</h3>
        <p>Si quien responde es menor de 18 años, su padre, madre o representante legal debe autorizar el envío.</p>

        <h3>7. Tus derechos</h3>
        <p>
          Puedes conocer, actualizar, rectificar y solicitar la supresión de tus datos, pedir prueba de tu autorización,
          revocarla en cualquier momento y presentar quejas ante la Superintendencia de Industria y Comercio.
        </p>

        <h3>8. Cómo ejercerlos</h3>
        <p>
          Escribe al WhatsApp {CONFIG.whatsappVisible} o al correo {CONFIG.responsableCorreo}. Las consultas se
          responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles.
        </p>

        <h3>9. Vigencia</h3>
        <p>Esta política rige desde el {CONFIG.politicaVigencia}.</p>
      </div>
      <div className="politica__pie">
        <button type="button" className="boton boton--primario boton--ancho" onClick={onCerrar}>
          Entendido
        </button>
      </div>
    </dialog>
  );
}

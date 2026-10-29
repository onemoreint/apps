import { CONFIG, nombreResponsable } from '../config';
import { Politica } from './Politica';
import { useState } from 'react';
import { LIMITE_TEXTO_LARGO, MAX_MEDICAMENTOS, compartioDatosSensibles, esMenorDeEdad, mostrar } from '../logica';
import * as O from '../opciones';
import type { Errores, Medicamento, Respuestas } from '../types';
import { Campo, Casilla, IconoCandado, IconoMas, IconoPapelera, Opciones } from './Ui';

export interface SeccionProps {
  r: Respuestas;
  set: <K extends keyof Respuestas>(campo: K, valor: Respuestas[K]) => void;
  errores: Errores;
}

function AvisoSensible() {
  return (
    <div className="aviso aviso--suave">
      <IconoCandado />
      <p>
        Estas preguntas tratan sobre tu salud. <strong>Son opcionales</strong>: responde solo lo que quieras
        compartir. Mientras más completa la información, mejor podremos orientar tu asesoría.
      </p>
    </div>
  );
}

export function SeccionPersonales({ r, set, errores }: SeccionProps) {
  return (
    <>
      <Campo
        numero={1}
        nombre="nombre"
        etiqueta="Nombre completo"
        obligatoria
        valor={r.nombre}
        onCambio={(v) => set('nombre', v)}
        error={errores.nombre}
        placeholder="Ej.: Laura Gómez Pérez"
        autoComplete="name"
        maxLength={120}
      />
      <Campo
        numero={2}
        nombre="edad"
        etiqueta="Edad"
        obligatoria
        tipo="entero"
        sufijo="años"
        valor={r.edad}
        onCambio={(v) => set('edad', v)}
        error={errores.edad}
        placeholder="Ej.: 35"
        maxLength={3}
      />
      <Campo
        numero={3}
        nombre="peso"
        etiqueta="Peso actual"
        obligatoria
        tipo="decimal"
        sufijo="kg"
        valor={r.peso}
        onCambio={(v) => set('peso', v)}
        error={errores.peso}
        placeholder="Ej.: 72.5"
        maxLength={6}
        ayuda="En kilogramos. Puedes usar decimales."
      />
      <Campo
        numero={4}
        nombre="estatura"
        etiqueta="Estatura"
        obligatoria
        tipo="decimal"
        sufijo="m"
        valor={r.estatura}
        onCambio={(v) => set('estatura', v)}
        error={errores.estatura}
        placeholder="Ej.: 1.68"
        maxLength={5}
        ayuda="En metros, por ejemplo 1.68."
      />
    </>
  );
}

export function SeccionHabitos({ r, set, errores }: SeccionProps) {
  return (
    <>
      <Opciones
        numero={5}
        nombre="actividadLaboral"
        etiqueta="¿Cuál es tu actividad laboral actual?"
        obligatoria
        opciones={O.ACTIVIDAD_LABORAL}
        valor={r.actividadLaboral}
        onCambio={(v) => set('actividadLaboral', v)}
        error={errores.actividadLaboral}
      />
      {mostrar.actividadLaboralOtro(r) && (
        <Campo
          condicional
          nombre="actividadLaboralOtro"
          etiqueta="¿Cuál es tu actividad?"
          obligatoria
          valor={r.actividadLaboralOtro}
          onCambio={(v) => set('actividadLaboralOtro', v)}
          error={errores.actividadLaboralOtro}
          maxLength={120}
        />
      )}
      <Opciones
        numero={6}
        nombre="actividadFisica"
        etiqueta="¿Realizas actividad física o algún deporte?"
        obligatoria
        opciones={O.ACTIVIDAD_FISICA}
        valor={r.actividadFisica}
        onCambio={(v) => set('actividadFisica', v)}
        error={errores.actividadFisica}
      />
      {mostrar.tipoEjercicio(r) && (
        <Campo
          condicional
          nombre="tipoEjercicio"
          etiqueta="¿Qué actividad realizas?"
          valor={r.tipoEjercicio}
          onCambio={(v) => set('tipoEjercicio', v)}
          error={errores.tipoEjercicio}
          placeholder="Ej.: caminar, natación, gimnasio"
          maxLength={120}
        />
      )}
      <Opciones
        numero={7}
        nombre="evacuacion"
        etiqueta="¿Cuántas veces evacúas habitualmente al día?"
        opciones={O.EVACUACION}
        valor={r.evacuacion}
        onCambio={(v) => set('evacuacion', v)}
        error={errores.evacuacion}
      />
      <Opciones
        numero={8}
        nombre="agua"
        etiqueta="¿Cuánta agua consumes al día?"
        obligatoria
        opciones={O.AGUA}
        valor={r.agua}
        onCambio={(v) => set('agua', v)}
        error={errores.agua}
      />
      <Opciones
        numero={9}
        nombre="comidas"
        etiqueta="¿Cuántas veces comes al día?"
        obligatoria
        opciones={O.COMIDAS}
        valor={r.comidas}
        onCambio={(v) => set('comidas', v)}
        error={errores.comidas}
      />
    </>
  );
}

export function SeccionSueno({ r, set, errores }: SeccionProps) {
  return (
    <>
      <AvisoSensible />
      <Opciones
        numero={10}
        nombre="horasSueno"
        etiqueta="¿Cuántas horas duermes habitualmente por noche?"
        opciones={O.HORAS_SUENO}
        valor={r.horasSueno}
        onCambio={(v) => set('horasSueno', v)}
        error={errores.horasSueno}
      />
      <Opciones
        numero={11}
        nombre="interrupciones"
        etiqueta="¿Se interrumpe tu sueño durante la noche?"
        opciones={O.INTERRUPCIONES}
        valor={r.interrupciones}
        onCambio={(v) => set('interrupciones', v)}
        error={errores.interrupciones}
      />
      {mostrar.volverDormir(r) && (
        <Opciones
          condicional
          numero={12}
          nombre="volverDormir"
          etiqueta="Si te despiertas durante la noche, ¿cuánto tardas en volver a dormirte?"
          opciones={O.VOLVER_DORMIR}
          valor={r.volverDormir}
          onCambio={(v) => set('volverDormir', v)}
          error={errores.volverDormir}
        />
      )}
    </>
  );
}

function nuevoMedicamento(): Medicamento {
  return {
    id: Math.random().toString(36).slice(2, 10),
    nombre: '',
    dosis: '',
    frecuencia: '',
    observaciones: '',
  };
}

export function SeccionSalud({ r, set, errores }: SeccionProps) {
  const actualizarMed = (id: string, campo: keyof Medicamento, valor: string) =>
    set(
      'medicamentos',
      r.medicamentos.map((m) => (m.id === id ? { ...m, [campo]: valor } : m)),
    );

  return (
    <>
      <AvisoSensible />
      <p className="nota">
        Esta información es declarada por ti. Este formulario no hace diagnósticos ni recomienda tratamientos.
      </p>
      <Opciones
        numero={13}
        nombre="tieneCondicion"
        etiqueta="¿Tienes alguna enfermedad o condición de salud diagnosticada?"
        opciones={O.CONDICION}
        valor={r.tieneCondicion}
        onCambio={(v) => set('tieneCondicion', v)}
        error={errores.tieneCondicion}
      />
      {mostrar.condiciones(r) && (
        <Campo
          condicional
          multilinea
          nombre="condiciones"
          etiqueta="¿Cuáles condiciones de salud tienes?"
          valor={r.condiciones}
          onCambio={(v) => set('condiciones', v)}
          error={errores.condiciones}
          maxLength={LIMITE_TEXTO_LARGO}
        />
      )}

      <Opciones
        numero={14}
        nombre="tomaMedicamentos"
        etiqueta="¿Tomas actualmente medicamentos, vitaminas, suplementos o productos naturales?"
        opciones={O.MEDICAMENTOS}
        valor={r.tomaMedicamentos}
        onCambio={(v) => {
          set('tomaMedicamentos', v);
          if (v === O.SI && r.medicamentos.length === 0) set('medicamentos', [nuevoMedicamento()]);
        }}
        error={errores.tomaMedicamentos}
      />
      {mostrar.medicamentos(r) && (
        <div className="medicamentos pregunta--condicional">
          {r.medicamentos.map((m, i) => (
            <fieldset className="tarjeta-med" key={m.id} data-medicamento={i + 1}>
              <legend>
                Producto {i + 1}
                <button
                  type="button"
                  className="boton-icono"
                  onClick={() => set('medicamentos', r.medicamentos.filter((x) => x.id !== m.id))}
                  aria-label={`Eliminar producto ${i + 1}`}
                >
                  <IconoPapelera />
                </button>
              </legend>
              <Campo
                nombre={`med-nombre-${i}`}
                etiqueta="Nombre del medicamento o producto"
                obligatoria
                valor={m.nombre}
                onCambio={(v) => actualizarMed(m.id, 'nombre', v)}
                error={errores[`med-${m.id}`]}
                maxLength={120}
              />
              <div className="dos-columnas">
                <Campo
                  nombre={`med-dosis-${i}`}
                  etiqueta="Dosis indicada"
                  valor={m.dosis}
                  onCambio={(v) => actualizarMed(m.id, 'dosis', v)}
                  placeholder="Ej.: 160 mg"
                  maxLength={60}
                />
                <Campo
                  nombre={`med-frecuencia-${i}`}
                  etiqueta="Frecuencia de uso"
                  valor={m.frecuencia}
                  onCambio={(v) => actualizarMed(m.id, 'frecuencia', v)}
                  placeholder="Ej.: 1 vez al día"
                  maxLength={80}
                />
              </div>
              <Campo
                nombre={`med-obs-${i}`}
                etiqueta="Observaciones"
                valor={m.observaciones}
                onCambio={(v) => actualizarMed(m.id, 'observaciones', v)}
                maxLength={200}
              />
            </fieldset>
          ))}
          {r.medicamentos.length < MAX_MEDICAMENTOS ? (
            <button
              type="button"
              className="boton boton--secundario boton--ancho"
              onClick={() => set('medicamentos', [...r.medicamentos, nuevoMedicamento()])}
              data-accion="anadir-medicamento"
            >
              <IconoMas /> Añadir medicamento o producto
            </button>
          ) : (
            <p className="nota">
              Llegaste al máximo de {MAX_MEDICAMENTOS} productos. Puedes mencionar los demás en «Observaciones
              adicionales».
            </p>
          )}
        </div>
      )}

      <Opciones
        numero={15}
        nombre="tieneAlergias"
        etiqueta="¿Tienes alergias conocidas o restricciones relevantes para la asesoría?"
        opciones={O.ALERGIAS}
        valor={r.tieneAlergias}
        onCambio={(v) => set('tieneAlergias', v)}
        error={errores.tieneAlergias}
      />
      {mostrar.alergias(r) && (
        <Campo
          condicional
          multilinea
          nombre="alergias"
          etiqueta="¿Cuáles alergias o restricciones?"
          valor={r.alergias}
          onCambio={(v) => set('alergias', v)}
          error={errores.alergias}
          maxLength={LIMITE_TEXTO_LARGO}
        />
      )}
    </>
  );
}

export function SeccionObjetivos({ r, set, errores }: SeccionProps) {
  return (
    <>
      <Opciones
        numero={16}
        nombre="objetivo"
        etiqueta="¿Cuál es tu principal objetivo con esta asesoría?"
        obligatoria
        opciones={O.OBJETIVOS}
        valor={r.objetivo}
        onCambio={(v) => set('objetivo', v)}
        error={errores.objetivo}
      />
      {mostrar.objetivoOtro(r) && (
        <Campo
          condicional
          nombre="objetivoOtro"
          etiqueta="¿Cuál es tu objetivo?"
          obligatoria
          valor={r.objetivoOtro}
          onCambio={(v) => set('objetivoOtro', v)}
          error={errores.objetivoOtro}
          maxLength={120}
        />
      )}
      <Campo
        numero={17}
        multilinea
        nombre="observaciones"
        etiqueta="¿Hay algo más que quieras compartir antes de iniciar la asesoría?"
        valor={r.observaciones}
        onCambio={(v) => set('observaciones', v)}
        error={errores.observaciones}
        maxLength={LIMITE_TEXTO_LARGO}
      />
    </>
  );
}

export function SeccionPrivacidad({ r, set, errores }: SeccionProps) {
  const sensibles = compartioDatosSensibles(r);
  const menor = esMenorDeEdad(r);
  const responsable = nombreResponsable();
  const [verPolitica, setVerPolitica] = useState(false);

  return (
    <>
      <div className="texto-legal">
        <h3>¿Para qué se usan tus respuestas?</h3>
        <p>
          Solo para tu <strong>valoración inicial</strong> y para preparar tu asesoría personalizada. Son datos
          esenciales para valorarte bien y <strong>no se usarán para ningún otro fin</strong>. No se hacen diagnósticos
          médicos.
        </p>
        <h3>¿Se guardan en algún lugar?</h3>
        <p>
          <strong>No.</strong> Este formulario no almacena tus datos en ninguna base de datos, servidor ni en tu
          navegador. Al final se abrirá WhatsApp con un mensaje preparado para {responsable} y{' '}
          <strong>tú decides si lo envías</strong>.
        </p>
        <h3>Tus derechos</h3>
        <p>
          Puedes conocer, actualizar, rectificar o pedir que se borren tus datos, y revocar esta autorización,
          escribiendo al WhatsApp {CONFIG.whatsappVisible}
          {CONFIG.responsableCorreo ? ` o a ${CONFIG.responsableCorreo}` : ''}.
        </p>
        <p className="texto-legal__politica">
          {CONFIG.politicaPrivacidadUrl ? (
            <a href={CONFIG.politicaPrivacidadUrl} target="_blank" rel="noopener noreferrer">
              Consulta la política de tratamiento de datos personales
            </a>
          ) : (
            <button type="button" className="enlace" onClick={() => setVerPolitica(true)} data-accion="ver-politica">
              Leer la política de tratamiento de datos personales
            </button>
          )}
        </p>
      </div>
      <Politica abierta={verPolitica} onCerrar={() => setVerPolitica(false)} />

      <Casilla
        nombre="autorizaDatos"
        marcada={r.autorizaDatos}
        onCambio={(v) => set('autorizaDatos', v)}
        error={errores.autorizaDatos}
      >
        <strong>Autorizo</strong> a {responsable} el tratamiento de mis datos personales para mi valoración, conforme a
        la política de tratamiento de datos, y que mis respuestas se le envíen por WhatsApp.{' '}
        <span className="marca-obligatoria">*</span>
      </Casilla>

      {sensibles ? (
        <Casilla
          nombre="autorizaSensibles"
          marcada={r.autorizaSensibles}
          onCambio={(v) => set('autorizaSensibles', v)}
          error={errores.autorizaSensibles}
        >
          <strong>Autorizo de forma expresa</strong> el tratamiento de los datos relacionados con mi salud (peso,
          estatura, sueño, digestión, condiciones, medicamentos o alergias). Entiendo que son datos sensibles.{' '}
          <span className="marca-obligatoria">*</span>
        </Casilla>
      ) : (
        <p className="nota">No compartiste datos de salud, así que no hace falta una autorización adicional.</p>
      )}

      {menor && (
        <Casilla
          nombre="autorizaRepresentante"
          marcada={r.autorizaRepresentante}
          onCambio={(v) => set('autorizaRepresentante', v)}
          error={errores.autorizaRepresentante}
        >
          Soy <strong>el padre, la madre o el representante legal</strong> del menor de edad y autorizo el tratamiento de
          sus datos para esta valoración. <span className="marca-obligatoria">*</span>
        </Casilla>
      )}
    </>
  );
}

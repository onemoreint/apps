import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from './config';
import {
  PASOS,
  type PasoId,
  type PlanEnvio,
  construirSecciones,
  planificarEnvio,
  primerPasoConErrores,
  validarPaso,
} from './logica';
import { RESPUESTAS_VACIAS, type Errores, type Respuestas } from './types';
import {
  SeccionHabitos,
  SeccionObjetivos,
  SeccionPersonales,
  SeccionPrivacidad,
  SeccionSalud,
  SeccionSueno,
  type SeccionProps,
} from './components/Secciones';
import {
  IconoCandado,
  IconoCopiar,
  IconoFlechaDer,
  IconoFlechaIzq,
  IconoHoja,
  IconoLapiz,
  IconoListo,
  IconoWhatsApp,
} from './components/Ui';

const SECCIONES: Partial<Record<PasoId, (p: SeccionProps) => JSX.Element>> = {
  personales: SeccionPersonales,
  habitos: SeccionHabitos,
  sueno: SeccionSueno,
  salud: SeccionSalud,
  objetivos: SeccionObjetivos,
  privacidad: SeccionPrivacidad,
};

const DESCRIPCION: Partial<Record<PasoId, string>> = {
  personales: 'Empecemos por lo básico.',
  habitos: 'Tu rutina diaria nos ayuda a entender tu punto de partida.',
  sueno: 'El descanso es clave para tu bienestar.',
  salud: 'Cuéntanos lo que consideres importante.',
  objetivos: '¿Qué te gustaría lograr?',
  privacidad: 'Antes de preparar tu mensaje, lee y autoriza.',
  revision: 'Comprueba que todo esté correcto. Puedes editar cualquier sección.',
};

/** Paso que corresponde a cada sección del resumen, para el botón «Editar». */
const PASO_DE_SECCION: Record<string, PasoId> = {
  'DATOS PERSONALES': 'personales',
  'ACTIVIDAD Y HÁBITOS': 'habitos',
  'SUEÑO Y DESCANSO': 'sueno',
  'SALUD Y MEDICAMENTOS': 'salud',
  OBJETIVOS: 'objetivos',
  PRIVACIDAD: 'privacidad',
};

// Pasos que cuentan en la barra de progreso (sin bienvenida ni pantalla final)
const PASOS_PROGRESO = PASOS.filter((p) => p.id !== 'inicio' && p.id !== 'listo');

async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    /* se intenta el método alternativo */
  }
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, texto.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export default function App() {
  const [r, setR] = useState<Respuestas>(RESPUESTAS_VACIAS);
  const [paso, setPaso] = useState<PasoId>('inicio');
  const [mostrarErrores, setMostrarErrores] = useState<Partial<Record<PasoId, boolean>>>({});
  const [desdeRevision, setDesdeRevision] = useState(false);
  const [plan, setPlan] = useState<PlanEnvio | null>(null);
  const [aviso, setAviso] = useState<string>('');
  const [copiado, setCopiado] = useState<'' | 'ok' | 'error'>('');
  const [partesAbiertas, setPartesAbiertas] = useState<number[]>([]);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const primerRender = useRef(true);

  const set = useCallback(<K extends keyof Respuestas>(campo: K, valor: Respuestas[K]) => {
    setR((prev) => ({ ...prev, [campo]: valor }));
  }, []);

  const errores: Errores = useMemo(
    () => (mostrarErrores[paso] ? validarPaso(paso, r) : {}),
    [mostrarErrores, paso, r],
  );

  // Al cambiar de paso: subir al inicio y llevar el foco al título (lectores de pantalla)
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    tituloRef.current?.focus({ preventScroll: true });
  }, [paso]);

  // Evita perder respuestas por cerrar o recargar la página sin querer
  useEffect(() => {
    const tieneDatos = r.nombre.trim() !== '' || r.edad.trim() !== '';
    if (!tieneDatos) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [r.nombre, r.edad]);

  const indice = PASOS.findIndex((p) => p.id === paso);
  const info = PASOS[indice];
  const indiceProgreso = PASOS_PROGRESO.findIndex((p) => p.id === paso);

  const irA = (destino: PasoId) => {
    setAviso('');
    setCopiado('');
    setPaso(destino);
  };

  const enfocarPrimerError = () => {
    requestAnimationFrame(() => {
      const alerta = document.querySelector('.pregunta--error, .casilla--error');
      if (!alerta) return;
      alerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = alerta.querySelector<HTMLElement>('input, textarea, [role="radio"][tabindex="0"]');
      control?.focus({ preventScroll: true });
    });
  };

  const continuar = () => {
    const errs = validarPaso(paso, r);
    if (Object.keys(errs).length) {
      setMostrarErrores((m) => ({ ...m, [paso]: true }));
      enfocarPrimerError();
      return;
    }
    if (desdeRevision) {
      // Tras corregir desde la revisión, se vuelve allí si todo lo anterior sigue válido
      const pendiente = primerPasoConErrores(r);
      if (!pendiente) {
        setDesdeRevision(false);
        irA('revision');
        return;
      }
    }
    irA(PASOS[indice + 1].id);
  };

  const anterior = () => {
    if (indice > 0) irA(PASOS[indice - 1].id);
  };

  const editar = (destino: PasoId) => {
    setDesdeRevision(true);
    irA(destino);
  };

  const abrirEnlace = (url: string): boolean => {
    try {
      const ventana = window.open(url, '_blank');
      if (ventana) {
        try {
          ventana.opener = null;
        } catch {
          /* sin importancia */
        }
        return true;
      }
    } catch {
      /* bloqueado */
    }
    return false;
  };

  const enviarPorWhatsApp = () => {
    const pendiente = primerPasoConErrores(r);
    if (pendiente) {
      setMostrarErrores((m) => ({ ...m, [pendiente]: true }));
      setDesdeRevision(true);
      irA(pendiente);
      enfocarPrimerError();
      return;
    }
    const nuevoPlan = planificarEnvio(r);
    setPlan(nuevoPlan);
    setPartesAbiertas([]);
    if (nuevoPlan.enlaces.length === 1) {
      const abierto = abrirEnlace(nuevoPlan.enlaces[0]);
      setPartesAbiertas([0]);
      irA('listo');
      if (!abierto)
        setAviso('No pudimos abrir WhatsApp automáticamente. Pulsa «Abrir WhatsApp» o copia tus respuestas.');
    } else {
      irA('listo');
    }
  };

  const copiar = async () => {
    const texto = plan?.completo ?? planificarEnvio(r).completo;
    const ok = await copiarTexto(texto);
    setCopiado(ok ? 'ok' : 'error');
  };

  const empezarDeNuevo = () => {
    if (!window.confirm('¿Borrar todas tus respuestas de este dispositivo y empezar de nuevo?')) return;
    setR({ ...RESPUESTAS_VACIAS, medicamentos: [] });
    setMostrarErrores({});
    setPlan(null);
    setDesdeRevision(false);
    irA('inicio');
  };

  const Seccion = SECCIONES[paso];

  return (
    <div className="pagina">
      <header className="cabecera">
        <div className="cabecera__marca">
          <span className="cabecera__logo">
            <IconoHoja />
          </span>
          <span>{CONFIG.tituloApp}</span>
        </div>
        {indiceProgreso >= 0 && (
          <div className="progreso" aria-label={`Paso ${indiceProgreso + 1} de ${PASOS_PROGRESO.length}`}>
            <div className="progreso__texto">
              <span>
                Paso {indiceProgreso + 1} de {PASOS_PROGRESO.length}
              </span>
              <span>{Math.round(((indiceProgreso + 1) / PASOS_PROGRESO.length) * 100)}%</span>
            </div>
            <div
              className="progreso__barra"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={PASOS_PROGRESO.length}
              aria-valuenow={indiceProgreso + 1}
            >
              <div
                className="progreso__relleno"
                style={{ width: `${((indiceProgreso + 1) / PASOS_PROGRESO.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="contenido" data-paso={paso}>
        {paso === 'inicio' && (
          <section className="bienvenida">
            <h1 ref={tituloRef} tabIndex={-1}>
              Antes de tu asesoría, queremos conocerte
            </h1>
            <p className="bienvenida__lead">
              Responde unas preguntas sencillas sobre tus hábitos, tu descanso y tus objetivos. Toma unos 5 minutos.
            </p>
            <ul className="bienvenida__puntos">
              <li>
                <span>1</span>Responde por secciones, a tu ritmo.
              </li>
              <li>
                <span>2</span>Revisa y corrige lo que necesites.
              </li>
              <li>
                <span>3</span>Envía tus respuestas por WhatsApp con un solo toque.
              </li>
            </ul>
            <div className="aviso aviso--suave">
              <IconoCandado />
              <p>
                No necesitas crear una cuenta. Tus respuestas no se guardan en internet: solo se envían cuando tú pulsas{' '}
                <strong>Enviar</strong> en WhatsApp. Los campos con <span className="marca-obligatoria">*</span> son
                obligatorios.
              </p>
            </div>
            <button type="button" className="boton boton--primario boton--ancho" onClick={() => irA('personales')}>
              Comenzar <IconoFlechaDer />
            </button>
          </section>
        )}

        {Seccion && (
          <section>
            <div className="encabezado-seccion">
              <h1 ref={tituloRef} tabIndex={-1}>
                {info.titulo}
              </h1>
              {DESCRIPCION[paso] && <p>{DESCRIPCION[paso]}</p>}
            </div>
            {Object.keys(errores).length > 0 && (
              <p className="resumen-errores" role="alert">
                Revisa {Object.keys(errores).length === 1 ? 'el campo marcado' : 'los campos marcados'} para continuar.
              </p>
            )}
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                continuar();
              }}
            >
              <Seccion r={r} set={set} errores={errores} />
              <div className="navegacion">
                <button type="button" className="boton boton--fantasma" onClick={anterior}>
                  <IconoFlechaIzq /> Anterior
                </button>
                <button type="submit" className="boton boton--primario">
                  {desdeRevision ? 'Guardar y revisar' : paso === 'privacidad' ? 'Revisar respuestas' : 'Continuar'}{' '}
                  <IconoFlechaDer />
                </button>
              </div>
            </form>
          </section>
        )}

        {paso === 'revision' && (
          <section>
            <div className="encabezado-seccion">
              <h1 ref={tituloRef} tabIndex={-1}>
                {info.titulo}
              </h1>
              <p>{DESCRIPCION.revision}</p>
            </div>
            <div className="resumen">
              {construirSecciones(r).map((s) => (
                <article className="resumen__seccion" key={s.titulo}>
                  <div className="resumen__cabecera">
                    <h2>{s.titulo.charAt(0) + s.titulo.slice(1).toLowerCase()}</h2>
                    <button
                      type="button"
                      className="boton-editar"
                      onClick={() => editar(PASO_DE_SECCION[s.titulo])}
                      aria-label={`Editar ${s.titulo.toLowerCase()}`}
                    >
                      <IconoLapiz /> Editar
                    </button>
                  </div>
                  <dl>
                    {s.lineas.map((l, i) => {
                      const pos = l.indexOf(':');
                      const conEtiqueta = pos > 0 && pos < 45 && !/^\d+\./.test(l);
                      return conEtiqueta ? (
                        <div className="resumen__fila" key={i}>
                          <dt>{l.slice(0, pos)}</dt>
                          <dd>{l.slice(pos + 1).trim() || '—'}</dd>
                        </div>
                      ) : (
                        <div className="resumen__fila resumen__fila--libre" key={i}>
                          <dd>{l}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              ))}
            </div>

            <button type="button" className="boton boton--whatsapp boton--ancho" onClick={enviarPorWhatsApp}>
              <IconoWhatsApp /> ENVIAR MIS RESPUESTAS POR WHATSAPP
            </button>
            <p className="nota nota--centro">
              Se abrirá WhatsApp con tus respuestas listas para enviar a {CONFIG.whatsappVisible}.
            </p>
            <div className="navegacion navegacion--sola">
              <button type="button" className="boton boton--fantasma" onClick={() => irA('privacidad')}>
                <IconoFlechaIzq /> Anterior
              </button>
            </div>
          </section>
        )}

        {paso === 'listo' && plan && (
          <section className="listo">
            <IconoListo />
            <h1 ref={tituloRef} tabIndex={-1}>
              Tu formulario está listo
            </h1>

            <div className="instruccion" role="status">
              <strong>¡Ya casi terminamos!</strong> Revisa el mensaje que se abrió en WhatsApp y pulsa{' '}
              <strong>Enviar</strong> para hacernos llegar tus respuestas.
            </div>

            {aviso && (
              <p className="resumen-errores" role="alert">
                {aviso}
              </p>
            )}

            {plan.enlaces.length === 1 ? (
              <a
                className="boton boton--whatsapp boton--ancho"
                href={plan.enlaces[0]}
                target="_blank"
                rel="noopener noreferrer"
                data-accion="abrir-whatsapp"
              >
                <IconoWhatsApp /> {partesAbiertas.includes(0) ? 'Abrir WhatsApp de nuevo' : 'Abrir WhatsApp'}
              </a>
            ) : (
              <div className="partes">
                <p>
                  Tus respuestas son extensas, así que las prepararemos en <strong>{plan.enlaces.length} mensajes</strong>{' '}
                  para que lleguen completas. Abre y envía cada uno en orden:
                </p>
                {plan.enlaces.map((url, i) => (
                  <a
                    key={i}
                    className={`boton boton--ancho ${partesAbiertas.includes(i) ? 'boton--secundario' : 'boton--whatsapp'}`}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-accion={`abrir-parte-${i + 1}`}
                    onClick={() => setPartesAbiertas((p) => (p.includes(i) ? p : [...p, i]))}
                  >
                    <IconoWhatsApp /> Mensaje {i + 1} de {plan.enlaces.length}
                    {partesAbiertas.includes(i) ? ' (abierto)' : ''}
                  </a>
                ))}
                <p className="nota">Recuerda pulsar «Enviar» en WhatsApp después de abrir cada mensaje.</p>
              </div>
            )}

            <ol className="pasos-finales">
              <li>Se abre WhatsApp con el chat del asesor y tu mensaje escrito.</li>
              <li>
                Pulsa <strong>Enviar</strong> (la flecha verde).
              </li>
              <li>Tus respuestas llegan solo cuando las envías desde WhatsApp.</li>
            </ol>

            <button type="button" className="boton boton--secundario boton--ancho" onClick={copiar} data-accion="copiar">
              <IconoCopiar /> Copiar mis respuestas
            </button>
            {copiado === 'ok' && (
              <p className="nota nota--exito" role="status">
                Respuestas copiadas. Puedes pegarlas en el chat de WhatsApp con {CONFIG.whatsappVisible}.
              </p>
            )}
            {copiado === 'error' && (
              <p className="nota" role="status">
                No se pudo copiar automáticamente. Mantén presionado el texto de abajo para seleccionarlo y copiarlo.
              </p>
            )}

            <details className="vista-mensaje" open={copiado === 'error' || !!aviso}>
              <summary>Ver el mensaje preparado</summary>
              <pre data-mensaje>{plan.completo}</pre>
            </details>

            <button type="button" className="boton boton--fantasma boton--ancho" onClick={() => irA('revision')}>
              <IconoLapiz /> Volver al formulario para corregir un dato
            </button>
            <button type="button" className="enlace-discreto" onClick={empezarDeNuevo}>
              Borrar mis respuestas y empezar de nuevo
            </button>
          </section>
        )}
      </main>

      <footer className="pie">
        <p>Este formulario no reemplaza una consulta médica.</p>
      </footer>
    </div>
  );
}

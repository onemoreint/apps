import { useId, type KeyboardEvent, type ReactNode } from 'react';

interface PreguntaProps {
  numero?: number;
  etiqueta: string;
  obligatoria?: boolean;
  ayuda?: ReactNode;
  error?: string;
  idControl?: string;
  idEtiqueta?: string;
  children: ReactNode;
  condicional?: boolean;
}

export function Pregunta({
  numero,
  etiqueta,
  obligatoria,
  ayuda,
  error,
  idControl,
  idEtiqueta,
  children,
  condicional,
}: PreguntaProps) {
  const Etiqueta = idControl ? 'label' : 'p';
  return (
    <div className={`pregunta${condicional ? ' pregunta--condicional' : ''}${error ? ' pregunta--error' : ''}`}>
      <Etiqueta className="pregunta__etiqueta" id={idEtiqueta} {...(idControl ? { htmlFor: idControl } : {})}>
        {numero !== undefined && <span className="pregunta__numero">{numero}</span>}
        <span>
          {etiqueta}
          {obligatoria ? (
            <span className="marca-obligatoria" aria-label="obligatoria">
              {' '}
              *
            </span>
          ) : (
            <span className="marca-opcional"> (opcional)</span>
          )}
        </span>
      </Etiqueta>
      {ayuda && <p className="pregunta__ayuda">{ayuda}</p>}
      {children}
      {error && (
        <p className="pregunta__mensaje-error" role="alert" data-error-de={idControl ?? idEtiqueta}>
          <IconoAlerta /> {error}
        </p>
      )}
    </div>
  );
}

interface OpcionesProps {
  numero?: number;
  etiqueta: string;
  opciones: readonly string[];
  valor: string;
  onCambio: (v: string) => void;
  obligatoria?: boolean;
  error?: string;
  ayuda?: ReactNode;
  nombre: string;
  condicional?: boolean;
}

/** Selección simple con tarjetas grandes (accesible como grupo de radio). */
export function Opciones({
  numero,
  etiqueta,
  opciones,
  valor,
  onCambio,
  obligatoria,
  error,
  ayuda,
  nombre,
  condicional,
}: OpcionesProps) {
  const idEtiqueta = useId();
  const indiceActivo = Math.max(0, opciones.indexOf(valor));

  const teclado = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    let siguiente = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') siguiente = (i + 1) % opciones.length;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') siguiente = (i - 1 + opciones.length) % opciones.length;
    if (siguiente >= 0) {
      e.preventDefault();
      onCambio(opciones[siguiente]);
      const grupo = e.currentTarget.parentElement;
      (grupo?.children[siguiente] as HTMLElement | undefined)?.focus();
    }
  };

  return (
    <Pregunta
      numero={numero}
      etiqueta={etiqueta}
      obligatoria={obligatoria}
      error={error}
      ayuda={ayuda}
      idEtiqueta={idEtiqueta}
      condicional={condicional}
    >
      <div className="opciones" role="radiogroup" aria-labelledby={idEtiqueta} data-campo={nombre}>
        {opciones.map((op, i) => {
          const activa = op === valor;
          return (
            <button
              key={op}
              type="button"
              role="radio"
              aria-checked={activa}
              tabIndex={i === indiceActivo ? 0 : -1}
              className={`opcion${activa ? ' opcion--activa' : ''}`}
              onClick={() => onCambio(op)}
              onKeyDown={(e) => teclado(e, i)}
            >
              <span className="opcion__marca" aria-hidden="true">
                {activa && <IconoCheck />}
              </span>
              <span className="opcion__texto">{op}</span>
            </button>
          );
        })}
      </div>
    </Pregunta>
  );
}

interface CampoProps {
  numero?: number;
  etiqueta: string;
  valor: string;
  onCambio: (v: string) => void;
  obligatoria?: boolean;
  error?: string;
  ayuda?: ReactNode;
  placeholder?: string;
  tipo?: 'texto' | 'entero' | 'decimal';
  sufijo?: string;
  nombre: string;
  maxLength?: number;
  autoComplete?: string;
  condicional?: boolean;
  multilinea?: boolean;
}

export function Campo({
  numero,
  etiqueta,
  valor,
  onCambio,
  obligatoria,
  error,
  ayuda,
  placeholder,
  tipo = 'texto',
  sufijo,
  nombre,
  maxLength,
  autoComplete = 'off',
  condicional,
  multilinea,
}: CampoProps) {
  const id = useId();
  const comun = {
    id,
    name: nombre,
    value: valor,
    placeholder,
    maxLength,
    'aria-invalid': error ? true : undefined,
    'aria-required': obligatoria ? true : undefined,
    'data-campo': nombre,
  } as const;

  return (
    <Pregunta
      numero={numero}
      etiqueta={etiqueta}
      obligatoria={obligatoria}
      error={error}
      ayuda={ayuda}
      idControl={id}
      condicional={condicional}
    >
      {multilinea ? (
        <div className="control">
          <textarea {...comun} rows={4} onChange={(e) => onCambio(e.target.value)} />
          {maxLength && valor.length > maxLength * 0.8 && (
            <span className="contador">
              {valor.length}/{maxLength}
            </span>
          )}
        </div>
      ) : (
        <div className={`control${sufijo ? ' control--sufijo' : ''}`}>
          <input
            {...comun}
            type="text"
            inputMode={tipo === 'entero' ? 'numeric' : tipo === 'decimal' ? 'decimal' : 'text'}
            autoComplete={autoComplete}
            onChange={(e) => {
              let v = e.target.value;
              if (tipo === 'entero') v = v.replace(/[^\d]/g, '');
              if (tipo === 'decimal') v = v.replace(/[^\d.,]/g, '');
              onCambio(v);
            }}
          />
          {sufijo && <span className="control__sufijo">{sufijo}</span>}
        </div>
      )}
    </Pregunta>
  );
}

interface CasillaProps {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  children: ReactNode;
  error?: string;
  nombre: string;
}

export function Casilla({ marcada, onCambio, children, error, nombre }: CasillaProps) {
  const id = useId();
  return (
    <div className={`casilla${error ? ' casilla--error' : ''}${marcada ? ' casilla--marcada' : ''}`}>
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        onChange={(e) => onCambio(e.target.checked)}
        data-campo={nombre}
        aria-invalid={error ? true : undefined}
      />
      <label htmlFor={id}>
        <span className="casilla__caja" aria-hidden="true">
          {marcada && <IconoCheck />}
        </span>
        <span className="casilla__texto">{children}</span>
      </label>
      {error && (
        <p className="pregunta__mensaje-error" role="alert" data-error-de={nombre}>
          <IconoAlerta /> {error}
        </p>
      )}
    </div>
  );
}

// ─────────────── Iconos (trazos discretos) ───────────────

const svg = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconoCheck = () => (
  <svg {...svg} aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
export const IconoAlerta = () => (
  <svg {...svg} width={16} height={16} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </svg>
);
export const IconoFlechaIzq = () => (
  <svg {...svg} aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
export const IconoFlechaDer = () => (
  <svg {...svg} aria-hidden="true">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
export const IconoMas = () => (
  <svg {...svg} aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconoPapelera = () => (
  <svg {...svg} width={18} height={18} aria-hidden="true">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
  </svg>
);
export const IconoLapiz = () => (
  <svg {...svg} width={16} height={16} aria-hidden="true">
    <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
  </svg>
);
export const IconoCopiar = () => (
  <svg {...svg} aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </svg>
);
export const IconoCandado = () => (
  <svg {...svg} aria-hidden="true">
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </svg>
);
export const IconoHoja = () => (
  <svg {...svg} width={28} height={28} aria-hidden="true">
    <path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15" />
    <path d="M5 19c3-4 6-7 10-9" />
  </svg>
);
export const IconoWhatsApp = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.3-1.95 1.35-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.82 0-1.34.7-2 .95-2.27.25-.27.54-.34.72-.34h.52c.17 0 .39-.06.61.47.24.57.79 1.94.86 2.08.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.29-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.27.14.43.11.59-.07.16-.18.68-.79.86-1.07.18-.27.36-.23.61-.14.25.09 1.59.75 1.86.89.27.14.45.2.52.32.07.11.07.66-.17 1.34z" />
  </svg>
);
export const IconoListo = () => (
  <svg width={64} height={64} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <circle cx="32" cy="32" r="30" fill="var(--verde-suave)" />
    <circle cx="32" cy="32" r="22" fill="var(--verde)" />
    <path d="M22 33l7 7 13-15" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

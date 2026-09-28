// Simulador de prospectos: escenarios guionizados + evaluación heurística de cada respuesta.
// La evaluación es ORIENTATIVA (basada en reglas); no reemplaza el criterio de un mentor.

import { checkCompliance, normalize } from '../compliance';

export interface SimTurn {
  line: string; // lo que dice el prospecto si la conversación va bien
  guardedLine?: string; // lo que dice si la respuesta anterior generó presión o poca escucha
  concern: string[]; // palabras clave de la preocupación del prospecto
  idealQuestion: string;
  expectsNextStep?: boolean;
}

export interface SimScenario {
  id: string;
  title: string;
  persona: string;
  context: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  turns: SimTurn[];
  goodEnding: string;
  badEnding: string;
}

export const SCENARIOS: SimScenario[] = [
  {
    id: 'sin_dinero',
    title: 'Me interesa, pero no tengo dinero',
    persona: 'Laura, 34 años, auxiliar contable',
    context: 'Vio tus publicaciones y te escribió preguntando por el negocio.',
    difficulty: 'Básico',
    turns: [
      {
        line: 'Me interesa, pero la verdad no tengo dinero para invertir ahora.',
        concern: ['dinero', 'invertir', 'inversion', 'plata', 'presupuesto'],
        idealQuestion: '¿Es un tema del momento, o es que todavía no ves claro si valdría la pena?',
      },
      {
        line: 'Es que este mes tuve varios gastos y no quiero meterme en algo que después no pueda sostener.',
        guardedLine: 'Mmm… no sé. Siento que me estás intentando convencer.',
        concern: ['gastos', 'sostener', 'mes', 'meterme'],
        idealQuestion: '¿Qué necesitarías sentir para que fuera una decisión tranquila para ti?',
      },
      {
        line: 'Tal vez más adelante. ¿Cómo sería el siguiente paso si decido conocerlo mejor?',
        guardedLine: 'Creo que mejor lo dejamos así por ahora.',
        concern: ['adelante', 'siguiente', 'conocerlo'],
        idealQuestion: '¿Te parece si te muestro cómo funciona sin compromiso y lo retomamos cuando sea buen momento?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Laura: "Me gusta que no me presiones. Escríbeme el próximo mes y lo vemos con calma."',
    badEnding: 'Laura: "Gracias, pero prefiero no seguir con esto."',
  },
  {
    id: 'sin_tiempo',
    title: 'No tengo tiempo',
    persona: 'Andrés, 41 años, gerente de tienda',
    context: 'Amigo de la universidad. Le contaste del negocio hace una semana.',
    difficulty: 'Básico',
    turns: [
      {
        line: 'Suena interesante, pero no tengo tiempo. Trabajo de 7 a 7 y los fines de semana estoy con mis hijos.',
        concern: ['tiempo', 'trabajo', 'hijos', 'fines de semana', 'horario'],
        idealQuestion: 'Te entiendo. Si el tiempo no fuera un problema, ¿sería algo que te interesaría?',
      },
      {
        line: 'Sí, me interesaría tener un ingreso extra… pero no veo de dónde sacar horas.',
        guardedLine: 'Ya te dije que no tengo tiempo, hermano.',
        concern: ['ingreso', 'extra', 'horas'],
        idealQuestion: '¿Cuántas horas a la semana, aunque sean pocas, podrías dedicarle de forma realista?',
      },
      {
        line: 'Quizá unas 3 o 4 horas a la semana. ¿Eso sirve de algo?',
        guardedLine: 'Mira, lo pienso y te aviso.',
        concern: ['horas', 'semana', 'sirve'],
        idealQuestion: '¿Te parece si vemos en 20 minutos cómo se vería un plan con esas horas?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Andrés: "Listo, el jueves en la noche tengo 20 minutos. Hablemos."',
    badEnding: 'Andrés: "Dejémoslo para otro momento."',
  },
  {
    id: 'piramide',
    title: '¿Esto no es una pirámide?',
    persona: 'Carolina, 29 años, ingeniera',
    context: 'Te la presentó un amigo en común. Es analítica y directa.',
    difficulty: 'Avanzado',
    turns: [
      {
        line: '¿Esto no es una pirámide? Tengo una tía que perdió plata en algo así.',
        concern: ['piramide', 'tia', 'perdio', 'plata', 'estafa'],
        idealQuestion: 'Es una duda muy válida. ¿Qué le pasó a tu tía, si me puedes contar?',
      },
      {
        line: 'Pagó una inscripción carísima y le dijeron que ganaría metiendo gente. Nunca vio nada.',
        guardedLine: 'Todos dicen eso. No me convence.',
        concern: ['inscripcion', 'metiendo gente', 'ganaria', 'nunca'],
        idealQuestion: '¿Qué tendrías que ver para distinguir un negocio legítimo de algo así?',
      },
      {
        line: 'Tendría que ver que se venden productos de verdad y que no todo depende de reclutar.',
        guardedLine: 'Prefiero no arriesgarme.',
        concern: ['productos', 'reclutar', 'verdad'],
        idealQuestion: '¿Te parece si te muestro cómo se generan los ingresos y lo evalúas tú misma?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Carolina: "Ok, muéstrame los números reales del plan y lo analizo."',
    badEnding: 'Carolina: "No, gracias. No me siento cómoda."',
  },
  {
    id: 'pensarlo',
    title: 'Lo voy a pensar',
    persona: 'Miguel, 52 años, comerciante',
    context: 'Vio la presentación ayer contigo por videollamada.',
    difficulty: 'Intermedio',
    turns: [
      {
        line: 'Me gustó la presentación, pero lo voy a pensar.',
        concern: ['pensar', 'pensarlo', 'presentacion', 'gusto'],
        idealQuestion: '¡Claro! ¿Qué fue lo que más te gustó y qué te genera dudas?',
      },
      {
        line: 'Lo que más me gustó es el producto. Lo que me frena es que no sé si sabría explicarlo.',
        guardedLine: 'Déjame pensarlo, ¿sí?',
        concern: ['producto', 'frena', 'explicarlo', 'sabria'],
        idealQuestion: '¿Qué parte sientes que te costaría explicar?',
      },
      {
        line: 'Todo lo del plan de compensación, la verdad. El producto sí lo entiendo.',
        guardedLine: 'Te aviso cualquier cosa.',
        concern: ['plan', 'compensacion', 'entiendo'],
        idealQuestion: '¿Te ayudaría empezar solo con el producto y que yo te acompañe en las presentaciones al comienzo?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Miguel: "Así sí me siento más tranquilo. ¿Cuándo empezamos?"',
    badEnding: 'Miguel: "Te aviso cuando lo decida."',
  },
  {
    id: 'producto_esceptica',
    title: '¿Eso de verdad funciona?',
    persona: 'Patricia, 45 años, docente',
    context: 'Te preguntó por el producto en Instagram.',
    difficulty: 'Intermedio',
    turns: [
      {
        line: '¿Eso de los parches de verdad funciona? He probado mil cosas y nada.',
        concern: ['funciona', 'probado', 'parches', 'nada'],
        idealQuestion: '¿Qué has probado antes y qué esperabas que pasara?',
      },
      {
        line: 'Suplementos, tés… Busco algo que me ayude a descansar mejor, ando muy cansada.',
        guardedLine: 'Todos dicen que su producto es el mejor.',
        concern: ['descansar', 'cansada', 'suplementos'],
        idealQuestion: '¿Cómo es tu rutina de descanso hoy? ¿Lo has hablado con tu médico?',
      },
      {
        line: 'Bueno, ¿y cuál me recomendarías y cómo lo pruebo?',
        guardedLine: 'Voy a seguir buscando, gracias.',
        concern: ['recomendarias', 'pruebo'],
        idealQuestion: '¿Te comparto la ficha oficial del producto y lo revisas con calma antes de decidir?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Patricia: "Me gusta que no me prometas milagros. Envíame la información."',
    badEnding: 'Patricia: "Mejor no, gracias."',
  },
  {
    id: 'consultar',
    title: 'Tengo que consultarlo con mi esposo',
    persona: 'Diana, 38 años, emprendedora',
    context: 'Mostró interés en el negocio tras una reunión en casa de una amiga.',
    difficulty: 'Básico',
    turns: [
      {
        line: 'Me encantó, pero tengo que consultarlo con mi esposo.',
        concern: ['esposo', 'consultar', 'consultarlo'],
        idealQuestion: '¡Me parece muy bien! ¿Qué crees que le va a preocupar a él?',
      },
      {
        line: 'Seguramente va a preguntar cuánto hay que invertir y cuánto tiempo me va a quitar.',
        guardedLine: 'No sé, él es muy desconfiado con estas cosas.',
        concern: ['invertir', 'tiempo', 'preguntar'],
        idealQuestion: '¿Te sería útil que les explique a los dos al mismo tiempo?',
      },
      {
        line: 'Podría ser… ¿cómo lo haríamos?',
        guardedLine: 'Mejor le cuento yo y te aviso.',
        concern: ['haríamos', 'como'],
        idealQuestion: '¿Qué día les queda bien para una llamada de 20 minutos con los dos?',
        expectsNextStep: true,
      },
    ],
    goodEnding: 'Diana: "¡Perfecto! El sábado en la mañana estamos los dos."',
    badEnding: 'Diana: "Le cuento y te digo."',
  },
];

export type DimensionKey = 'escucha' | 'empatia' | 'claridad' | 'preguntas' | 'presion' | 'comprension' | 'siguiente_paso';

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  escucha: 'Escucha',
  empatia: 'Empatía',
  claridad: 'Claridad',
  preguntas: 'Preguntas',
  presion: 'Sin presión comercial',
  comprension: 'Comprensión de la objeción',
  siguiente_paso: 'Siguiente paso',
};

export interface DimensionResult {
  key: DimensionKey;
  level: 0 | 1 | 2; // 0 = a trabajar, 1 = en desarrollo, 2 = fuerte
  note: string;
}

export interface TurnEvaluation {
  dimensions: DimensionResult[];
  good: string[];
  improve: string[];
  suggestedQuestion: string;
  quality: 'buena' | 'regular' | 'debil';
  complianceWarnings: string[];
}

const EMPATHY = ['entiendo', 'te entiendo', 'comprendo', 'tiene sentido', 'es normal', 'es valido', 'es muy valido', 'gracias por', 'me imagino', 'claro que', 'totalmente', 'respeto', 'que bien que', 'lamento'];
const PRESSURE = ['tienes que', 'debes ', 'no lo pienses', 'no lo pienses tanto', 'excusa', 'es ahora o nunca', 'hoy mismo', 'no seas', 'confia en mi', 'no pierdas', 'rapido', 'ya mismo', 'no hay nada que pensar', 'todos pueden', 'facilisimo', 'solo tienes que meter'];
const NEXT_STEP = ['te parece', 'podemos', 'podriamos', 'agend', 'te envio', 'te comparto', 'te llamo', 'hablamos', 'cuando', 'que dia', 'si quieres', 'te escribo', 'nos vemos', 'reunion', 'llamada', 'videollamada'];
const OPEN_Q = ['que ', 'como ', 'cual', 'por que', 'para que', 'cuentame', 'cuanto', 'quien', 'donde'];
const STOP = new Set(['porque', 'pero', 'para', 'esto', 'esta', 'este', 'tengo', 'tiene', 'verdad', 'mucho', 'cosas', 'algo', 'sobre', 'como', 'cuando', 'donde', 'entonces', 'ahora', 'quiero', 'estoy', 'estas', 'puede', 'hacer', 'vamos', 'bueno', 'seria', 'sabes', 'todos', 'todas', 'tanto', 'desde', 'hasta']);

function contentWords(s: string): string[] {
  return normalize(s)
    .replace(/[^a-zñ\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP.has(w));
}

export function evaluateResponse(turn: SimTurn, answer: string): TurnEvaluation {
  const n = normalize(answer);
  const words = answer.trim().split(/\s+/).filter(Boolean).length;
  const questionSegments = answer.split(/[.!\n]/).filter((s) => s.includes('?'));
  const hasQuestion = questionSegments.length > 0 || n.includes('¿');
  const openQuestion = questionSegments.some((q) => {
    const qn = normalize(q).replace(/^[\s¿]+/, '');
    return OPEN_Q.some((o) => qn.startsWith(o) || qn.includes(`¿${o}`) || qn.includes(` ${o}`));
  });
  const empathyHit = EMPATHY.find((e) => n.includes(e));
  const dismissive = /(entiendo|comprendo)[^.?!]{0,12}\bpero\b/.test(n);
  const compliance = checkCompliance(answer);
  const pressureHits = PRESSURE.filter((p) => n.includes(p));
  const pressure = pressureHits.length > 0 || compliance.some((c) => c.kind === 'presion') || (answer.match(/!/g)?.length ?? 0) >= 4;
  const concernHits = turn.concern.filter((k) => n.includes(normalize(k)));
  const prospectWords = contentWords(turn.line);
  const overlap = new Set(contentWords(answer).filter((w) => prospectWords.includes(w)));
  const nextStep = NEXT_STEP.some((k) => n.includes(k));

  const dims: DimensionResult[] = [];

  // Escucha
  const listenScore = concernHits.length + overlap.size;
  dims.push(
    listenScore >= 2
      ? { key: 'escucha', level: 2, note: 'Retomaste lo que dijo la persona con sus propias palabras.' }
      : listenScore === 1
        ? { key: 'escucha', level: 1, note: 'Hiciste referencia a lo que dijo, pero podrías reflejarlo con más claridad.' }
        : { key: 'escucha', level: 0, note: 'Tu respuesta no retoma lo que dijo la persona. Parece un mensaje preparado.' },
  );

  // Empatía
  dims.push(
    empathyHit && !dismissive
      ? { key: 'empatia', level: 2, note: 'Validaste su punto de vista antes de responder.' }
      : dismissive
        ? { key: 'empatia', level: 1, note: '"Entiendo, pero…" anula la validación. Prueba "entiendo, y…" o haz una pregunta después de validar.' }
        : { key: 'empatia', level: 0, note: 'No hubo una validación explícita de cómo se siente o de su situación.' },
  );

  // Claridad
  dims.push(
    words >= 6 && words <= 70
      ? { key: 'claridad', level: 2, note: 'Mensaje breve y fácil de leer.' }
      : words > 70 && words <= 120
        ? { key: 'claridad', level: 1, note: 'Es un poco largo. En chat, menos de 70 palabras suele funcionar mejor.' }
        : words > 120
          ? { key: 'claridad', level: 0, note: 'Demasiado largo: la persona probablemente no lo leerá completo.' }
          : { key: 'claridad', level: 0, note: 'Demasiado corto: puede sonar frío o cortante.' },
  );

  // Preguntas
  dims.push(
    openQuestion
      ? { key: 'preguntas', level: 2, note: 'Hiciste una pregunta abierta que invita a la persona a contar más.' }
      : hasQuestion
        ? { key: 'preguntas', level: 1, note: 'Hiciste una pregunta, pero es cerrada (sí/no). Las preguntas abiertas revelan más.' }
        : { key: 'preguntas', level: 0, note: 'No hiciste ninguna pregunta. Sin preguntas, solo estás hablando tú.' },
  );

  // Presión
  const complianceWarnings = compliance.filter((c) => c.kind !== 'presion').map((c) => c.message);
  dims.push(
    pressure || complianceWarnings.length
      ? {
          key: 'presion',
          level: 0,
          note: `Se detectó presión o una promesa problemática${pressureHits.length ? ` ("${pressureHits[0].trim()}")` : ''}. La presión cierra conversaciones.`,
        }
      : { key: 'presion', level: 2, note: 'Sin presión comercial: la persona se siente libre de decidir.' },
  );

  // Comprensión de la objeción
  dims.push(
    concernHits.length && hasQuestion
      ? { key: 'comprension', level: 2, note: 'Exploraste la objeción con una pregunta en lugar de rebatirla.' }
      : concernHits.length || hasQuestion
        ? { key: 'comprension', level: 1, note: 'Tocaste el tema, pero no terminaste de explorar qué hay detrás de la objeción.' }
        : { key: 'comprension', level: 0, note: 'Respondiste sin entender primero la objeción.' },
  );

  // Siguiente paso
  dims.push(
    nextStep
      ? { key: 'siguiente_paso', level: 2, note: 'Propusiste un siguiente paso concreto.' }
      : turn.expectsNextStep
        ? { key: 'siguiente_paso', level: 0, note: 'Era el momento de proponer un siguiente paso concreto (fecha, llamada o información).' }
        : { key: 'siguiente_paso', level: 1, note: 'Aún no era necesario cerrar: primero entender. Está bien.' },
  );

  const good = dims.filter((d) => d.level === 2).map((d) => d.note);
  const improve = dims.filter((d) => d.level === 0).map((d) => d.note);
  if (complianceWarnings.length) improve.unshift(...complianceWarnings.map((w) => `Cumplimiento: ${w}`));
  const total = dims.reduce((a, d) => a + d.level, 0);
  const quality: TurnEvaluation['quality'] = pressure || complianceWarnings.length ? 'debil' : total >= 10 ? 'buena' : total >= 7 ? 'regular' : 'debil';

  return { dimensions: dims, good, improve, suggestedQuestion: turn.idealQuestion, quality, complianceWarnings };
}

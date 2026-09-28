// Laboratorio de objeciones: detección por palabras clave + respuestas guiadas.
// Muestra varias interpretaciones sin asumir cuál es la verdadera.

import type { ObjectionKey } from '../models';
import { normalize } from '../compliance';

export interface ObjectionTemplate {
  key: ObjectionKey;
  label: string;
  keywords: string[];
  interpretations: string[];
  question: string;
  response: string;
  nextStep: string;
  avoid: string;
}

export const OBJECTION_LIBRARY: ObjectionTemplate[] = [
  {
    key: 'tiempo',
    label: 'Tiempo',
    keywords: ['tiempo', 'ocupad', 'no me da', 'agenda', 'no alcanzo', 'trabajo mucho', 'full', 'no tengo espacio', 'horas'],
    interpretations: [
      'Realmente tiene una agenda muy cargada y no ve cómo encajar algo más.',
      'No ve todavía el valor suficiente como para priorizarlo.',
      'Asocia el negocio con mucho trabajo o con tener que vender todo el día.',
      'Es una forma amable de decir que no le interesa.',
    ],
    question: 'Te entiendo. ¿Cómo es tu semana normalmente? Y si el tiempo no fuera un problema, ¿sería algo que te interesaría?',
    response:
      'Tiene todo el sentido; tu tiempo es valioso. No se trata de sumarte otra carga: muchas personas empiezan con pocas horas a la semana y a su ritmo. Si en algún momento quieres ver si se adapta a tu agenda, lo revisamos juntos.',
    nextStep: 'Comprender si la barrera es realmente el tiempo o si existe otra preocupación.',
    avoid: 'Decir "todos tenemos 24 horas" o hacerle sentir que no se organiza bien.',
  },
  {
    key: 'dinero',
    label: 'Dinero',
    keywords: ['dinero', 'plata', 'no tengo con', 'no me alcanza', 'presupuesto', 'estoy corto', 'estoy corta', 'sin plata', 'pagar', 'invertir', 'inversion', 'deuda', 'lucas', 'pesos'],
    interpretations: [
      'Su presupuesto actual realmente no le permite hacer la inversión.',
      'No ve aún el retorno o el valor que justifique el gasto.',
      'Tiene miedo de perder el dinero por una experiencia previa.',
      'Tiene otras prioridades financieras en este momento.',
    ],
    question: 'Gracias por decírmelo. ¿Es un tema del momento, o es que todavía no ves claro si valdría la pena?',
    response:
      'Te entiendo, y lo primero es tu tranquilidad financiera. No te recomendaría hacer algo que no se ajuste a tu presupuesto. Si más adelante cambia tu situación o quieres revisar opciones, aquí estoy.',
    nextStep: 'Distinguir entre falta real de presupuesto y falta de convicción sobre el valor.',
    avoid: 'Sugerir préstamos o tarjetas de crédito, o decir "si no inviertes no creces".',
  },
  {
    key: 'precio',
    label: 'Precio',
    keywords: ['caro', 'costoso', 'muy alto', 'precio', 'vale mucho', 'cuesta mucho', 'mas barato', 'descuento'],
    interpretations: [
      'Lo compara con otro producto más económico.',
      'No tiene claro qué incluye o para qué le serviría.',
      'Su presupuesto es limitado para este tipo de compra.',
    ],
    question: '¿Con qué lo estás comparando? Así te explico mejor las diferencias.',
    response:
      'Entiendo que el precio es importante. Si quieres, te explico qué incluye y vemos si hay una opción que se ajuste mejor a lo que buscas. Y si no es para ti ahora, no pasa nada.',
    nextStep: 'Entender contra qué compara el precio y si el producto responde a lo que busca.',
    avoid: 'Bajar el precio de inmediato o desacreditar otros productos.',
  },
  {
    key: 'pensarlo',
    label: 'Quiere pensarlo',
    keywords: ['pensar', 'pensarlo', 'lo pienso', 'lo voy a pensar', 'dejame ver', 'despues te digo', 'luego te aviso', 'analizar', 'con calma'],
    interpretations: [
      'Necesita tiempo real para procesar la información.',
      'Tiene una duda concreta que no ha expresado.',
      'Quiere consultarlo con alguien pero no lo dijo.',
      'No le interesa y prefiere no decirlo directamente.',
    ],
    question: '¡Claro, piénsalo con calma! Para ayudarte a pensar, ¿qué parte te genera más dudas?',
    response:
      'Me parece muy bien que te tomes tu tiempo. Si te parece, te escribo el jueves para resolver cualquier pregunta que te haya surgido.',
    nextStep: 'Identificar la duda concreta y acordar una fecha para retomar.',
    avoid: '"¿Qué hay que pensar?" o fijar plazos artificiales.',
  },
  {
    key: 'consultar',
    label: 'Quiere consultarlo',
    keywords: ['esposa', 'esposo', 'pareja', 'mi marido', 'mi mujer', 'familia', 'consultar', 'consultarlo', 'preguntarle', 'mis papas', 'mi socio'],
    interpretations: [
      'Toma las decisiones en pareja o en familia y es una señal de seriedad.',
      'Espera que otra persona le ayude a resolver una duda.',
      'Usa la consulta como una forma de ganar tiempo.',
    ],
    question: '¡Me parece muy bien! ¿Qué crees que le va a preguntar o preocupar?',
    response:
      'Lo ideal es que lo decidan juntos. Si les sirve, puedo compartirles un resumen o hacer una llamada corta con los dos para resolver sus dudas.',
    nextStep: 'Facilitar la conversación con la otra persona y acordar cuándo retomar.',
    avoid: 'Intentar que decida sin consultarlo.',
  },
  {
    key: 'desconfianza',
    label: 'Desconfianza del modelo',
    keywords: ['piramide', 'estafa', 'multinivel', 'no creo', 'eso no funciona', 'desconfio', 'es mentira', 'esquema', 'network', 'redes de mercadeo', 'marketing multinivel', 'mlm'],
    interpretations: [
      'Ha escuchado experiencias negativas sobre este tipo de negocios.',
      'Confunde el modelo de venta directa con esquemas ilegales.',
      'Tuvo una mala experiencia personal o de alguien cercano.',
      'Tiene una duda legítima sobre cómo se generan los ingresos.',
    ],
    question: 'Es una pregunta muy válida. ¿Qué has escuchado o qué te hace pensar eso?',
    response:
      'Entiendo la duda y me parece sana. La diferencia clave es que aquí los ingresos vienen de la venta de productos reales a clientes, no de reclutar personas. Con gusto te muestro cómo funciona y tú evalúas.',
    nextStep: 'Entender de dónde viene la desconfianza y dar información verificable.',
    avoid: 'Ponerte a la defensiva o descalificar a quien le contó algo negativo.',
  },
  {
    key: 'no_vendedor',
    label: '"No sé vender"',
    keywords: ['no se vender', 'no soy vendedor', 'no soy vendedora', 'no me gusta vender', 'vender no es lo mio', 'me da pena', 'verguenza'],
    interpretations: [
      'Asocia el negocio con insistir o presionar a la gente.',
      'Le preocupa incomodar a sus amigos y familia.',
      'Le falta confianza en sus habilidades de comunicación.',
    ],
    question: '¿Qué imaginas cuando piensas en "vender"?',
    response:
      'Te entiendo; a mí tampoco me gusta presionar a nadie. Este trabajo se parece más a recomendar lo que usas y enseñar a otros. Hay formación y acompañamiento para aprender a hacerlo a tu manera.',
    nextStep: 'Descubrir qué imagen tiene de "vender" y si le interesa aprender otro enfoque.',
    avoid: 'Decir "cualquiera puede hacerlo" o minimizar su preocupación.',
  },
  {
    key: 'mala_experiencia',
    label: 'Mala experiencia previa',
    keywords: ['ya estuve', 'ya lo intente', 'ya intente', 'me fue mal', 'perdi', 'no me funciono', 'ya probe', 'otra empresa', 'antes estuve'],
    interpretations: [
      'Invirtió dinero o tiempo y no obtuvo los resultados que esperaba.',
      'No recibió acompañamiento de su patrocinador.',
      'Tuvo expectativas poco realistas desde el inicio.',
    ],
    question: 'Lamento que te haya ido así. ¿Qué pasó? Me interesa entender qué no funcionó.',
    response:
      'Gracias por contármelo; esa experiencia es importante. No puedo prometerte resultados, pero sí puedo contarte cómo trabajamos el acompañamiento y tú decides si es diferente a lo que viviste.',
    nextStep: 'Entender qué salió mal antes para ver si es diferente ahora.',
    avoid: 'Criticar a la otra empresa o prometer que "aquí sí funciona".',
  },
  {
    key: 'escepticismo_producto',
    label: 'Duda del producto',
    keywords: ['funciona', 'sirve', 'de verdad', 'efecto', 'resultados del producto', 'parche', 'no creo que', 'comprobado', 'estudios'],
    interpretations: [
      'Ha probado productos similares sin notar diferencia.',
      'Quiere información objetiva antes de probar.',
      'Desconfía por las promesas exageradas que ha visto en redes.',
    ],
    question: '¿Qué te gustaría saber del producto para sentirte tranquilo/a?',
    response:
      'Es muy válido preguntar. Te comparto la información oficial del producto y la experiencia de quienes lo usan, sin prometerte resultados, porque cada persona es diferente. Si tienes alguna condición de salud, lo ideal es consultarlo con tu médico.',
    nextStep: 'Entregar información verificable y dejar que decida con calma.',
    avoid: 'Afirmaciones médicas o testimonios exagerados.',
  },
  {
    key: 'sin_contactos',
    label: '"No conozco a nadie"',
    keywords: ['no conozco', 'no tengo contactos', 'no tengo a quien', 'no tengo amigos', 'pocos contactos', 'no tengo red'],
    interpretations: [
      'Piensa que el negocio depende solo de su círculo cercano.',
      'Le preocupa incomodar a las pocas personas que conoce.',
      'No sabe cómo generar nuevos contactos.',
    ],
    question: '¿Cómo te imaginas que se consiguen los clientes en este negocio?',
    response:
      'Es una preocupación muy común. Hay formas de conocer personas nuevas de manera natural, incluso en redes sociales, y te enseñamos paso a paso. No se trata de insistirle a tu familia.',
    nextStep: 'Mostrar que existen formas de construir una red sin depender del círculo cercano.',
    avoid: 'Decirle "todos conocemos a 100 personas" sin enseñarle cómo.',
  },
];

export interface ObjectionAnalysis {
  input: string;
  detected: ObjectionTemplate | null;
  secondary: ObjectionTemplate[];
  matches: string[];
  confidence: 'clara' | 'posible' | 'no_identificada';
}

export function analyzeObjection(text: string): ObjectionAnalysis {
  const n = normalize(text);
  const scored = OBJECTION_LIBRARY.map((o) => {
    const hits = o.keywords.filter((k) => n.includes(normalize(k)));
    return { o, hits, score: hits.reduce((a, k) => a + (k.includes(' ') ? 2 : 1), 0) };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { input: text, detected: null, secondary: [], matches: [], confidence: 'no_identificada' };
  return {
    input: text,
    detected: scored[0].o,
    secondary: scored.slice(1, 3).map((x) => x.o),
    matches: scored[0].hits,
    confidence: scored[0].score >= 2 ? 'clara' : 'posible',
  };
}

export const GENERIC_OBJECTION = {
  interpretations: [
    'Puede ser una duda que aún no ha sabido expresar.',
    'Puede ser un tema de momento, tiempo o prioridades.',
    'Puede que simplemente no le interese, y eso también es válido.',
  ],
  question: 'Gracias por decírmelo. ¿Me cuentas un poco más sobre lo que te hace dudar?',
  response: 'Entiendo. Me interesa que tomes la decisión que sea mejor para ti. ¿Qué te ayudaría a verlo con más claridad?',
  nextStep: 'Hacer una pregunta abierta para descubrir la objeción real antes de responder.',
};

export const EXAMPLE_OBJECTIONS = [
  'No tengo tiempo',
  'Eso es una pirámide',
  'No tengo dinero ahora',
  'Lo voy a pensar',
  'Tengo que consultarlo con mi esposa',
  'No sé vender',
];

// Biblioteca del generador de conversaciones (motor offline).
// Principios: conversación real, sin presión, sin promesas de ingresos, sin afirmaciones médicas.

import type { SituationKey } from '../models';

export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'llamada';
export type Style = 'natural' | 'profesional' | 'cercano' | 'directo';

export const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'llamada', label: 'Llamada' },
];

export const STYLES: { key: Style; label: string; hint: string }[] = [
  { key: 'natural', label: 'Natural', hint: 'Como hablarías con un conocido' },
  { key: 'profesional', label: 'Profesional', hint: 'Cordial y estructurado' },
  { key: 'cercano', label: 'Cercano', hint: 'Cálido, de confianza' },
  { key: 'directo', label: 'Directo', hint: 'Breve y al punto, sin presionar' },
];

interface StyledText {
  body: string;
  ask: string;
}

export interface SituationTemplate {
  key: SituationKey;
  label: string;
  group: 'Inicio' | 'Seguimiento' | 'Objeción' | 'Interés';
  goal: string; // qué buscas lograr
  tip: string; // por qué funciona
  avoid: string; // qué evitar
  styles: Record<Style, StyledText>;
  altAsks: string[];
  call: { open: string; questions: string[]; close: string };
}

export const SITUATIONS: SituationTemplate[] = [
  {
    key: 'primer_contacto',
    label: 'Primer contacto',
    group: 'Inicio',
    goal: 'Abrir una conversación genuina, no presentar el negocio.',
    tip: 'El primer mensaje es sobre la persona. Si hay una razón real para escribir (algo que publicó, un recuerdo en común), úsala.',
    avoid: 'Enviar enlaces, audios largos o hablar de oportunidades en el primer mensaje.',
    styles: {
      natural: { body: 'Hace rato no hablábamos y me acordé de ti. ¿Cómo va todo por allá?', ask: '¿Qué ha sido de tu vida últimamente?' },
      profesional: { body: 'Espero que estés muy bien. Te escribo porque estoy retomando contacto con personas que aprecio y tú estás en esa lista.', ask: '¿Cómo te ha ido este año?' },
      cercano: { body: '¡Qué alegría saludarte! Vi algo que me hizo pensar en ti y quise escribirte.', ask: '¿Cómo están tú y tu familia?' },
      directo: { body: 'Te escribo para saludarte y saber cómo estás.', ask: '¿Cómo va todo?' },
    },
    altAsks: ['¿En qué andas ahora?', '¿Sigues en lo mismo o cambiaste de rumbo?', '¿Qué es lo que más te está ocupando estos días?'],
    call: {
      open: 'Saluda por su nombre y explica que llamas para saber de él/ella, sin agenda comercial.',
      questions: ['¿Cómo te ha ido últimamente?', '¿En qué estás trabajando ahora?', '¿Qué planes tienes para los próximos meses?'],
      close: 'Agradece la conversación. Si surge un tema donde puedas aportar, propón seguir hablando otro día.',
    },
  },
  {
    key: 'seguimiento',
    label: 'Seguimiento',
    group: 'Seguimiento',
    goal: 'Retomar donde quedaron y acordar un siguiente paso claro.',
    tip: 'Menciona algo específico de la última conversación: demuestra que escuchaste.',
    avoid: 'Frases como "¿ya lo pensaste?" o "¿qué decidiste?" sin contexto.',
    styles: {
      natural: { body: 'Me quedé pensando en lo que hablamos la otra vez.', ask: '¿Pudiste darle una vuelta? Me gustaría saber qué te pareció.' },
      profesional: { body: 'Te escribo para dar continuidad a nuestra última conversación.', ask: '¿Te queda alguna pregunta pendiente que pueda resolverte?' },
      cercano: { body: 'Estaba recordando nuestra charla y quise saber cómo sigues con eso.', ask: '¿Qué tal te fue?' },
      directo: { body: 'Retomo lo que hablamos.', ask: '¿Qué te pareció y cómo quieres seguir?' },
    },
    altAsks: ['¿Qué parte te quedó dando vueltas?', '¿Te sirve que lo conversemos 10 minutos esta semana?', '¿Hay algo que te gustaría ver con más calma?'],
    call: {
      open: 'Recuerda en una frase lo que hablaron la última vez.',
      questions: ['¿Qué te quedó sonando de lo que conversamos?', '¿Surgió alguna duda?', '¿Qué necesitarías para tomar una decisión tranquila?'],
      close: 'Acuerda un siguiente paso concreto (fecha, material o llamada) y confírmalo antes de colgar.',
    },
  },
  {
    key: 'recuperar',
    label: 'Recuperar prospecto',
    group: 'Seguimiento',
    goal: 'Reconectar la relación sin retomar la venta de inmediato.',
    tip: 'Reconoce el tiempo que pasó con naturalidad. La conversación sobre el tema anterior puede venir después.',
    avoid: 'Reclamar el silencio o arrancar con "¿sigues interesado?".',
    styles: {
      natural: { body: 'Hace tiempo no hablamos y quise saludarte.', ask: '¿Cómo te ha ido estas semanas?' },
      profesional: { body: 'Ha pasado un tiempo desde nuestra última conversación y quise saber cómo estás.', ask: '¿Cómo van tus proyectos?' },
      cercano: { body: '¡Te perdí la pista! Me acordé de ti y quise escribirte.', ask: '¿Cómo va todo por allá?' },
      directo: { body: 'Hace un tiempo no hablamos.', ask: '¿Cómo estás?' },
    },
    altAsks: ['¿Qué cambió desde la última vez que hablamos?', '¿Sigues con los planes que me contaste?', '¿En qué andas ahora?'],
    call: {
      open: 'Saluda con naturalidad y reconoce que pasó tiempo, sin reclamos.',
      questions: ['¿Cómo te ha ido?', '¿Qué ha cambiado desde la última vez?', '¿Sigue siendo prioridad para ti lo que hablamos?'],
      close: 'Si no es el momento, respétalo y pregunta si puedes escribirle más adelante.',
    },
  },
  {
    key: 'pregunto_precio',
    label: 'Preguntó precio',
    group: 'Interés',
    goal: 'Responder con claridad y entender qué necesita antes de recomendar.',
    tip: 'Responde la pregunta que hizo. Evadir el precio genera desconfianza; después pregunta para qué lo quiere.',
    avoid: 'Responder con otra pregunta sin dar el precio, o enviar el catálogo completo.',
    styles: {
      natural: { body: '¡Claro! Te cuento: depende del producto; en {empresa} hay opciones desde distintos precios y te paso el detalle exacto del que te interese.', ask: 'Para recomendarte bien, ¿qué es lo que estás buscando?' },
      profesional: { body: 'Con gusto. Los precios varían según el producto y si compras como cliente o como distribuidor. Te comparto la información exacta.', ask: '¿Para qué necesidad lo estás considerando, así te oriento al más adecuado?' },
      cercano: { body: '¡Qué bueno que preguntes! Te paso los precios sin problema.', ask: 'Cuéntame un poquito qué buscas y te digo cuál te conviene más.' },
      directo: { body: 'Te paso los precios.', ask: '¿Qué producto te interesa o para qué lo quieres?' },
    },
    altAsks: ['¿Es para ti o para alguien más?', '¿Lo quieres probar primero o ya conoces el producto?', '¿Prefieres que te explique en una llamada corta?'],
    call: {
      open: 'Agradece la pregunta y da el precio de forma clara.',
      questions: ['¿Qué te llamó la atención del producto?', '¿Es para ti o para alguien más?', '¿Has usado algo similar antes?'],
      close: 'Recomienda una opción según lo que escuchaste y pregunta si quiere avanzar o prefiere pensarlo.',
    },
  },
  {
    key: 'pregunto_negocio',
    label: 'Preguntó por el negocio',
    group: 'Interés',
    goal: 'Entender qué busca antes de explicar el negocio, y proponer una conversación.',
    tip: 'Pregunta qué le llamó la atención: su respuesta te dice qué parte del negocio explicar.',
    avoid: 'Hablar de ingresos como algo seguro o enviar un video largo sin contexto.',
    styles: {
      natural: { body: 'Me alegra que preguntes. Con gusto te cuento cómo funciona, sin compromiso.', ask: '¿Qué te llamó la atención o qué estás buscando ahora mismo?' },
      profesional: { body: 'Gracias por tu interés. Te puedo explicar el modelo con transparencia, incluyendo lo que requiere de tiempo y dedicación.', ask: '¿Te parece si agendamos 20 minutos esta semana?' },
      cercano: { body: '¡Qué bien que te interese! Te cuento todo con calma.', ask: 'Antes, cuéntame: ¿qué te gustaría lograr?' },
      directo: { body: 'Te explico cómo funciona.', ask: '¿Tienes 15 minutos mañana o el jueves?' },
    },
    altAsks: ['¿Buscas un ingreso extra o algo más a largo plazo?', '¿Cuánto tiempo a la semana podrías dedicarle?', '¿Has tenido alguna experiencia con negocios así?'],
    call: {
      open: 'Agradece su interés y aclara que la idea es que entienda el modelo, no convencerlo.',
      questions: ['¿Qué te llamó la atención?', '¿Qué te gustaría lograr en los próximos meses?', '¿Cuánto tiempo real podrías dedicarle?'],
      close: 'Propón una presentación con fecha y hora concretas. Aclara que los resultados dependen del trabajo de cada persona.',
    },
  },
  {
    key: 'vio_presentacion',
    label: 'Vio presentación',
    group: 'Seguimiento',
    goal: 'Conocer su opinión y resolver dudas antes de hablar de decisiones.',
    tip: 'Pregunta qué le gustó más: su respuesta revela su motivación real.',
    avoid: 'Preguntar directamente "¿entonces entras?".',
    styles: {
      natural: { body: 'Gracias por darte el tiempo de ver la presentación.', ask: '¿Qué fue lo que más te llamó la atención?' },
      profesional: { body: 'Gracias por tu tiempo en la presentación. Me interesa conocer tu opinión con honestidad.', ask: '¿Qué te pareció y qué preguntas te quedaron?' },
      cercano: { body: '¡Gracias por verla! Me encantaría saber qué sentiste.', ask: '¿Qué fue lo que más te gustó?' },
      directo: { body: 'Quería saber tu opinión sobre la presentación.', ask: '¿Qué te pareció?' },
    },
    altAsks: ['¿Qué parte te generó más dudas?', 'Del 1 al 10, ¿qué tan interesante te pareció? ¿Qué le faltó para ser 10?', '¿Qué necesitarías aclarar para decidir con tranquilidad?'],
    call: {
      open: 'Agradece su tiempo y pide su opinión honesta.',
      questions: ['¿Qué te gustó más?', '¿Qué te generó dudas?', '¿Te ves haciendo esto? ¿Por qué sí o por qué no?'],
      close: 'Según su respuesta: resolver dudas, presentarle a alguien del equipo o respetar un "no por ahora".',
    },
  },
  {
    key: 'no_responde',
    label: 'No responde',
    group: 'Seguimiento',
    goal: 'Facilitar una respuesta sin insistir, o cerrar el ciclo con elegancia.',
    tip: 'Un mensaje que ofrece una salida ("si no es el momento, no pasa nada") suele recibir más respuestas que otro recordatorio.',
    avoid: 'Enviar el mismo mensaje otra vez, reclamar o usar "¿me estás ignorando?".',
    styles: {
      natural: { body: 'Te escribo cortico: sé que andas con muchas cosas.', ask: 'Si ahora no es el momento, no hay problema. ¿Prefieres que te escriba más adelante?' },
      profesional: { body: 'Entiendo que puede no ser el mejor momento para retomar este tema.', ask: '¿Prefieres que lo dejemos para más adelante o que te comparta la información por escrito?' },
      cercano: { body: '¡Hola! No quiero ser intenso/a con los mensajes 😊', ask: 'Solo dime si te sigue interesando o si lo dejamos para otro momento, ¿vale?' },
      directo: { body: 'Te escribo por última vez sobre esto para no incomodarte.', ask: '¿Lo dejamos para más adelante?' },
    },
    altAsks: ['¿Te sirve más una nota de voz corta o un mensaje escrito?', 'Con un "sí" o un "no por ahora" me basta 🙂'],
    call: {
      open: 'Si decides llamar, sé breve y reconoce que quizá no es buen momento.',
      questions: ['¿Es buen momento para hablar 2 minutos?', '¿Sigue siendo algo que te interesa o lo dejamos?'],
      close: 'Respeta la respuesta y registra la decisión en el contacto.',
    },
  },
  {
    key: 'quiere_pensarlo',
    label: 'Quiere pensarlo',
    group: 'Objeción',
    goal: 'Entender qué necesita pensar y darle el espacio con una fecha acordada.',
    tip: '"Lo voy a pensar" casi siempre esconde una duda concreta. Pregunta por ella con curiosidad, no con presión.',
    avoid: 'Frases como "¿qué hay que pensar?" o fijar plazos artificiales.',
    styles: {
      natural: { body: 'Me parece perfecto que lo pienses, es una decisión importante.', ask: '¿Hay algo en particular que te gustaría tener más claro?' },
      profesional: { body: 'Es completamente razonable tomarse un tiempo para decidir.', ask: 'Para ayudarte a evaluar, ¿qué aspecto te genera más dudas?' },
      cercano: { body: '¡Claro que sí, piénsalo con calma!', ask: 'Si quieres, cuéntame qué es lo que más te hace dudar y lo vemos juntos.' },
      directo: { body: 'Está bien, piénsalo.', ask: '¿Qué te falta saber para decidir? ¿Hablamos el viernes?' },
    },
    altAsks: ['¿Te parece si te escribo el jueves para ver cómo vas?', '¿Es más por el tiempo, el dinero o por el modelo en sí?'],
    call: {
      open: 'Valida su necesidad de pensarlo.',
      questions: ['¿Qué parte te gustaría pensar con más calma?', '¿Hay algo que no te quedó claro?', '¿Con quién más te gustaría consultarlo?'],
      close: 'Acuerda una fecha para retomar y regístrala como próxima acción.',
    },
  },
  {
    key: 'sin_tiempo',
    label: 'No tiene tiempo',
    group: 'Objeción',
    goal: 'Comprender si la barrera es realmente el tiempo o hay otra preocupación.',
    tip: 'Pregunta cómo es su semana. A veces "no tengo tiempo" significa "no veo cómo encajarlo" o "no me convence".',
    avoid: 'Decir "todos tenemos 24 horas" o minimizar su rutina.',
    styles: {
      natural: { body: 'Te entiendo, con todo lo que haces es normal sentir que no hay espacio.', ask: '¿Cómo es tu semana normalmente?' },
      profesional: { body: 'Comprendo perfectamente; el tiempo es uno de los factores más importantes a considerar.', ask: 'Si encontráramos una forma que se adapte a tu agenda, ¿sería algo que te interesaría evaluar?' },
      cercano: { body: '¡Uf, te entiendo! Yo también sentía eso al comienzo.', ask: 'Cuéntame, ¿qué es lo que más te ocupa ahora?' },
      directo: { body: 'Entiendo.', ask: '¿Es el tiempo lo único que te frena o hay algo más?' },
    },
    altAsks: ['¿Cuántas horas reales a la semana podrías dedicarle, aunque sean pocas?', '¿Es tiempo o es que aún no ves claro si vale la pena?'],
    call: {
      open: 'Valida que su tiempo es valioso.',
      questions: ['¿Cómo es un día normal para ti?', 'Si tuvieras más tiempo, ¿te interesaría?', '¿Hay algo más además del tiempo?'],
      close: 'Si el tiempo es la barrera real, respétala y propón retomar cuando cambie su situación.',
    },
  },
  {
    key: 'sin_dinero',
    label: 'No tiene dinero',
    group: 'Objeción',
    goal: 'Entender su situación sin presionar una inversión.',
    tip: 'No intentes convencer a alguien de gastar lo que no tiene. Entiende si es un tema de presupuesto, de prioridad o de confianza.',
    avoid: 'Sugerir préstamos, tarjetas de crédito o "si no inviertes no creces".',
    styles: {
      natural: { body: 'Gracias por decírmelo con sinceridad, lo entiendo totalmente.', ask: '¿Es algo del momento o prefieres no invertir en esto por ahora?' },
      profesional: { body: 'Agradezco tu honestidad. Es importante que cualquier decisión se ajuste a tu presupuesto.', ask: '¿Te gustaría que revisemos juntos si hay una opción que se ajuste, sin compromiso?' },
      cercano: { body: 'Te entiendo muchísimo, lo primero es tu tranquilidad.', ask: '¿Quieres que lo retomemos más adelante, cuando sea mejor momento?' },
      directo: { body: 'Entendido, gracias por la claridad.', ask: '¿Lo retomamos en unas semanas?' },
    },
    altAsks: ['Si el dinero no fuera tema, ¿te interesaría?', '¿Qué tendría que pasar para que sea un buen momento?'],
    call: {
      open: 'Agradece su sinceridad y quita toda presión.',
      questions: ['¿Es un tema del momento o de prioridades?', 'Si el presupuesto no fuera problema, ¿te interesaría?'],
      close: 'Respeta su situación. Propón mantener el contacto sin compromiso.',
    },
  },
  {
    key: 'quiere_consultarlo',
    label: 'Quiere consultarlo',
    group: 'Objeción',
    goal: 'Facilitar que tome la decisión con quien necesita, con información clara.',
    tip: 'Ofrece resolver dudas a ambos. Consultar con la pareja o la familia es una señal de seriedad, no una evasiva.',
    avoid: 'Intentar que decida sin consultarlo.',
    styles: {
      natural: { body: 'Me parece muy bien que lo converses con tu familia.', ask: '¿Te gustaría que les comparta la información o que hablemos los tres?' },
      profesional: { body: 'Es una excelente decisión consultarlo.', ask: '¿Qué información te sería útil para esa conversación?' },
      cercano: { body: '¡Claro! Lo ideal es que lo decidan juntos.', ask: 'Si quieren, podemos hacer una llamada corta los tres y resuelvo sus dudas.' },
      directo: { body: 'Perfecto, consúltalo.', ask: '¿Cuándo crees que lo habrán hablado? Te escribo después.' },
    },
    altAsks: ['¿Qué crees que te va a preguntar?', '¿Te preparo un resumen corto para compartir?'],
    call: {
      open: 'Valida que lo consulte.',
      questions: ['¿Qué crees que le preocupará más?', '¿Quieres que le explique yo?'],
      close: 'Acuerda una fecha para retomar después de su conversación.',
    },
  },
  {
    key: 'tiene_dudas',
    label: 'Tiene dudas',
    group: 'Objeción',
    goal: 'Hacer visibles las dudas y responderlas con información verificable.',
    tip: 'Pedir que te cuente sus dudas sin defenderte crea confianza. Si no sabes algo, dilo y averígualo.',
    avoid: 'Responder dudas con testimonios exagerados o cifras de ingresos.',
    styles: {
      natural: { body: 'Es normal tener dudas, yo también las tuve.', ask: '¿Cuáles son las que más te dan vueltas?' },
      profesional: { body: 'Las dudas son parte de una buena decisión y me interesa resolverlas con transparencia.', ask: '¿Qué aspectos te gustaría que aclaremos?' },
      cercano: { body: 'Pregúntame lo que quieras, sin pena.', ask: '¿Qué es lo que más te genera dudas?' },
      directo: { body: 'Resolvamos tus dudas.', ask: '¿Cuál es la principal?' },
    },
    altAsks: ['¿Es sobre el producto, la empresa o el modelo de negocio?', '¿Te ayudaría hablar con alguien del equipo que empezó hace poco?'],
    call: {
      open: 'Invita a que exprese todas sus dudas sin interrumpir.',
      questions: ['¿Qué te genera más dudas?', '¿Qué has escuchado sobre este tipo de negocios?', '¿Qué necesitarías ver para sentirte seguro/a?'],
      close: 'Responde con información verificable y acuerda cómo seguir.',
    },
  },
  {
    key: 'interes_producto',
    label: 'Interesado en producto',
    group: 'Interés',
    goal: 'Entender su necesidad y orientar sin hacer promesas sobre resultados.',
    tip: 'Pregunta por su rutina y lo que busca; describe el producto con lo que es, no con lo que "cura".',
    avoid: 'Afirmaciones médicas o prometer resultados específicos.',
    styles: {
      natural: { body: 'Qué bueno que te interesen los {categoria}.', ask: '¿Qué es lo que estás buscando mejorar en tu rutina?' },
      profesional: { body: 'Con gusto te oriento sobre los {categoria} de {empresa}.', ask: '¿Me cuentas qué te gustaría encontrar en un producto así?' },
      cercano: { body: '¡Me encanta que te interese! Te cuento todo.', ask: '¿Para qué lo quieres usar principalmente?' },
      directo: { body: 'Te cuento sobre los productos.', ask: '¿Cuál te llamó la atención?' },
    },
    altAsks: ['¿Has probado productos similares antes?', '¿Te comparto la ficha del producto para que la revises con calma?'],
    call: {
      open: 'Pregunta qué le llamó la atención del producto.',
      questions: ['¿Qué buscas mejorar en tu rutina?', '¿Has usado algo similar?', '¿Tienes alguna condición por la que debas consultar a tu médico antes?'],
      close: 'Recomienda según su necesidad, sin promesas de resultados, y pregunta si quiere probarlo.',
    },
  },
  {
    key: 'interes_negocio',
    label: 'Interesado en negocio',
    group: 'Interés',
    goal: 'Evaluar juntos si el negocio encaja con su vida y sus metas.',
    tip: 'Habla con honestidad del trabajo que requiere. Las personas que entran con expectativas reales se quedan.',
    avoid: 'Mostrar ingresos de líderes como si fueran el resultado típico.',
    styles: {
      natural: { body: 'Me alegra que te interese el negocio.', ask: '¿Qué te gustaría lograr con esto en los próximos meses?' },
      profesional: { body: 'Te agradezco el interés. Me gustaría que evaluemos juntos si el modelo se ajusta a tus objetivos y disponibilidad.', ask: '¿Agendamos una conversación esta semana?' },
      cercano: { body: '¡Qué emoción que quieras conocer más!', ask: 'Cuéntame, ¿qué te motiva a buscar algo nuevo?' },
      directo: { body: 'Hablemos del negocio.', ask: '¿Cuánto tiempo a la semana podrías dedicarle?' },
    },
    altAsks: ['¿Qué tendría que tener un negocio para que te convenza?', '¿Te gustaría hablar con alguien del equipo que empezó en una situación parecida a la tuya?'],
    call: {
      open: 'Pregunta qué lo motiva a considerar el negocio.',
      questions: ['¿Qué quieres lograr?', '¿Cuánto tiempo podrías dedicarle?', '¿Qué te preocupa de este tipo de negocio?'],
      close: 'Propón una presentación o una llamada a tres con alguien del equipo. Aclara que los resultados dependen del trabajo.',
    },
  },
];

export const situationByKey = (k: SituationKey) => SITUATIONS.find((s) => s.key === k)!;

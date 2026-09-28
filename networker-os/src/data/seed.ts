// Datos demo realistas. Las fechas son RELATIVAS al momento de carga para que el
// Radar y "¿Qué hago ahora?" siempre muestren prioridades vigentes.

import type { ActivityLog, Contact, Interaction, Member, PracticeLog, Stage } from '../domain/models';
import { addDays, isoAtDaysFrom, mondayOf, toDateKey } from '../utils/dates';

interface DemoContactSpec {
  id: string;
  first: string;
  last: string;
  country: string;
  city: string;
  createdDaysAgo: number;
  stage: Stage;
  temperature: Contact['temperature'];
  interest: Contact['interest'];
  objection?: Contact['objection'];
  source: string;
  tags: string[];
  notes: string;
  nextAction?: { text: string; inDays: number };
  history: {
    daysAgo: number;
    type: Interaction['type'];
    dir: Interaction['direction'];
    topics?: Interaction['topics'];
    note: string;
    to?: Stage;
    from?: Stage;
    hour?: number;
  }[];
}

const SPECS: DemoContactSpec[] = [
  {
    id: 'demo-carlos', first: 'Carlos', last: 'Méndez', country: 'Colombia', city: 'Medellín', createdDaysAgo: 18,
    stage: 'interesado', temperature: 'alta', interest: 'negocio', source: 'Referido', tags: ['emprendedor'],
    notes: 'Tiene una tienda de ropa. Busca un ingreso adicional que no dependa del local.',
    history: [
      { daysAgo: 18, type: 'contacto', dir: 'saliente', note: 'Primer mensaje por WhatsApp, lo refirió Marta.' },
      { daysAgo: 16, type: 'mensaje', dir: 'entrante', topics: ['producto'], note: 'Respondió con buena actitud, preguntó qué vendo.' },
      { daysAgo: 9, type: 'llamada', dir: 'saliente', topics: ['producto'], note: 'Le conté del producto; le gustó.' },
      { daysAgo: 2, type: 'mensaje', dir: 'entrante', topics: ['negocio'], note: '"¿Y cómo es eso de ser distribuidor? ¿Cuánto hay que invertir?"', hour: 19 },
    ],
  },
  {
    id: 'demo-maria', first: 'María', last: 'Fernández', country: 'Venezuela', city: 'Valencia', createdDaysAgo: 6,
    stage: 'interesado', temperature: 'media', interest: 'producto', source: 'Instagram', tags: ['bienestar'],
    notes: 'Llegó por una publicación sobre descanso.',
    history: [
      { daysAgo: 6, type: 'mensaje', dir: 'entrante', topics: ['producto'], note: 'Comentó en una publicación y pidió información.' },
      { daysAgo: 5, type: 'mensaje', dir: 'saliente', topics: ['producto'], note: 'Le pregunté qué buscaba.' },
      { daysAgo: 1, type: 'mensaje', dir: 'entrante', topics: ['producto'], note: 'Pidió la ficha de Melatonin Plus y cómo se usa.', hour: 21 },
    ],
  },
  {
    id: 'demo-jorge', first: 'Jorge', last: 'Castillo', country: 'México', city: 'Guadalajara', createdDaysAgo: 11,
    stage: 'interesado', temperature: 'media', interest: 'producto', source: 'Facebook', tags: [],
    notes: 'Deportista, entrena 4 veces por semana.',
    history: [
      { daysAgo: 11, type: 'contacto', dir: 'saliente', note: 'Primer contacto en un grupo de running.' },
      { daysAgo: 10, type: 'mensaje', dir: 'entrante', topics: ['producto'], note: 'Le interesó el producto para su rutina.' },
      { daysAgo: 3, type: 'mensaje', dir: 'entrante', topics: ['precio'], note: '"¿Cuánto cuesta el paquete mensual?"', hour: 12 },
    ],
  },
  {
    id: 'demo-ana', first: 'Ana', last: 'Gómez', country: 'Perú', city: 'Lima', createdDaysAgo: 21,
    stage: 'presentacion_realizada', temperature: 'alta', interest: 'negocio', source: 'Evento', tags: ['líder', 'ventas'],
    notes: 'Fue vendedora de seguros 6 años. Muy buena comunicadora.',
    history: [
      { daysAgo: 21, type: 'contacto', dir: 'saliente', note: 'La conocí en el evento de emprendimiento.' },
      { daysAgo: 19, type: 'mensaje', dir: 'entrante', topics: ['negocio'], note: 'Preguntó por el modelo de negocio.' },
      { daysAgo: 12, type: 'llamada', dir: 'saliente', topics: ['negocio'], note: 'Llamada de 20 min. Quiere ver la presentación.', to: 'presentacion_pendiente', from: 'interesado' },
      { daysAgo: 2, type: 'presentacion', dir: 'saliente', topics: ['negocio'], note: 'Presentación por Zoom. Hizo muchas preguntas sobre el plan.', to: 'presentacion_realizada', from: 'presentacion_pendiente' },
    ],
  },
  {
    id: 'demo-natalia', first: 'Natalia', last: 'Suárez', country: 'Colombia', city: 'Bogotá', createdDaysAgo: 9,
    stage: 'interesado', temperature: 'alta', interest: 'ambos', source: 'Referido', tags: [],
    notes: 'Mamá de dos. Interesada en el producto para ella y en el negocio desde casa.',
    nextAction: { text: 'Enviarle la ficha del producto y el video del plan', inDays: -1 },
    history: [
      { daysAgo: 9, type: 'contacto', dir: 'saliente', note: 'La refirió Camila.' },
      { daysAgo: 4, type: 'llamada', dir: 'saliente', topics: ['producto', 'negocio'], note: 'Le prometí enviarle la ficha y el video.' },
    ],
  },
  {
    id: 'demo-valentina', first: 'Valentina', last: 'Ruiz', country: 'Ecuador', city: 'Quito', createdDaysAgo: 8,
    stage: 'presentacion_pendiente', temperature: 'media', interest: 'negocio', source: 'Instagram', tags: [],
    notes: 'Estudiante de administración. Quiere algo flexible.',
    history: [
      { daysAgo: 8, type: 'mensaje', dir: 'entrante', topics: ['negocio'], note: 'Escribió por un reel sobre trabajo desde casa.' },
      { daysAgo: 7, type: 'mensaje', dir: 'saliente', topics: ['negocio'], note: 'Le propuse ver una presentación.' },
      { daysAgo: 1, type: 'mensaje', dir: 'saliente', note: 'Le recordé lo de la presentación.', to: 'presentacion_pendiente', from: 'interesado' },
    ],
  },
  {
    id: 'demo-pedro', first: 'Pedro', last: 'Salazar', country: 'Chile', city: 'Santiago', createdDaysAgo: 25,
    stage: 'contactado', temperature: 'media', interest: 'producto', source: 'Mercado natural', tags: [],
    notes: 'Excompañero de trabajo.',
    history: [
      { daysAgo: 25, type: 'contacto', dir: 'saliente', note: 'Lo saludé después de mucho tiempo.' },
      { daysAgo: 23, type: 'mensaje', dir: 'entrante', topics: ['producto'], note: 'Le llamó la atención lo que publico.' },
      { daysAgo: 12, type: 'mensaje', dir: 'saliente', topics: ['producto'], note: 'Le envié información general.' },
    ],
  },
  {
    id: 'demo-luis', first: 'Luis', last: 'Rojas', country: 'Colombia', city: 'Cali', createdDaysAgo: 40,
    stage: 'seguimiento', temperature: 'media', interest: 'ambos', source: 'Referido', tags: [],
    notes: 'Le interesó todo, pero se enfrió después de viajar.',
    history: [
      { daysAgo: 40, type: 'contacto', dir: 'saliente', note: 'Primer contacto.' },
      { daysAgo: 35, type: 'mensaje', dir: 'entrante', topics: ['negocio', 'producto'], note: 'Preguntó por ambos.' },
      { daysAgo: 25, type: 'presentacion', dir: 'saliente', topics: ['negocio'], note: 'Vio la presentación, quedó en pensarlo.' },
      { daysAgo: 22, type: 'mensaje', dir: 'entrante', topics: ['decision'], note: 'Dijo que viajaba y que después hablábamos.' },
      { daysAgo: 16, type: 'mensaje', dir: 'saliente', note: 'Le pregunté cómo le fue en el viaje.' },
    ],
  },
  {
    id: 'demo-ricardo', first: 'Ricardo', last: 'Peña', country: 'Venezuela', city: 'Maracay', createdDaysAgo: 22,
    stage: 'contactado', temperature: 'baja', interest: 'desconocido', source: 'WhatsApp', tags: [],
    notes: '',
    history: [
      { daysAgo: 22, type: 'contacto', dir: 'saliente', note: 'Primer mensaje.' },
      { daysAgo: 20, type: 'mensaje', dir: 'entrante', note: 'Respondió el saludo.' },
      { daysAgo: 9, type: 'mensaje', dir: 'saliente', note: 'Le conté a qué me dedico.' },
      { daysAgo: 5, type: 'seguimiento', dir: 'saliente', note: 'Le pregunté si había visto mi mensaje.' },
    ],
  },
  {
    id: 'demo-laura', first: 'Laura', last: 'Pineda', country: 'Colombia', city: 'Barranquilla', createdDaysAgo: 15,
    stage: 'seguimiento', temperature: 'media', interest: 'negocio', objection: 'dinero', source: 'Facebook', tags: [],
    notes: 'Le interesa pero dice que este mes está justa de dinero.',
    nextAction: { text: 'Retomar conversación cuando cobre la quincena', inDays: 3 },
    history: [
      { daysAgo: 15, type: 'mensaje', dir: 'entrante', topics: ['negocio'], note: 'Preguntó por el negocio en un comentario.' },
      { daysAgo: 10, type: 'presentacion', dir: 'saliente', topics: ['negocio'], note: 'Presentación corta por videollamada.' },
      { daysAgo: 4, type: 'llamada', dir: 'entrante', topics: ['objecion', 'decision'], note: 'Le interesa, pero no tiene dinero este mes. Acordamos retomarlo.' },
    ],
  },
  {
    id: 'demo-camila', first: 'Camila', last: 'Torres', country: 'Colombia', city: 'Envigado', createdDaysAgo: 60,
    stage: 'cliente', temperature: 'media', interest: 'producto', source: 'Mercado natural', tags: ['cliente frecuente'],
    notes: 'Compró PNG. Muy contenta con la atención.',
    history: [
      { daysAgo: 60, type: 'contacto', dir: 'saliente', note: 'Amiga de la familia.' },
      { daysAgo: 30, type: 'llamada', dir: 'entrante', topics: ['producto', 'precio'], note: 'Preguntó por el producto.' },
      { daysAgo: 27, type: 'compra', dir: 'entrante', topics: ['decision'], note: 'Primera compra: PNG.', to: 'cliente', from: 'interesado' },
    ],
  },
  {
    id: 'demo-andres', first: 'Andrés', last: 'Molina', country: 'México', city: 'Monterrey', createdDaysAgo: 55,
    stage: 'distribuidor', temperature: 'alta', interest: 'negocio', source: 'Referido', tags: ['equipo'],
    notes: 'Se unió hace 3 semanas. Necesita ayuda con su lista de contactos.',
    history: [
      { daysAgo: 55, type: 'contacto', dir: 'saliente', note: 'Primer contacto.' },
      { daysAgo: 30, type: 'presentacion', dir: 'saliente', topics: ['negocio'], note: 'Presentación en persona.' },
      { daysAgo: 20, type: 'mensaje', dir: 'entrante', topics: ['decision'], note: 'Decidió empezar.', to: 'distribuidor', from: 'presentacion_realizada' },
      { daysAgo: 9, type: 'llamada', dir: 'saliente', note: 'Revisamos sus primeros contactos.' },
    ],
  },
  {
    id: 'demo-sofia', first: 'Sofía', last: 'Herrera', country: 'Perú', city: 'Arequipa', createdDaysAgo: 1,
    stage: 'nuevo', temperature: 'baja', interest: 'desconocido', source: 'Evento', tags: [],
    notes: 'La conocí en el taller del sábado.', history: [],
  },
  {
    id: 'demo-diego', first: 'Diego', last: 'Vargas', country: 'Colombia', city: 'Pereira', createdDaysAgo: 5,
    stage: 'nuevo', temperature: 'baja', interest: 'desconocido', source: 'TikTok', tags: [],
    notes: '', history: [],
  },
  {
    id: 'demo-gabriela', first: 'Gabriela', last: 'León', country: 'Chile', city: 'Valparaíso', createdDaysAgo: 30,
    stage: 'no_interesado', temperature: 'fria', interest: 'desconocido', source: 'Instagram', tags: [],
    notes: 'Dijo que no le interesa. Respetar.',
    history: [
      { daysAgo: 30, type: 'contacto', dir: 'saliente', note: 'Primer mensaje.' },
      { daysAgo: 28, type: 'mensaje', dir: 'entrante', topics: ['decision'], note: 'No le interesa por ahora.', to: 'no_interesado', from: 'contactado' },
    ],
  },
  {
    id: 'demo-felipe', first: 'Felipe', last: 'Ortiz', country: 'Ecuador', city: 'Guayaquil', createdDaysAgo: 70,
    stage: 'inactivo', temperature: 'fria', interest: 'desconocido', source: 'Otro', tags: [],
    notes: 'Nunca respondió con interés.',
    history: [{ daysAgo: 45, type: 'mensaje', dir: 'saliente', note: 'Saludo sin respuesta.' }],
  },
];

const PHONES = ['+57 300 000 0001', '+58 412 000 0002', '+52 33 0000 0003', '+51 900 000 004', '+57 301 000 0005', '+593 99 000 0006', '+56 9 0000 0007', '+57 302 000 0008', '+58 414 000 0009', '+57 303 000 0010', '+57 304 000 0011', '+52 81 0000 0012', '+51 900 000 013', '+57 305 000 0014', '+56 9 0000 0015', '+593 99 000 0016'];

export function buildDemoContacts(now: Date): { contacts: Contact[]; interactions: Interaction[] } {
  const contacts: Contact[] = [];
  const interactions: Interaction[] = [];
  SPECS.forEach((s, idx) => {
    const created = isoAtDaysFrom(now, -s.createdDaysAgo, 9);
    let initialStage: Stage = 'nuevo';
    const firstChange = s.history.find((h) => h.from);
    if (firstChange?.from) initialStage = firstChange.from;
    else if (s.history.length && !s.history.some((h) => h.to)) initialStage = s.stage;
    interactions.push({
      id: `${s.id}-reg`, contactId: s.id, type: 'cambio_estado', direction: 'interna', topics: [],
      note: 'Contacto registrado', date: created, meta: { to: s.history.length ? initialStage : s.stage }, isDemo: true,
    });
    s.history.forEach((h, j) => {
      const date = isoAtDaysFrom(now, -h.daysAgo, h.hour ?? 10 + (j % 6));
      interactions.push({ id: `${s.id}-${j}`, contactId: s.id, type: h.type, direction: h.dir, topics: h.topics ?? [], note: h.note, date, isDemo: true });
      if (h.to) {
        interactions.push({
          id: `${s.id}-${j}-st`, contactId: s.id, type: 'cambio_estado', direction: 'interna',
          topics: ['cliente', 'distribuidor', 'no_interesado'].includes(h.to) ? ['decision'] : [],
          note: '', date: new Date(new Date(date).getTime() + 60_000).toISOString(), meta: { from: h.from, to: h.to }, isDemo: true,
        });
      }
    });
    const touches = s.history.map((h) => isoAtDaysFrom(now, -h.daysAgo, 10)).sort();
    contacts.push({
      id: s.id, firstName: s.first, lastName: s.last, phone: PHONES[idx % PHONES.length], whatsapp: PHONES[idx % PHONES.length],
      country: s.country, city: s.city, createdAt: created, updatedAt: created,
      lastInteractionAt: touches.length ? touches[touches.length - 1] : null,
      nextAction: s.nextAction ? { text: s.nextAction.text, dueDate: isoAtDaysFrom(now, s.nextAction.inDays, 9) } : null,
      notes: s.notes, tags: s.tags, source: s.source, ownerId: 'me', stage: s.stage, temperature: s.temperature,
      interest: s.interest, objection: s.objection ?? null, isDemo: true,
    });
  });
  // lastInteractionAt usa la hora real de cada interacción
  for (const c of contacts) {
    const last = interactions
      .filter((i) => i.contactId === c.id && i.type !== 'cambio_estado' && i.direction !== 'interna')
      .reduce<string | null>((m, i) => (!m || i.date > m ? i.date : m), null);
    c.lastInteractionAt = last;
  }
  return { contacts, interactions };
}

export function buildDemoOrganization(now: Date, leaderName: string): { members: Member[]; logs: ActivityLog[] } {
  const ago = (d: number) => isoAtDaysFrom(now, -d, 11);
  const members: Member[] = [
    { id: 'me', name: leaderName, parentId: null, role: 'lider', country: 'Colombia', joinedAt: ago(900), lastActivityAt: ago(0) },
    { id: 'm-marta', name: 'Marta Díaz', parentId: 'me', role: 'distribuidor', country: 'Colombia', joinedAt: ago(300), lastActivityAt: ago(1), isDemo: true },
    { id: 'm-kevin', name: 'Kevin Rivas', parentId: 'me', role: 'distribuidor', country: 'Venezuela', joinedAt: ago(200), lastActivityAt: ago(12), isDemo: true },
    { id: 'm-yuli', name: 'Yuli Cárdenas', parentId: 'me', role: 'distribuidor', country: 'México', joinedAt: ago(150), lastActivityAt: ago(3), isDemo: true },
    { id: 'm-andres', name: 'Andrés Molina', parentId: 'me', role: 'distribuidor', country: 'México', joinedAt: ago(20), lastActivityAt: ago(9), isDemo: true },
    { id: 'm-oscar', name: 'Oscar Blanco', parentId: 'm-marta', role: 'distribuidor', country: 'Colombia', joinedAt: ago(120), lastActivityAt: ago(2), isDemo: true },
    { id: 'm-paola', name: 'Paola Méndez', parentId: 'm-marta', role: 'distribuidor', country: 'Perú', joinedAt: ago(90), lastActivityAt: ago(30), isDemo: true },
    { id: 'm-hector', name: 'Héctor Luna', parentId: 'm-kevin', role: 'distribuidor', country: 'Venezuela', joinedAt: ago(80), lastActivityAt: ago(25), isDemo: true },
    { id: 'm-rosa', name: 'Rosa Pérez', parentId: 'me', role: 'cliente', country: 'Colombia', joinedAt: ago(100), lastActivityAt: ago(20), isDemo: true },
    { id: 'm-tomas', name: 'Tomás Gil', parentId: 'm-yuli', role: 'cliente', country: 'México', joinedAt: ago(60), lastActivityAt: ago(15), isDemo: true },
    { id: 'm-lina', name: 'Lina Ramos', parentId: 'm-oscar', role: 'cliente', country: 'Colombia', joinedAt: ago(40), lastActivityAt: ago(6), isDemo: true },
  ];

  // [semanas atrás 0..3] → [contactos, presentaciones, seguimientos, clientes, distribuidores]
  const plan: Record<string, number[][]> = {
    'm-marta': [[2, 1, 2, 0, 0], [2, 1, 3, 0, 0], [1, 0, 2, 0, 1], [2, 1, 2, 1, 0]],
    'm-yuli': [[1, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 0, 0, 0, 0], [0, 0, 1, 0, 0]],
    'm-oscar': [[1, 0, 1, 0, 0], [0, 0, 0, 0, 0], [1, 0, 1, 0, 0], [0, 0, 0, 0, 0]],
    'm-kevin': [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    'm-andres': [[0, 0, 0, 0, 0], [1, 0, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    'm-paola': [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
    'm-hector': [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]],
  };
  const logs: ActivityLog[] = [];
  for (const [memberId, weeks] of Object.entries(plan)) {
    weeks.forEach((w, wi) => {
      logs.push({
        id: `log-${memberId}-${wi}`, memberId, weekStart: toDateKey(addDays(mondayOf(now), -7 * wi)),
        newContacts: w[0], presentations: w[1], followUps: w[2], newClients: w[3], newDistributors: w[4], isDemo: true,
      });
    });
  }
  return { members, logs };
}

export function buildDemoPractice(now: Date): PracticeLog[] {
  return [2, 3, 5].map((d) => ({
    id: `demo-practice-${d}`, date: isoAtDaysFrom(now, -d, 20), kind: 'simulador' as const, label: 'Simulación: No tengo tiempo',
  }));
}

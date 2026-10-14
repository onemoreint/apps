/* Mi Perfil de Bienestar — José Lugo
 * PWA sin servidor: todo se procesa en el dispositivo.
 * - Sin analíticas, sin peticiones externas, sin datos en la URL.
 * - Borrador en IndexedDB SOLO si el usuario lo activa (con caducidad).
 */
'use strict';

const APP_VERSION = '1.0.0';
const ADVISOR_PHONE = '573126387467';
const ADVISOR_LABEL = '+57 312 638 7467';
const DB_NAME = 'mpb-borradores';
const STORE = 'borrador';
const DRAFT_KEY = 'actual';
const LAST_STEP = 6;
const HEALTH_FIELDS = ['acepto_salud', 'embarazo', 'medicamentos', 'condicion', 'piel_adhesivos', 'salud_notas'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- Estado en memoria ---------- */
const app = {
  step: 0,
  answers: {},
  report: '',
  message: '',
  messageEdited: false,
  includeHealth: false,
  meta: { reportAt: null, whatsappOpenedAt: null },
  draftEnabled: false,
  draftTTL: 72,
  installPrompt: null,
  swReg: null,
  online: navigator.onLine,
};

/* ---------- Utilidades ---------- */
function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).replace(/\.$/, '');
}
function debounce(fn, ms) {
  let t;
  const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = () => { clearTimeout(t); fn(); };
  d.cancel = () => clearTimeout(t);
  return d;
}

/* ---------- Formulario <-> estado ---------- */
const form = $('#form');

function buildScales() {
  $$('.scale-chips').forEach(box => {
    const name = box.dataset.scale;
    for (let i = 1; i <= 5; i++) {
      const l = document.createElement('label');
      const inp = document.createElement('input');
      inp.type = 'radio'; inp.name = name; inp.value = String(i);
      inp.setAttribute('aria-label', `${i} de 5`);
      const s = document.createElement('span'); s.textContent = String(i);
      l.append(inp, s); box.append(l);
    }
    const fs = box.closest('fieldset');
    const leg = document.createElement('div');
    leg.className = 'scale-legend';
    const a = document.createElement('span'); a.textContent = `1 = ${fs.dataset.low}`;
    const b = document.createElement('span'); b.textContent = `5 = ${fs.dataset.high}`;
    leg.append(a, b); box.after(leg);
  });
}

function readForm() {
  const out = {};
  $$('input, select, textarea', form).forEach(el => {
    if (!el.name) return;
    if (el.type === 'checkbox') {
      if (el.name === 'objetivos') {
        out.objetivos = out.objetivos || [];
        if (el.checked) out.objetivos.push(el.value);
      } else if (el.checked) out[el.name] = el.value;
    } else if (el.type === 'radio') {
      if (el.checked) out[el.name] = el.value;
    } else if (el.value.trim() !== '') {
      out[el.name] = el.value.trim().slice(0, Number(el.maxLength) > 0 ? el.maxLength : 400);
    }
  });
  if (out.objetivos && !out.objetivos.length) delete out.objetivos;
  // Sin modo «responder» + consentimiento explícito, no se conserva ningún dato de salud.
  if (out.salud_modo !== 'responder' || out.acepto_salud !== 'si') {
    HEALTH_FIELDS.forEach(k => { if (!(k === 'acepto_salud' && out.salud_modo === 'responder')) delete out[k]; });
  }
  return out;
}

function writeForm(a) {
  $$('input, select, textarea', form).forEach(el => {
    if (!el.name) return;
    const v = a[el.name];
    if (el.type === 'checkbox') {
      el.checked = el.name === 'objetivos' ? Array.isArray(v) && v.includes(el.value) : v === el.value;
    } else if (el.type === 'radio') {
      el.checked = v === el.value;
    } else {
      el.value = v == null ? '' : v;
    }
  });
  syncHealthUI();
  syncMinorHint();
}

function clearHealthInputs() {
  HEALTH_FIELDS.forEach(n => $$(`[name="${n}"]`, form).forEach(el => {
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = false; else el.value = '';
  }));
}

function syncHealthUI() {
  const mode = (form.querySelector('[name="salud_modo"]:checked') || {}).value;
  const consent = form.querySelector('[name="acepto_salud"]').checked;
  $('#health-questions').hidden = mode !== 'responder';
  $('#health-fields').hidden = !(mode === 'responder' && consent);
}
function syncMinorHint() {
  $('#minor-hint').hidden = form.querySelector('[name="edad"]').value !== 'Menos de 18';
}

form.addEventListener('input', onFormChange);
form.addEventListener('change', onFormChange);
function onFormChange(e) {
  const t = e.target;
  if (t.name === 'salud_modo' && t.value === 'asesor') clearHealthInputs();
  if (t.name === 'acepto_salud' && !t.checked) {
    HEALTH_FIELDS.filter(k => k !== 'acepto_salud').forEach(n => $$(`[name="${n}"]`, form).forEach(el => {
      if (el.type === 'radio') el.checked = false; else el.value = '';
    }));
  }
  syncHealthUI();
  syncMinorHint();
  app.answers = readForm();
  $('#step-error').hidden = true;
  $('#health-error').hidden = true;
  if (app.step === 0) updateNav();
  scheduleSave();
}

/* ---------- Navegación entre pasos ---------- */
function validateStep(n) {
  const a = app.answers;
  if (n === 0 && (a.acepto_orientativo !== 'si' || a.acepto_local !== 'si'))
    return 'Para continuar, marca las dos casillas de consentimiento.';
  if (n === 1 && !a.nombre) return 'Escribe tu nombre (o cómo prefieres que te llamen).';
  if (n === 4) {
    if (!a.salud_modo) return 'Elige si prefieres responder o tratar tu salud con el asesor.';
    if (a.salud_modo === 'responder' && a.acepto_salud !== 'si')
      return 'Para registrar respuestas de salud necesitamos tu consentimiento. También puedes elegir tratarlo con el asesor.';
  }
  return null;
}

function goTo(n, { focus = true } = {}) {
  app.step = Math.max(0, Math.min(LAST_STEP, n));
  $$('.step').forEach(s => { s.hidden = Number(s.dataset.step) !== app.step; });
  if (app.step === 5) renderReview();
  if (app.step === 6) renderReportView();
  updateNav();
  if (focus) { window.scrollTo({ top: 0 }); $('#main').focus({ preventScroll: true }); }
  scheduleSave();
}

function updateNav() {
  const s = app.step;
  const sec = $(`.step[data-step="${s}"]`);
  $('#progress-bar').style.width = `${Math.round((s / LAST_STEP) * 100)}%`;
  $('#step-label').textContent = s === 0 ? '' : `Paso ${Math.min(s, 5)} de 5 · ${sec.dataset.title}`;
  if (s === 6) $('#step-label').textContent = 'Informe preliminar';
  $('#step-nav').hidden = s === 6;
  $('#prev-btn').hidden = s === 0;
  const next = $('#next-btn');
  next.textContent = s === 0 ? 'Comenzar' : s === 4 ? 'Revisar respuestas' : s === 5 ? 'Generar informe' : 'Siguiente';
  $('#volatile-hint').hidden = app.draftEnabled;
}

$('#next-btn').addEventListener('click', () => {
  app.answers = readForm();
  const err = validateStep(app.step);
  if (err) {
    const box = app.step === 4 ? $('#health-error') : $('#step-error');
    box.textContent = err; box.hidden = false;
    return;
  }
  if (app.step === 5) { generateReport(); }
  goTo(app.step + 1);
});
$('#prev-btn').addEventListener('click', () => goTo(app.step - 1));
$('#edit-answers').addEventListener('click', () => goTo(5));

/* ---------- Revisión ---------- */
const REVIEW = [
  { step: 1, title: 'Sobre ti', fields: [['nombre', 'Nombre'], ['ubicacion', 'Ciudad y país'], ['edad', 'Edad'], ['rutina', 'Rutina']] },
  { step: 2, title: 'Hábitos', fields: [['sueno_horas', 'Horas de sueño'], ['sueno_calidad', 'Calidad del sueño (1–5)'], ['energia', 'Energía (1–5)'], ['estres', 'Estrés (1–5)'], ['actividad', 'Actividad física'], ['agua', 'Agua al día'], ['alimentacion', 'Alimentación']] },
  { step: 3, title: 'Objetivos', fields: [['objetivos', 'Quiero mejorar'], ['prioridad', 'Prioridad'], ['meta90', 'Meta a 90 días'], ['negocio', 'Oportunidad de negocio']] },
  { step: 4, title: 'Salud (opcional)', fields: [['salud_modo', 'Modo'], ['embarazo', 'Embarazo o lactancia'], ['medicamentos', 'Medicamentos regulares'], ['condicion', 'Condición diagnosticada'], ['piel_adhesivos', 'Piel sensible a adhesivos'], ['salud_notas', 'Notas']] },
];
function display(k, v) {
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '—';
  if (k === 'salud_modo') return v === 'asesor' ? 'Lo trataré directamente con el asesor' : 'Respondido en este formulario';
  return Array.isArray(v) ? v.join(', ') : String(v);
}
function renderReview() {
  const box = $('#review');
  box.replaceChildren();
  REVIEW.forEach(sec => {
    const wrap = document.createElement('section');
    wrap.className = 'review-sec';
    const h = document.createElement('header');
    const t = document.createElement('strong'); t.textContent = sec.title;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-small btn-ghost'; b.textContent = 'Editar';
    b.addEventListener('click', () => goTo(sec.step));
    h.append(t, b);
    const dl = document.createElement('dl');
    sec.fields.forEach(([k, label]) => {
      if (sec.step === 4 && app.answers.salud_modo !== 'responder' && k !== 'salud_modo') return;
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = display(k, app.answers[k]);
      dl.append(dt, dd);
    });
    wrap.append(h, dl);
    box.append(wrap);
  });
}

/* ---------- Informe ---------- */
function computeScore(a) {
  const parts = [];
  const sh = { 'Menos de 5': 3, '5–6': 8, '6–7': 14, '7–8': 20, 'Más de 8': 14 }[a.sueno_horas];
  if (sh != null) parts.push([sh, 20]);
  if (a.sueno_calidad) parts.push([Number(a.sueno_calidad) * 3, 15]);
  if (a.energia) parts.push([Number(a.energia) * 3, 15]);
  if (a.estres) parts.push([(6 - Number(a.estres)) * 3, 15]);
  const act = { 'Casi nunca': 0, '1–2 días por semana': 5, '3–4 días por semana': 10, '5 o más días por semana': 15 }[a.actividad];
  if (act != null) parts.push([act, 15]);
  const ag = { 'Menos de 1 litro': 3, '1 a 2 litros': 7, 'Más de 2 litros': 10, 'No lo sé': 5 }[a.agua];
  if (ag != null) parts.push([ag, 10]);
  const al = { 'Mayormente procesada o rápida': 2, 'Mixta': 6, 'Mayormente natural o casera': 10 }[a.alimentacion];
  if (al != null) parts.push([al, 10]);
  if (!parts.length) return null;
  const got = parts.reduce((s, p) => s + p[0], 0);
  const max = parts.reduce((s, p) => s + p[1], 0);
  const value = Math.round((got / max) * 100);
  const band = value >= 75 ? 'Buena base de hábitos' : value >= 50 ? 'Con oportunidades de mejora' : 'Prioridad: fortalecer hábitos básicos';
  return { value, band, answered: parts.length, total: 7 };
}

function observations(a) {
  const o = [];
  if (a.sueno_horas === 'Menos de 5' || a.sueno_horas === '5–6') o.push('Duermes menos de 6 horas: el descanso puede ser tu primera palanca de energía.');
  if (Number(a.sueno_calidad) <= 2) o.push('Calificas tu sueño como de baja calidad: vale la pena revisar rutina nocturna y pantallas antes de dormir.');
  if (Number(a.energia) <= 2) o.push('Reportas energía baja durante el día.');
  if (Number(a.estres) >= 4) o.push('Tu nivel de estrés es alto: pausas activas y respiración pueden ayudar.');
  if (a.actividad === 'Casi nunca') o.push('Casi no haces actividad física: empezar con caminatas cortas es un buen primer paso.');
  if (a.agua === 'Menos de 1 litro') o.push('Tomas menos de 1 litro de agua al día.');
  if (a.alimentacion === 'Mayormente procesada o rápida') o.push('Tu alimentación es mayormente procesada.');
  if (!o.length) o.push('No se observan alertas en tus hábitos básicos. ¡Buen punto de partida!');
  return o;
}

const TOPICS = {
  'Más energía': 'Energía: hábitos de descanso e hidratación; pregunta por la línea B12 Plus.',
  'Dormir mejor': 'Sueño: rutina nocturna; pregunta si Melatonin Plus es adecuado para ti.',
  'Control de peso': 'Peso: hábitos de alimentación y movimiento; pregunta por Slim Style.',
  'Piel y apariencia': 'Piel: hidratación y descanso; pregunta por la línea Collagen.',
  'Concentración y enfoque': 'Enfoque: descanso, pausas y pantallas; consulta qué opción encaja contigo.',
  'Manejar el estrés': 'Estrés: rutinas de pausa y sueño; consulta qué opción encaja contigo.',
  'Rendimiento físico': 'Rendimiento: recuperación e hidratación; consulta qué opción encaja contigo.',
  'Bienestar general': 'Bienestar general: revisa con tu asesor un plan simple de 90 días.',
};

function healthFlags(a) {
  const f = [];
  const risky = v => v === 'Sí' || v === 'Prefiero hablarlo con el asesor';
  if (risky(a.embarazo)) f.push('embarazo o lactancia');
  if (risky(a.medicamentos)) f.push('medicamentos regulares');
  if (risky(a.condicion)) f.push('condición de salud');
  if (a.piel_adhesivos === 'Sí' || a.piel_adhesivos === 'No lo sé') f.push('sensibilidad a adhesivos');
  return f;
}

function buildReport(a, { includeHealth }) {
  const L = [];
  const now = new Date();
  const score = computeScore(a);
  L.push('MI PERFIL DE BIENESTAR — INFORME PRELIMINAR');
  L.push(`Fecha: ${now.toLocaleDateString('es-CO', { dateStyle: 'long' })}`);
  L.push('');
  L.push('▸ DATOS');
  L.push(`Nombre: ${a.nombre || '—'}`);
  if (a.ubicacion) L.push(`Ubicación: ${a.ubicacion}`);
  if (a.edad) L.push(`Edad: ${a.edad}`);
  if (a.rutina) L.push(`Rutina: ${a.rutina}`);
  L.push('');
  L.push('▸ HÁBITOS');
  L.push(`Sueño: ${a.sueno_horas || '—'} h · calidad ${a.sueno_calidad || '—'}/5`);
  L.push(`Energía: ${a.energia || '—'}/5 · Estrés: ${a.estres || '—'}/5`);
  L.push(`Actividad física: ${a.actividad || '—'}`);
  L.push(`Agua: ${a.agua || '—'} · Alimentación: ${a.alimentacion || '—'}`);
  if (score) L.push(`Índice orientativo de hábitos: ${score.value}/100 (${score.band})${score.answered < score.total ? ` — basado en ${score.answered} de ${score.total} respuestas` : ''}`);
  L.push('');
  L.push('▸ OBSERVACIONES');
  observations(a).forEach(x => L.push(`• ${x}`));
  L.push('');
  L.push('▸ OBJETIVOS');
  L.push(`Quiero mejorar: ${(a.objetivos || []).join(', ') || '—'}`);
  if (a.prioridad) L.push(`Prioridad: ${a.prioridad}`);
  if (a.meta90) L.push(`Meta a 90 días: ${a.meta90}`);
  if (a.negocio) L.push(`Oportunidad de negocio: ${a.negocio}`);
  L.push('');

  const flags = healthFlags(a);
  const minor = a.edad === 'Menos de 18';
  L.push('▸ TEMAS PARA CONVERSAR CON TU ASESOR');
  if (flags.length || minor) {
    L.push('⚠ Antes de usar cualquier suplemento o parche, consulta con tu médico' +
      (minor ? ' y con tu madre, padre o tutor' : '') + '.');
  }
  const topics = (a.objetivos || []).map(o => TOPICS[o]).filter(Boolean);
  (topics.length ? topics : ['Define con tu asesor tu objetivo principal.']).forEach(x => L.push(`• ${x}`));
  L.push('');

  L.push('▸ SALUD');
  if (a.salud_modo !== 'responder') {
    L.push('Prefiero tratar mi salud directamente con el asesor.');
  } else if (!includeHealth) {
    L.push('Respondí preguntas de salud, pero prefiero comentarlas directamente con el asesor.');
  } else {
    L.push(`Embarazo o lactancia: ${a.embarazo || '—'}`);
    L.push(`Medicamentos regulares: ${a.medicamentos || '—'}`);
    L.push(`Condición diagnosticada: ${a.condicion || '—'}`);
    L.push(`Piel sensible a adhesivos: ${a.piel_adhesivos || '—'}`);
    if (a.salud_notas) L.push(`Notas: ${a.salud_notas}`);
  }
  L.push('');
  L.push('Este informe es orientativo. No es un diagnóstico ni una prescripción médica y no sustituye la consulta con un profesional de la salud.');
  return L.join('\n');
}

function buildMessage() {
  const report = buildReport(app.answers, { includeHealth: app.includeHealth });
  const intro = app.answers.nombre
    ? `Hola José, soy ${app.answers.nombre}. Completé «Mi Perfil de Bienestar» y quiero conversar contigo.`
    : 'Hola José, completé «Mi Perfil de Bienestar» y quiero conversar contigo.';
  return `${intro}\n\n${report}`;
}

function generateReport() {
  app.report = buildReport(app.answers, { includeHealth: true });
  app.meta.reportAt = Date.now();
  app.meta.whatsappOpenedAt = null;
  app.messageEdited = false;
  app.message = buildMessage();
}

function renderReportView() {
  if (!app.report) generateReport();
  $('#report-text').textContent = app.report;
  const sc = computeScore(app.answers);
  $('#score').hidden = !sc;
  if (sc) {
    $('#score-value').textContent = sc.value;
    $('#score-band').textContent = sc.band;
    $('#score-note').textContent = 'Índice orientativo calculado con tus respuestas de hábitos. No es una medición clínica.' +
      (sc.answered < sc.total ? ` Basado en ${sc.answered} de ${sc.total} respuestas.` : '');
  }
  const hasHealth = app.answers.salud_modo === 'responder' && app.answers.acepto_salud === 'si';
  $('#include-health-wrap').hidden = !hasHealth;
  $('#include-health').checked = app.includeHealth && hasHealth;
  if (!hasHealth) app.includeHealth = false;
  $('#advisor-msg').value = app.message || buildMessage();
  $('#share-report').hidden = typeof navigator.share !== 'function';
  renderSendState();
}

function renderSendState() {
  const box = $('#send-status');
  const online = app.online;
  const opened = app.meta.whatsappOpenedAt;
  box.className = 'status-box ' + (opened ? 'opened' : 'pending');
  if (opened) {
    box.textContent = `Abriste WhatsApp el ${fmtDate(opened)}. La app no puede confirmar si el mensaje se envió: verifica en tu chat con el asesor. Si no lo enviaste, puedes volver a abrir WhatsApp.`;
  } else if (!online) {
    box.textContent = 'Estás sin conexión. Tu informe está preparado, pero todavía no se ha enviado.';
  } else {
    box.textContent = `Informe preparado ${app.meta.reportAt ? 'el ' + fmtDate(app.meta.reportAt) : ''}. Todavía no se ha enviado.`;
  }
  $('#offline-send-note').hidden = online;
  $('#wa-copy-open').disabled = !online;
  $('#wa-prefill').disabled = !online;
}

$('#advisor-msg').addEventListener('input', e => {
  app.message = e.target.value;
  app.messageEdited = true;
  scheduleSave();
});
$('#include-health').addEventListener('change', e => {
  if (app.messageEdited && !confirm('Esto rehará el mensaje y perderás los cambios que escribiste. ¿Continuar?')) {
    e.target.checked = !e.target.checked; return;
  }
  app.includeHealth = e.target.checked;
  app.messageEdited = false;
  app.message = buildMessage();
  $('#advisor-msg').value = app.message;
  scheduleSave();
});
$('#regen-msg').addEventListener('click', () => {
  if (app.messageEdited && !confirm('¿Restablecer el mensaje? Perderás los cambios que escribiste.')) return;
  app.messageEdited = false;
  app.message = buildMessage();
  $('#advisor-msg').value = app.message;
  scheduleSave();
});

/* ---------- Copiar, descargar, compartir ---------- */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* sigue con el método alternativo */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.className = 'sr-only';
    document.body.append(ta);
    ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (_) { return false; }
}
$('#copy-report').addEventListener('click', async () => {
  const ok = await copyText(app.report);
  $('#copy-fallback').hidden = ok;
  toast(ok ? 'Informe copiado.' : 'No se pudo copiar automáticamente.');
});
$('#copy-msg').addEventListener('click', async () => {
  const ok = await copyText($('#advisor-msg').value);
  toast(ok ? 'Mensaje copiado.' : 'No se pudo copiar. Selecciona el texto y cópialo manualmente.');
});
$('#download-report').addEventListener('click', () => {
  if (!confirm('El archivo quedará guardado en tu dispositivo (por ejemplo, en Descargas) y no se borrará con «Eliminar mis datos». ¿Descargar?')) return;
  const blob = new Blob([app.report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mi-perfil-de-bienestar.txt';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#share-report').addEventListener('click', async () => {
  try { await navigator.share({ title: 'Mi Perfil de Bienestar', text: $('#advisor-msg').value }); }
  catch (e) { if (e.name !== 'AbortError') toast('No se pudo abrir el menú de compartir.'); }
});

/* ---------- WhatsApp (siempre con intervención del cliente) ---------- */
function openExternal(url) {
  const a = document.createElement('a');
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.append(a); a.click(); a.remove();
}
function blockIfOffline() {
  if (navigator.onLine && app.online) return false;
  setOnline(false);
  toast('Estás sin conexión. Tu informe está preparado, pero todavía no se ha enviado.', 4500);
  return true;
}
function markOpened() {
  app.meta.whatsappOpenedAt = Date.now();
  renderSendState();
  scheduleSave();
}
$('#wa-copy-open').addEventListener('click', () => {
  if (blockIfOffline()) return;
  const text = $('#advisor-msg').value;
  const copying = copyText(text); // se inicia dentro del gesto del usuario
  openExternal(`https://wa.me/${ADVISOR_PHONE}`);
  markOpened();
  copying.then(ok => toast(ok ? 'Mensaje copiado. Pégalo en el chat de WhatsApp, revísalo y envíalo.'
    : 'No se pudo copiar. Vuelve a la app, copia el mensaje y pégalo en WhatsApp.', 6000));
});
$('#wa-prefill').addEventListener('click', () => {
  if (blockIfOffline()) return;
  const text = $('#advisor-msg').value;
  if (text.length > 3500) {
    toast('El mensaje es muy largo para enviarlo en el enlace. Usa «Copiar mensaje y abrir WhatsApp».', 6000);
    return;
  }
  openExternal(`https://wa.me/${ADVISOR_PHONE}?text=${encodeURIComponent(text)}`);
  markOpened();
  toast('Revisa el mensaje en WhatsApp y envíalo cuando estés listo.', 5000);
});

/* ---------- Conectividad ---------- */
function setOnline(on) {
  const changed = app.online !== on;
  app.online = on;
  const pill = $('#net-pill');
  pill.textContent = on ? 'En línea' : 'Sin conexión';
  pill.className = 'pill ' + (on ? 'online' : 'offline');
  $('#st-net').textContent = on ? 'Conectado' : 'Sin conexión';
  const banner = $('#net-banner');
  if (!on) {
    banner.className = 'banner banner-offline';
    banner.textContent = 'Estás sin conexión. Puedes seguir completando el cuestionario y generar tu informe. Para enviarlo por WhatsApp necesitarás internet.';
    banner.hidden = false;
  } else if (changed) {
    banner.className = 'banner banner-online';
    banner.replaceChildren();
    const span = document.createElement('span');
    const pending = app.report && !app.meta.whatsappOpenedAt;
    span.textContent = pending ? 'Conexión recuperada. Tu informe aún no se ha enviado.' : 'Conexión recuperada.';
    banner.append(span);
    if (pending && app.step !== 6) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn btn-small btn-wa'; b.textContent = 'Ir a enviar por WhatsApp';
      b.addEventListener('click', () => { banner.hidden = true; goTo(6); });
      banner.append(b);
    }
    banner.hidden = false;
    setTimeout(() => { if (app.online) banner.hidden = true; }, 8000);
  } else {
    banner.hidden = true;
  }
  if (app.step === 6) renderSendState();
}
async function probeConnection() {
  if (!navigator.onLine) { setOnline(false); return false; }
  try {
    const r = await fetch(`./manifest.webmanifest?probe=${Date.now()}`, { cache: 'no-store', method: 'HEAD' });
    setOnline(r.ok); return r.ok;
  } catch (_) { setOnline(false); return false; }
}
window.addEventListener('online', probeConnection);
window.addEventListener('offline', () => setOnline(false));

/* ---------- Borrador en IndexedDB (solo con autorización) ---------- */
function idbOpen() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); res(db); };
    r.onerror = () => rej(r.error);
  });
}
async function idbTx(mode, fn) {
  const db = await idbOpen();
  try {
    return await new Promise((res, rej) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  } finally { db.close(); }
}
function idbDeleteAll() {
  return new Promise(res => {
    const r = indexedDB.deleteDatabase(DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}
async function idbExists() {
  if (indexedDB.databases) {
    try { return (await indexedDB.databases()).some(d => d.name === DB_NAME); } catch (_) { /* sigue */ }
  }
  return true; // sin databases(): comprobamos abriendo
}

async function saveDraftNow() {
  if (!app.draftEnabled) return;
  const now = Date.now();
  const rec = {
    v: 1, savedAt: now, expiresAt: now + app.draftTTL * 3600 * 1000, ttlHours: app.draftTTL,
    step: app.step, answers: app.answers, report: app.report, message: app.message,
    messageEdited: app.messageEdited, includeHealth: app.includeHealth, meta: app.meta,
  };
  try { await idbTx('readwrite', s => s.put(rec, DRAFT_KEY)); updateDraftStatus(rec); }
  catch (_) { toast('No se pudo guardar el borrador en este dispositivo.'); }
}
const scheduleSave = debounce(saveDraftNow, 400);

async function loadDraft() {
  if (!('indexedDB' in window) || !(await idbExists())) return;
  let rec;
  try { rec = await idbTx('readonly', s => s.get(DRAFT_KEY)); } catch (_) { return; }
  if (!rec) { await idbDeleteAll(); return; }
  if (Date.now() > rec.expiresAt) {
    await idbDeleteAll();
    toast('Tu borrador anterior caducó y se eliminó de este dispositivo.', 5000);
    return;
  }
  app.draftEnabled = true;
  app.draftTTL = rec.ttlHours || 72;
  app.answers = rec.answers || {};
  app.report = rec.report || '';
  app.message = rec.message || '';
  app.messageEdited = !!rec.messageEdited;
  app.includeHealth = !!rec.includeHealth;
  app.meta = rec.meta || app.meta;
  writeForm(app.answers);
  app.step = rec.step || 0;
  updateDraftStatus(rec);
  toast(`Recuperamos tu borrador guardado el ${fmtDate(rec.savedAt)}.`, 4500);
}

function updateDraftStatus(rec) {
  if (rec) app.lastDraft = rec; else rec = app.draftEnabled ? app.lastDraft : null;
  $('#st-draft').textContent = app.draftEnabled
    ? (rec ? `Sí · se borra el ${fmtDate(rec.expiresAt)}` : 'Activado')
    : 'No (solo en memoria)';
  $('#draft-toggle').checked = app.draftEnabled;
  $('#draft-toggle-inline').checked = app.draftEnabled;
  $('#draft-ttl').value = String(app.draftTTL);
  $('#volatile-hint').hidden = app.draftEnabled;
}

async function setDraftEnabled(on) {
  if (on && !app.draftEnabled) {
    const ok = confirm('Tus respuestas se guardarán temporalmente en este dispositivo.\n\n' +
      '• El almacenamiento del navegador no está cifrado automáticamente.\n' +
      '• Cualquier persona con acceso a este dispositivo podría verlas.\n' +
      `• Se borrarán automáticamente en ${app.draftTTL >= 168 ? '7 días' : app.draftTTL >= 72 ? '3 días' : '24 horas'} o cuando tú lo decidas.\n\n¿Activar el guardado?`);
    if (!ok) { updateDraftStatus(); return; }
    app.draftEnabled = true;
    await saveDraftNow();
    toast('Guardado temporal activado.');
  } else if (!on && app.draftEnabled) {
    app.draftEnabled = false;
    app.lastDraft = null;
    await idbDeleteAll();
    updateDraftStatus();
    toast('Guardado desactivado. El borrador se eliminó de este dispositivo.');
  }
  updateNav();
}
$('#draft-toggle').addEventListener('change', e => setDraftEnabled(e.target.checked));
$('#draft-toggle-inline').addEventListener('change', e => setDraftEnabled(e.target.checked));
$('#draft-ttl').addEventListener('change', e => { app.draftTTL = Number(e.target.value); saveDraftNow(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') scheduleSave.flush(); });
window.addEventListener('pagehide', () => scheduleSave.flush());

/* ---------- Eliminar todos los datos ---------- */
async function deleteEverything({ appFiles }) {
  scheduleSave.cancel();
  app.draftEnabled = false;
  app.lastDraft = null;
  await idbDeleteAll();
  try { localStorage.clear(); sessionStorage.clear(); } catch (_) { /* no usado */ }
  app.answers = {}; app.report = ''; app.message = ''; app.messageEdited = false; app.includeHealth = false;
  app.meta = { reportAt: null, whatsappOpenedAt: null };
  form.reset();
  writeForm({});
  $('#advisor-msg').value = '';
  $('#report-text').textContent = '';
  if (appFiles) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    } catch (_) { /* puede no estar disponible */ }
  }
  updateDraftStatus();
  goTo(0);
  checkOfflineReady();
}
$$('[data-open-delete]').forEach(b => b.addEventListener('click', () => {
  $('#delete-app-files').checked = false;
  $('#privacy-dialog').close();
  $('#delete-dialog').showModal();
}));
$('#confirm-delete').addEventListener('click', async () => {
  const appFiles = $('#delete-app-files').checked;
  $('#delete-dialog').close();
  await deleteEverything({ appFiles });
  toast(appFiles ? 'Datos y archivos de la app eliminados de este dispositivo.' : 'Todos tus datos se eliminaron de este dispositivo.', 4500);
});

/* ---------- Diálogos ---------- */
$$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
$$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close(); }));
const openPrivacy = () => { updateDraftStatus(); checkOfflineReady(); $('#privacy-dialog').showModal(); };
$('#privacy-btn').addEventListener('click', openPrivacy);
$$('[data-open-privacy]').forEach(b => b.addEventListener('click', openPrivacy));

/* ---------- Instalación ---------- */
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  app.installPrompt = e;
  $('#install-btn').hidden = isStandalone();
});
window.addEventListener('appinstalled', () => {
  app.installPrompt = null;
  $('#install-btn').hidden = true;
  toast('¡App instalada! Ábrela desde tu pantalla de inicio.');
});
$('#install-btn').addEventListener('click', async () => {
  if (app.installPrompt) {
    app.installPrompt.prompt();
    await app.installPrompt.userChoice.catch(() => null);
    app.installPrompt = null;
    $('#install-btn').hidden = true;
  } else if (isIOS()) {
    $('#ios-dialog').showModal();
  }
});

/* ---------- Service worker ---------- */
function askSW(msg) {
  return new Promise(res => {
    const sw = navigator.serviceWorker && (navigator.serviceWorker.controller || (app.swReg && app.swReg.active));
    if (!sw) return res(null);
    const ch = new MessageChannel();
    const t = setTimeout(() => res(null), 3000);
    ch.port1.onmessage = e => { clearTimeout(t); res(e.data); };
    sw.postMessage(msg, [ch.port2]);
  });
}
async function checkOfflineReady() {
  const el = $('#st-offline');
  $('#st-version').textContent = APP_VERSION;
  if (!('serviceWorker' in navigator)) { el.textContent = 'No compatible con este navegador'; return; }
  if (!window.isSecureContext) { el.textContent = 'No disponible: abre la app desde una dirección HTTPS'; return; }
  const st = await askSW({ type: 'STATUS' });
  if (!st) { el.textContent = 'Preparando… (mantén la conexión unos segundos)'; return; }
  el.textContent = st.ready ? `Listo ✓ (archivos guardados, v${st.version})` : `Incompleto: faltan ${st.missing.length} archivos. Abre la app con internet.`;
  return st.ready;
}
async function registerSW() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) { checkOfflineReady(); return; }
  try {
    const reg = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
    app.swReg = reg;
    const showUpdate = () => { if (reg.waiting && navigator.serviceWorker.controller) $('#update-banner').hidden = false; };
    showUpdate();
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed') showUpdate(); });
    });
    await navigator.serviceWorker.ready;
    const ready = await checkOfflineReady();
    if (ready && !sessionStorage.getItem('mpb-ready-shown')) {
      // sessionStorage solo guarda una marca técnica de esta pestaña, nunca respuestas.
      try { sessionStorage.setItem('mpb-ready-shown', '1'); } catch (_) { /* ignore */ }
      toast('La app está lista para usarse sin conexión en este dispositivo.');
    }
  } catch (_) { $('#st-offline').textContent = 'No se pudo preparar el modo sin conexión'; }
}
let reloading = false;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !app.updateRequested) return;
    reloading = true; location.reload();
  });
}
$('#update-btn').addEventListener('click', async () => {
  if (!app.draftEnabled && Object.keys(app.answers).length > 2 &&
    !confirm('Actualizar recargará la app y perderás las respuestas no guardadas. ¿Continuar?')) return;
  await saveDraftNow();
  app.updateRequested = true;
  app.swReg && app.swReg.waiting && app.swReg.waiting.postMessage({ type: 'SKIP_WAITING' });
});

/* ---------- Inicio ---------- */
(async function init() {
  // Limpia cualquier parámetro o fragmento que alguien haya añadido al enlace.
  if (location.search || location.hash) history.replaceState(null, '', location.pathname);
  buildScales();
  setOnline(navigator.onLine);
  await loadDraft();
  updateDraftStatus();
  goTo(app.step, { focus: false });
  if (isIOS() && !isStandalone()) $('#install-btn').hidden = false;
  registerSW();
  if (navigator.onLine) probeConnection();
})();

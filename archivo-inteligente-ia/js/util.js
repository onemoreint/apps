/* Archivo Inteligente IA — utilidades comunes (sin dependencias)
 * Todo el HTML dinámico se construye con la plantilla `html`, que escapa
 * automáticamente cada valor interpolado para evitar inyección de contenido. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});

  class Raw { constructor(v) { this.v = v; } toString() { return this.v; } }
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  const esc = (s) => String(s).replace(/[&<>"'`]/g, (c) => ESC[c]);
  function fmt(v) {
    if (v === null || v === undefined || v === false) return '';
    if (v instanceof Raw) return v.v;
    if (Array.isArray(v)) return v.map(fmt).join('');
    return esc(v);
  }
  /** Plantilla segura: escapa interpolaciones salvo que sean Raw (otra plantilla html). */
  function html(strings, ...vals) {
    let o = '';
    for (let i = 0; i < strings.length; i++) { o += strings[i]; if (i < vals.length) o += fmt(vals[i]); }
    return new Raw(o);
  }

  /** Limpia texto de entrada: quita caracteres de control y limita longitud. */
  function clean(s, max = 500) {
    return String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\s+/g, (m) => (m.includes('\n') ? m : ' ')).trim().slice(0, max);
  }
  function uid(p = 'id') {
    const r = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    return p + '-' + r;
  }
  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const todayISO = () => toISO(new Date());
  const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(new Date(s + 'T00:00:00'));
  function fmtDate(iso) { if (!iso) return '—'; const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
  function fmtDateTime(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('es-CO') + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function daysBetween(a, b) { return Math.floor((new Date(String(b).slice(0, 10) + 'T00:00:00') - new Date(String(a).slice(0, 10) + 'T00:00:00')) / 86400000); }
  function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d); }
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const num = (n) => nf.format(n);
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* CSV con separador ';' (Excel en configuración regional Colombia) y protección
   * contra inyección de fórmulas (=, +, -, @). */
  function csvCell(v) {
    let s = v === null || v === undefined ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[";\n\r,]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  const toCSV = (headers, rows) => '﻿' + [headers.map(csvCell).join(';')].concat(rows.map((r) => r.map(csvCell).join(';'))).join('\r\n');
  function download(filename, content, type = 'text/plain;charset=utf-8') {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function debounce(fn, ms = 180) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const icon = (name, cls = '') => html`<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

  function toast(msg, type = 'ok') {
    const box = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.setAttribute('role', 'status');
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  /* Modal accesible reutilizable */
  let lastFocus = null;
  function openModal(title, bodyHtml, opts = {}) {
    const m = $('#modal');
    lastFocus = document.activeElement;
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = fmt(bodyHtml);
    $('#modal-foot').innerHTML = fmt(opts.foot || '');
    m.querySelector('.modal-card').classList.toggle('wide', !!opts.wide);
    m.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(() => { const f = m.querySelector('[autofocus], input:not([type=hidden]), select, textarea, button.btn'); (f || m.querySelector('.modal-close')).focus(); }, 30);
    return m;
  }
  function closeModal() {
    const m = $('#modal');
    if (m.hidden) return;
    m.hidden = true;
    document.body.classList.remove('no-scroll');
    $('#modal-body').innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  /** Diálogo de confirmación con nota opcional. Devuelve {ok, nota}. */
  function confirmDialog(title, message, { notaLabel = '', notaRequired = false, okText = 'Confirmar', danger = false } = {}) {
    return new Promise((resolve) => {
      openModal(title, html`<p class="muted">${message}</p>${notaLabel ? html`<label class="field"><span>${notaLabel}${notaRequired ? ' *' : ''}</span><textarea id="cd-nota" rows="3" maxlength="400"></textarea></label>` : ''}<p class="form-error" id="cd-err" hidden></p>`,
        { foot: html`<button class="btn ghost" data-cd="no">Cancelar</button><button class="btn ${danger ? 'danger' : 'primary'}" data-cd="si">${okText}</button>` });
      const foot = $('#modal-foot');
      const handler = (e) => {
        const b = e.target.closest('[data-cd]'); if (!b) return;
        if (b.dataset.cd === 'si') {
          const nota = clean(($('#cd-nota') || {}).value || '', 400);
          if (notaRequired && !nota) { const er = $('#cd-err'); er.textContent = 'Escribe una observación para continuar.'; er.hidden = false; return; }
          AI._onModalDismiss = null;
          foot.removeEventListener('click', handler); closeModal(); resolve({ ok: true, nota });
        } else { AI._onModalDismiss = null; foot.removeEventListener('click', handler); closeModal(); resolve({ ok: false }); }
      };
      foot.addEventListener('click', handler);
      AI._onModalDismiss = () => { foot.removeEventListener('click', handler); resolve({ ok: false }); };
    });
  }

  Object.assign(AI, { html, Raw, esc, fmt, clean, uid, toISO, todayISO, isISODate, fmtDate, fmtDateTime, daysBetween, addDays, MESES, num, norm, toCSV, download, debounce, $, $$, icon, toast, openModal, closeModal, confirmDialog });
})();

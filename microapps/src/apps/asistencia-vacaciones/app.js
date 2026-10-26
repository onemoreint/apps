(function(){
const {$, $$, esc, uid, num, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, mesNombre, fechaCorta, fechaLarga, csv, imprimirDoc, esFestivo} = MA;

const MARCAS = [
  {k:'P', n:'Presente', c:'#1E8E5A'}, {k:'F', n:'Falta', c:'#C93A2C'}, {k:'R', n:'Retardo', c:'#D08A12'}, {k:'L', n:'Permiso', c:'#0E9384'},
  {k:'I', n:'Incapacidad', c:'#8A4FC7'}, {k:'V', n:'Vacaciones', c:'var(--accent)'}, {k:'', n:'Borrar', c:'var(--canvas)'}];
let S = store.get('estado', null);
if (!S){
  const a = uid(), b = uid(), c = uid();
  S = {pais:'CO', desc:0, emps:[{id:a, n:'Ana María Restrepo', cargo:'Auxiliar de ventas', ingreso:'2024-03-04', vacIni:15},
    {id:b, n:'Julián Andrés Mejía', cargo:'Bodeguero', ingreso:'2025-08-19', vacIni:0}, {id:c, n:'Carolina Vélez', cargo:'Administradora', ingreso:'2022-01-10', vacIni:45}], marks:{}};
  // ejemplo: días hábiles transcurridos del mes como presentes, con algunas novedades
  const mk = monthKey(), hoy = +today().slice(8,10);
  [a,b,c].forEach((id,i) => { S.marks[id] = {}; for (let d = 1; d < hoy; d++){ const f = mk+'-'+String(d).padStart(2,'0'); if (habil(f)) S.marks[id][f] = 'P'; } });
  const set = (id, d, k) => { const f = mk+'-'+String(d).padStart(2,'0'); if (S.marks[id][f]) S.marks[id][f] = k; };
  set(a, 7, 'R'); set(b, 9, 'F'); set(b, 15, 'I'); set(b, 16, 'I'); set(c, 21, 'V'); set(c, 22, 'V'); set(c, 23, 'V');
}
function habil(f){ const d = new Date(f+'T12:00'), w = d.getDay(); const S2 = S || {desc:0, pais:'CO'}; if (w === 0 || (S2.desc === 6 && w === 6)) return false; return !esFestivo(S2.pais, f); }
const save = () => store.set('estado', S);
const isoL = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
let mes = monthKey(), marca = 'P';
const diasMes = k => { const [y,m] = k.split('-').map(Number); return Array.from({length:new Date(y,m,0).getDate()}, (_,i) => k+'-'+String(i+1).padStart(2,'0')); };
const mk = id => (S.marks[id] = S.marks[id] || {});

/* ---------- País y mes ---------- */
$$('#pais button').forEach(b => b.onclick = () => { S.pais = b.dataset.v; save(); renderAll(); });
$('#mes').value = mes; $('#mes').onchange = e => { mes = e.target.value || monthKey(); renderAll(); };
$('#c-desc').onchange = e => { S.desc = +e.target.value; save(); renderAll(); };

/* ---------- Calendario ---------- */
$('#marcas').innerHTML = MARCAS.map(m => `<button type="button" role="radio" data-k="${m.k}"><i style="background:${m.c};${m.k?'':'border:1px solid var(--line-2)'}"></i>${m.n}</button>`).join('');
$$('#marcas button').forEach(b => b.onclick = () => { marca = b.dataset.k; renderMarcas(); });
function renderMarcas(){ $$('#marcas button').forEach(b => b.setAttribute('aria-checked', b.dataset.k === marca)); }
function renderCal(){
  const ds = diasMes(mes);
  if (!S.emps.length){ $('#cal').innerHTML = `<tr><td><div class="empty"><strong>Sin empleados</strong>Agrégalos en la pestaña «Empleados».</div></td></tr>`; return; }
  const cls = f => { const w = new Date(f+'T12:00').getDay(); return esFestivo(S.pais, f) ? 'fe' : (w === 0 || (S.desc === 6 && w === 6)) ? 'we' : ''; };
  $('#cal').innerHTML = `<thead><tr><th class="nm">Empleado</th>${ds.map(f => { const d = new Date(f+'T12:00'); const fe = esFestivo(S.pais, f);
      return `<th class="${cls(f)}" ${fe?`title="${esc(fe)}"`:''}>${'DLMMJVS'[d.getDay()]}<br>${d.getDate()}</th>`; }).join('')}<th>P</th><th>F</th><th>R</th><th>V</th></tr></thead>
    <tbody>${S.emps.map(e => { const M = mk(e.id); const c = conteo(e, mes);
      return `<tr data-e="${e.id}"><td class="nm">${esc(e.n)}</td>${ds.map(f => `<td class="d ${cls(f)} ${M[f]?'m-'+M[f]:''}" data-f="${f}" title="${fechaCorta(f)}${M[f]?': '+MARCAS.find(x=>x.k===M[f]).n:''}">${M[f]||''}</td>`).join('')}
      <td class="tot">${c.P}</td><td class="tot ${c.F?'neg':''}">${c.F}</td><td class="tot">${c.R}</td><td class="tot">${c.V}</td></tr>`; }).join('')}</tbody>`;
  const fs = ds.map(f => esFestivo(S.pais, f) ? `${new Date(f+'T12:00').getDate()} (${esFestivo(S.pais, f)})` : '').filter(Boolean);
  $('#cal-nota').textContent = `Días rayados: descanso o festivo. ${fs.length?'Festivos de '+mesNombre(mes).toLowerCase()+' en '+(S.pais==='CO'?'Colombia':'Venezuela')+': '+fs.join(', ')+'.':'Este mes no hay festivos.'} Retardos cuentan como asistencia.`;
}
let pintando = false, tocados = new Set();
function pintar(td){ if (!td || !td.dataset.f) return; const id = td.closest('tr').dataset.e, f = td.dataset.f, key = id+f; if (tocados.has(key)) return; tocados.add(key);
  const M = mk(id); if (marca) M[f] = marca; else delete M[f];
  td.className = td.className.replace(/\bm-\w\b/g, '').trim() + (marca ? ' m-'+marca : ''); td.textContent = marca; }
const cal = $('#cal');
cal.addEventListener('pointerdown', e => { const td = e.target.closest('td.d'); if (!td) return; e.preventDefault(); pintando = true; tocados.clear(); pintar(td); });
cal.addEventListener('pointermove', e => { if (!pintando) return; const el = document.elementFromPoint(e.clientX, e.clientY); pintar(el && el.closest && el.closest('td.d')); });
window.addEventListener('pointerup', () => { if (!pintando) return; pintando = false; save(); renderCal(); renderVac(); renderRes(); });
$('#btn-todos').onclick = () => { let n = 0; const hoy = today();
  S.emps.forEach(e => { const M = mk(e.id); diasMes(mes).forEach(f => { if (f <= hoy && habil(f) && !M[f] && f >= (e.ingreso||'')){ M[f] = 'P'; n++; } }); });
  save(); renderAll(); toast(n ? n+' días marcados como presentes' : 'No había días hábiles sin marcar hasta hoy'); };

function conteo(e, k){ const M = mk(e.id), c = {P:0,F:0,R:0,L:0,I:0,V:0}; Object.entries(M).forEach(([f,v]) => { if (f.startsWith(k) && c[v] !== undefined) c[v]++; });
  c.habiles = diasMes(k).filter(f => habil(f) && f >= (e.ingreso||'')).length; return c; }

/* ---------- Vacaciones ---------- */
function anios(ini, fin){ const [y1,m1,d1] = ini.split('-').map(Number), [y2,m2,d2] = fin.split('-').map(Number); let a = y2 - y1; if (m2 < m1 || (m2 === m1 && d2 < d1)) a--; return Math.max(0, a); }
function meses(ini, fin){ const [y1,m1,d1] = ini.split('-').map(Number), [y2,m2,d2] = fin.split('-').map(Number); let m = (y2-y1)*12 + (m2-m1); if (d2 < d1) m--; return Math.max(0, m); }
function dias360(a, b){ let [y1,m1,d1] = a.split('-').map(Number), [y2,m2,d2] = b.split('-').map(Number); d1 = Math.min(d1,30); d2 = Math.min(d2,30); return Math.max(0, (y2-y1)*360 + (m2-m1)*30 + (d2-d1) + 1); }
function vac(e){
  const hoy = today(); if (!e.ingreso || e.ingreso > hoy) return {der:0, tom:+e.vacIni||0, saldo:0, regla:''};
  let der, regla;
  if (S.pais === 'CO'){ der = dias360(e.ingreso, hoy) / 360 * 15; regla = '15 días hábiles por año de servicio'; }
  else { const a = anios(e.ingreso, hoy), mm = meses(e.ingreso, hoy) % 12; der = 0; for (let k = 1; k <= a; k++) der += Math.min(30, 15 + (k - 1)); der += Math.min(30, 15 + a) * mm / 12;
    regla = `15 días hábiles más 1 por año, hasta 30. Este año le corresponden ${Math.min(30, 15 + a)}`; }
  const marcadas = Object.values(mk(e.id)).filter(v => v === 'V').length;
  const tom = (+e.vacIni||0) + marcadas;
  const [y,m,d] = e.ingreso.split('-').map(Number); let prox = new Date(+hoy.slice(0,4), m-1, d); if (isoL(prox) <= hoy) prox = new Date(+hoy.slice(0,4)+1, m-1, d);
  return {der, tom, marcadas, saldo: der - tom, regla, prox: isoL(prox), a: anios(e.ingreso, hoy)};
}
function renderVac(){
  $('#vac-cap').textContent = S.pais === 'CO' ? 'Colombia: 15 días hábiles por año de servicio, proporcional al tiempo trabajado (art. 186 del Código Sustantivo del Trabajo).'
    : 'Venezuela: 15 días hábiles el primer año y 1 día adicional por cada año, hasta 15 adicionales (art. 190 LOTTT). Incluye la fracción del año en curso.';
  if (!S.emps.length){ $('#vacaciones').innerHTML = `<div class="empty"><strong>Sin empleados</strong>Agrégalos en «Empleados».</div>`; return; }
  $('#vacaciones').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Empleado</th><th>Ingreso</th><th class="r">Días causados</th><th class="r">Días tomados</th><th class="r">Saldo</th><th>Próximo aniversario</th><th class="no-print"></th></tr></thead><tbody>
    ${S.emps.map(e => { const v = vac(e); return `<tr><td><b>${esc(e.n)}</b><div class="small muted">${esc(e.cargo||'')}</div></td><td>${e.ingreso?fechaCorta(e.ingreso):''}<div class="small muted">${v.a!==undefined?v.a+(v.a===1?' año':' años'):''}</div></td>
      <td class="r">${fmt(v.der,1)}</td><td class="r">${fmt(v.tom,0)}${v.marcadas?`<div class="small muted">${v.marcadas} en calendario</div>`:''}</td>
      <td class="r"><span class="pill ${v.saldo>=30?'bad':v.saldo>=15?'mid':v.saldo<0?'bad':'ok'}">${fmt(v.saldo,1)} días</span></td><td>${v.prox?fechaCorta(v.prox):''}</td>
      <td class="r no-print"><button class="btn ghost sm" data-prog="${e.id}">Programar</button></td></tr>`; }).join('')}</tbody></table></div>
    <p class="hint" style="margin-top:8px">Saldo en rojo: más de 30 días acumulados o días tomados de más. Los días marcados con «Vacaciones» en el calendario se descuentan solos.</p>`;
  $$('#vacaciones [data-prog]').forEach(b => b.onclick = () => programar(b.dataset.prog));
}
function programar(eid){
  if (!S.emps.length){ toast('Agrega empleados primero.', true); return; }
  let dias = 15;
  const plan = (dl) => { const ini = $('#p-ini',dl).value; if (!ini || !dias) return null; const fechas = []; let cur = new Date(ini+'T12:00'), cal = 0;
        while (fechas.length < dias && cal < 400){ const f = isoL(cur); if (habil(f)) fechas.push(f); cur.setDate(cur.getDate()+1); cal++; }
        let reg = new Date(cur); while (!habil(isoL(reg))) reg.setDate(reg.getDate()+1);
        return {fechas, fin:fechas[fechas.length-1], regreso:isoL(reg), calendario: Math.round((new Date(fechas[fechas.length-1]+'T12:00') - new Date(fechas[0]+'T12:00'))/864e5)+1}; };
  dialog({title:'Programar vacaciones', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Empleado</span><select class="input" id="p-e">${S.emps.map(e => `<option value="${e.id}" ${e.id===eid?'selected':''}>${esc(e.n)}</option>`).join('')}</select></label>
    <label class="field"><span>Primer día de vacaciones</span><input class="input" type="date" id="p-ini" value="${today()}"></label>
    <label class="field"><span>Días hábiles</span><input class="input num" id="p-dias" inputmode="numeric"></label></div>
    <div class="ticket" style="margin-top:16px"><div class="ticket-lines" style="border:0;padding:0" id="p-res"></div></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Programar y marcar', cls:'primary', onClick:(d)=>{ const r = plan(d); if (!r) return false;
      const M = mk($('#p-e',d).value); r.fechas.forEach(f => M[f] = 'V'); save(); renderAll(); toast(`${r.fechas.length} días de vacaciones marcados. Regresa el ${fechaLarga(r.regreso)}.`);
      const e = S.emps.find(x => x.id === $('#p-e',d).value); constancia(e, r); }}],
    onOpen: d => { const upd = () => { const r = plan(d); const e = S.emps.find(x => x.id === $('#p-e',d).value), v = vac(e);
        $('#p-res',d).innerHTML = r ? `<div class="ticket-line"><span>Sale el</span><b>${fechaLarga(r.fechas[0])}</b></div><div class="ticket-line"><span>Último día de vacaciones</span><b>${fechaLarga(r.fin)}</b></div>
          <div class="ticket-line"><span>Regresa a trabajar el</span><b>${fechaLarga(r.regreso)}</b></div><div class="ticket-line"><span>Días calendario</span><b>${r.calendario}</b></div>
          <div class="ticket-line total"><span>Saldo después</span><b class="${v.saldo - dias < 0 ? 'neg' : ''}">${fmt(v.saldo - dias,1)} días</b></div>` : '<p class="muted small">Elige fecha y días.</p>'; };
      bindNum($('#p-dias',d), dias, v => { dias = Math.max(0, Math.round(v)); upd(); }, 0); $('#p-ini',d).onchange = upd; $('#p-e',d).onchange = upd; upd();
upd(); }});
}
function constancia(e, r){
  imprimirDoc('Constancia de vacaciones', `<p>Se deja constancia de que <b>${esc(e.n)}</b>${e.cargo?', '+esc(e.cargo):''}, disfrutará de <b>${r.fechas.length} días hábiles</b> de vacaciones entre el ${fechaLarga(r.fechas[0])} y el ${fechaLarga(r.fin)}, y se reintegra a sus labores el <b>${fechaLarga(r.regreso)}</b>.</p>
    <p>Saldo de vacaciones después de este periodo: ${fmt(vac(e).saldo,1)} días.</p><div class="sig"><div>Firma del empleador</div><div>Firma del trabajador</div></div>`, S.pais === 'CO' ? 'Colombia' : 'Venezuela');
}
$('#btn-prog').onclick = () => programar(S.emps[0] && S.emps[0].id);

/* ---------- Resumen ---------- */
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
function datosRes(){ return S.emps.map(e => { const c = conteo(e, mes); const asist = c.P + c.R; const base = c.habiles - c.V - c.I - c.L; return {e, c, asist, pctA: base > 0 ? Math.min(100, asist / base * 100) : null}; }); }
function tablaRes(D){ return `<table class="t"><thead><tr><th>Empleado</th><th class="r">Días hábiles</th><th class="r">Presente</th><th class="r">Retardos</th><th class="r">Faltas</th><th class="r">Permisos</th><th class="r">Incapacidad</th><th class="r">Vacaciones</th><th class="r">Asistencia</th></tr></thead><tbody>
  ${D.map(x => `<tr><td><b>${esc(x.e.n)}</b></td><td class="r">${x.c.habiles}</td><td class="r">${x.c.P}</td><td class="r">${x.c.R}</td><td class="r ${x.c.F?'neg':''}">${x.c.F}</td><td class="r">${x.c.L}</td><td class="r">${x.c.I}</td><td class="r">${x.c.V}</td><td class="r">${x.pctA===null?'-':`<span class="pill ${x.pctA>=95?'ok':x.pctA>=85?'mid':'bad'}">${pct(x.pctA,0)}</span>`}</td></tr>`).join('')}</tbody></table>`; }
function renderRes(){
  const D = datosRes(), s = k => D.reduce((a,x) => a + x.c[k], 0);
  const vals = D.filter(x => x.pctA !== null); const prom = vals.length ? vals.reduce((a,x) => a + x.pctA, 0) / vals.length : 0;
  $('#res-kpis').innerHTML = `<div class="kpi accent"><span>Asistencia promedio</span><strong>${vals.length?pct(prom,0):'-'}</strong><small>${mesNombre(mes)}</small></div>
    <div class="kpi"><span>Faltas</span><strong class="${s('F')?'neg':''}">${s('F')}</strong><small>Sin justificar</small></div><div class="kpi"><span>Retardos</span><strong>${s('R')}</strong></div>
    <div class="kpi"><span>Incapacidades y permisos</span><strong>${s('I') + s('L')}</strong><small>días</small></div>`;
  $('#res-cap').textContent = `${mesNombre(mes)}. Asistencia = días presentes y con retardo frente a días hábiles, sin contar vacaciones, permisos ni incapacidades.`;
  $('#resumen').innerHTML = S.emps.length ? `<div class="table-wrap">${tablaRes(D)}</div>` : `<div class="empty"><strong>Sin empleados</strong>Agrégalos en «Empleados».</div>`;
}
$('#btn-print').onclick = () => imprimirDoc('Informe de asistencia', tablaRes(datosRes()), mesNombre(mes));
$('#btn-csv').onclick = () => { csv('asistencia-'+mes, [['Empleado','Días hábiles','Presente','Retardos','Faltas','Permisos','Incapacidad','Vacaciones','% asistencia', ...diasMes(mes)],
  ...datosRes().map(x => [x.e.n, x.c.habiles, x.c.P, x.c.R, x.c.F, x.c.L, x.c.I, x.c.V, x.pctA===null?'':fmt(x.pctA,1), ...diasMes(mes).map(f => mk(x.e.id)[f]||'')])]); };

/* ---------- Empleados ---------- */
$('#btn-emp').innerHTML = I.plus + 'Agregar empleado';
function renderEmp(){
  $('#c-desc').value = String(S.desc);
  if (!S.emps.length){ $('#empleados').innerHTML = `<div class="empty"><strong>Sin empleados</strong>Agrega el primero.</div>`; return; }
  $('#empleados').innerHTML = `<div class="table-wrap"><table class="t t-edit"><thead><tr><th>Nombre</th><th>Cargo</th><th>Fecha de ingreso</th><th class="r">Días ya tomados</th><th></th></tr></thead><tbody>
    ${S.emps.map(e => `<tr data-id="${e.id}"><td><input class="input" data-k="n" value="${esc(e.n)}" style="min-width:160px" aria-label="Nombre"></td><td><input class="input" data-k="cargo" value="${esc(e.cargo||'')}" style="min-width:120px" aria-label="Cargo"></td>
      <td><input class="input" type="date" data-k="ingreso" value="${e.ingreso||''}" aria-label="Ingreso"></td><td><input class="input num" data-k="vacIni" inputmode="numeric" style="max-width:90px;margin-left:auto" aria-label="Días ya tomados"></td>
      <td><button class="btn ghost sm icon" data-del aria-label="Quitar">${I.trash}</button></td></tr>`).join('')}</tbody></table></div>`;
  $$('#empleados tr[data-id]').forEach(tr => { const e = S.emps.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-k=n]').oninput = ev => { e.n = ev.target.value; save(); };
    tr.querySelector('[data-k=cargo]').oninput = ev => { e.cargo = ev.target.value; save(); };
    tr.querySelector('[data-k=ingreso]').onchange = ev => { e.ingreso = ev.target.value; save(); };
    bindNum(tr.querySelector('[data-k=vacIni]'), e.vacIni||0, v => { e.vacIni = v; save(); }, 0);
    tr.querySelector('[data-del]').onclick = async () => { if (!(await confirmar('¿Quitar a '+(e.n||'este empleado')+' y su registro de asistencia?'))) return; S.emps = S.emps.filter(x => x !== e); delete S.marks[e.id]; save(); renderAll(); }; });
}
$('#btn-emp').onclick = () => { S.emps.push({id:uid(), n:'', cargo:'', ingreso:today(), vacIni:0}); save(); renderEmp(); const r = $$('#empleados tr[data-id]'); r[r.length-1].querySelector('input').focus(); };

function renderAll(){ $$('#pais button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.pais)); renderMarcas(); renderCal(); renderVac(); renderRes(); renderEmp(); }
tabs(id => { $('#mes-w').hidden = id === 'vac' || id === 'emp'; renderAll(); });
renderAll(); save();
})();

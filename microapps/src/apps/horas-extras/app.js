(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, tabs, I, today, monthKey, fechaCorta, fechaLarga, csv, negocio, imprimirDoc, esFestivo} = MA;

/* Categorías: o = ordinaria (dentro de la jornada), x = extra; n = nocturna; f = dominical o festiva */
const CATS = {
  CO:[
    {k:'RN', s:'Nocturno',    n:'Recargo nocturno',                         o:1, nn:1, f:0, p:35},
    {k:'RDF', s:'Dominical',   n:'Recargo dominical o festivo diurno',       o:1, nn:0, f:1, p:90},
    {k:'RNDF', s:'Dominical nocturno',  n:'Recargo dominical o festivo nocturno',     o:1, nn:1, f:1, p:125},
    {k:'HED', s:'Extra diurna',   n:'Hora extra diurna',                        o:0, nn:0, f:0, p:125},
    {k:'HEN', s:'Extra nocturna',   n:'Hora extra nocturna',                      o:0, nn:1, f:0, p:175},
    {k:'HEDDF', s:'Extra dominical diurna', n:'Hora extra dominical o festiva diurna',    o:0, nn:0, f:1, p:215},
    {k:'HENDF', s:'Extra dominical nocturna', n:'Hora extra dominical o festiva nocturna',  o:0, nn:1, f:1, p:265}],
  VE:[
    {k:'RN', s:'Nocturno',    n:'Recargo nocturno',                          o:1, nn:1, f:0, p:30},
    {k:'FER', s:'Feriado',   n:'Hora en feriado o descanso',                o:1, nn:0, f:1, p:150},
    {k:'FERN', s:'Feriado nocturno',  n:'Hora nocturna en feriado o descanso',       o:1, nn:1, f:1, p:180},
    {k:'HED', s:'Extra diurna',   n:'Hora extra diurna',                         o:0, nn:0, f:0, p:150},
    {k:'HEN', s:'Extra nocturna',   n:'Hora extra nocturna',                       o:0, nn:1, f:0, p:195},
    {k:'HEFD', s:'Extra en feriado',  n:'Hora extra diurna en feriado o descanso',   o:0, nn:0, f:1, p:225},
    {k:'HEFN', s:'Extra nocturna en feriado',  n:'Hora extra nocturna en feriado o descanso', o:0, nn:1, f:1, p:292.5}]
};
const DEF = {
  CO:{salario:1750905, div:210, hdia:7, nini:'19:00', nfin:'06:00', desc:0, rec:Object.fromEntries(CATS.CO.map(c => [c.k, c.p]))},
  VE:{salario:130, div:240, hdia:8, nini:'19:00', nfin:'05:00', desc:0, rec:Object.fromEntries(CATS.VE.map(c => [c.k, c.p]))}
};
const NOTA = {
  CO:'Colombia 2026: 42 horas semanales desde el 15 de julio (210 horas al mes, 7 por día en semana de 6 días), trabajo nocturno de 7:00 p. m. a 6:00 a. m. y recargo dominical o festivo del 90% desde el 1 de julio (Leyes 2101 de 2021 y 2466 de 2025). Máximo 2 horas extra al día y 12 a la semana.',
  VE:'Venezuela (LOTTT): jornada diurna de 8 horas y 40 semanales, nocturna de 7:00 p. m. a 5:00 a. m., horas extra con 50% de recargo, bono nocturno de 30% y feriado o descanso trabajado con 50% de recargo además del día pagado. Máximo 10 horas extra a la semana y 100 al año.'
};

let S = store.get('estado', null);
if (!S){
  const mk = monthKey();
  S = {pais:'CO', nombre:'Julián Andrés Mejía', CO:JSON.parse(JSON.stringify(DEF.CO)), VE:JSON.parse(JSON.stringify(DEF.VE)), turnos:[
    {id:uid(), fecha:mk+'-06', ent:'07:00', sal:'19:00', desc:60, nota:'Inventario'},
    {id:uid(), fecha:mk+'-11', ent:'08:00', sal:'16:00', desc:60, nota:'Turno de domingo'},
    {id:uid(), fecha:mk+'-14', ent:'14:00', sal:'23:30', desc:30, nota:''},
    {id:uid(), fecha:mk+'-20', ent:'22:00', sal:'06:00', desc:0, nota:'Turno de noche'}]};
}
const save = () => store.set('estado', S);
const C = () => S[S.pais];
const MON = () => S.pais === 'CO' ? 'COP' : 'VES';
const m$ = v => money(v, MON());
const mk = monthKey(), [yy, mm] = mk.split('-').map(Number);
let desde = mk + '-01', hasta = mk + '-' + String(new Date(yy, mm, 0).getDate()).padStart(2,'0');
const toMin = t => { const [h,m] = (t||'0:0').split(':').map(Number); return h*60 + m; };
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const hrs = m => fmt(m/60, 2);

/* ---------- Motor: clasifica minuto a minuto ---------- */
function clasificar(t){
  const c = C(), ent = toMin(t.ent); let sal = toMin(t.sal); if (sal <= ent) sal += 1440;
  const total = sal - ent, desc = Math.min(Math.max(0, +t.desc||0), total);
  const bIni = ent + Math.floor((total - desc) / 2), bFin = bIni + desc; // descanso a mitad del turno
  const ni = toMin(c.nini), nf = toMin(c.nfin), ord = (+c.hdia||0) * 60;
  const [y,m,d] = t.fecha.split('-').map(Number);
  const out = {}; CATS[S.pais].forEach(x => out[x.k] = 0); out.ORD = 0; let trab = 0;
  for (let mi = ent; mi < sal; mi++){
    if (mi >= bIni && mi < bFin) continue;
    trab++;
    const dd = new Date(y, m-1, d + Math.floor(mi / 1440)), hm = mi % 1440;
    const noct = ni > nf ? (hm >= ni || hm < nf) : (hm >= ni && hm < nf);
    const fecha = iso(dd), fest = (+c.desc >= 0 && dd.getDay() === +c.desc) || !!esFestivo(S.pais, fecha);
    const extra = trab > ord;
    const cat = CATS[S.pais].find(x => x.o === (extra?0:1) && x.nn === (noct?1:0) && x.f === (fest?1:0));
    if (cat) out[cat.k]++; else out.ORD++;
  }
  return {min:out, trab, total, desc, cruza: toMin(t.sal) <= ent};
}
function liquidar(){
  const c = C(), hora = (+c.salario||0) / (+c.div||1);
  const ts = S.turnos.filter(t => t.fecha >= desde && t.fecha <= hasta).sort((a,b) => a.fecha.localeCompare(b.fecha) || a.ent.localeCompare(b.ent));
  const filas = ts.map(t => ({t, r:clasificar(t)}));
  const tot = {}; CATS[S.pais].forEach(x => tot[x.k] = filas.reduce((a,f) => a + f.r.min[x.k], 0));
  tot.ORD = filas.reduce((a,f) => a + f.r.min.ORD, 0);
  const det = CATS[S.pais].map(x => ({...x, p:+c.rec[x.k], min:tot[x.k], v: tot[x.k] / 60 * hora * (+c.rec[x.k]) / 100}));
  const valor = det.reduce((a,x) => a + x.v, 0);
  const extrasMin = det.filter(x => !x.o).reduce((a,x) => a + x.min, 0);
  // alertas de límites
  const alertas = [];
  if (S.pais === 'CO'){
    filas.forEach(f => { const ex = CATS.CO.filter(x => !x.o).reduce((a,x) => a + f.r.min[x.k], 0); if (ex > 120) alertas.push(`${fechaCorta(f.t.fecha)}: ${hrs(ex)} horas extra en el día (el máximo es 2).`); });
    const sem = {}; filas.forEach(f => { const d = new Date(f.t.fecha+'T12:00'), lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay()+6)%7)); const k = iso(lun);
      sem[k] = (sem[k]||0) + CATS.CO.filter(x => !x.o).reduce((a,x) => a + f.r.min[x.k], 0); });
    Object.entries(sem).forEach(([k,v]) => { if (v > 720) alertas.push(`Semana del ${fechaCorta(k)}: ${hrs(v)} horas extra (el máximo es 12).`); });
  } else {
    const sem = {}; filas.forEach(f => { const d = new Date(f.t.fecha+'T12:00'), lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay()+6)%7)); const k = iso(lun);
      sem[k] = (sem[k]||0) + CATS.VE.filter(x => !x.o).reduce((a,x) => a + f.r.min[x.k], 0); });
    Object.entries(sem).forEach(([k,v]) => { if (v > 600) alertas.push(`Semana del ${fechaCorta(k)}: ${hrs(v)} horas extra (el máximo es 10).`); });
  }
  return {hora, filas, det, valor, extrasMin, trab: filas.reduce((a,f) => a + f.r.trab, 0), alertas};
}

/* ---------- Encabezado ---------- */
$$('#pais button').forEach(b => b.onclick = () => { S.pais = b.dataset.v; save(); renderAll(); });
$('#desde').value = desde; $('#hasta').value = hasta;
$('#desde').onchange = e => { desde = e.target.value || desde; renderAll(); };
$('#hasta').onchange = e => { hasta = e.target.value || hasta; renderAll(); };

/* ---------- Turnos ---------- */
$('#t-fecha').value = today();
$('#f-turno').onsubmit = e => { e.preventDefault();
  const t = {id:uid(), fecha:$('#t-fecha').value || today(), ent:$('#t-ent').value, sal:$('#t-sal').value, desc:num($('#t-desc').value), nota:$('#t-nota').value.trim()};
  if (!t.ent || !t.sal){ toast('Escribe la hora de entrada y de salida.', true); return; }
  if (t.ent === t.sal){ toast('La entrada y la salida no pueden ser iguales.', true); return; }
  S.turnos.push(t); save(); $('#t-nota').value = '';
  if (t.fecha < desde || t.fecha > hasta){ desde = t.fecha.slice(0,8)+'01'; const [y,m] = t.fecha.split('-').map(Number); hasta = t.fecha.slice(0,8)+String(new Date(y,m,0).getDate()).padStart(2,'0'); $('#desde').value = desde; $('#hasta').value = hasta; }
  const [y,m,d] = t.fecha.split('-').map(Number); const sig = new Date(y, m-1, d+1); $('#t-fecha').value = iso(sig);
  toast('Turno agregado'); renderAll(); };
function etiquetaDia(fecha){ const f = esFestivo(S.pais, fecha); const d = new Date(fecha+'T12:00'); const dn = d.toLocaleDateString('es-CO',{weekday:'short'}).replace('.','');
  return `${dn} ${fechaCorta(fecha)}${f?` <span class="pill acc" title="${esc(f)}">Festivo</span>`:(d.getDay()===+C().desc?' <span class="pill">Descanso</span>':'')}`; }
function renderTurnos(){
  const L = liquidar();
  $('#turnos-cap').textContent = `${L.filas.length} turnos, ${hrs(L.trab)} horas trabajadas. ${S.nombre?'Trabajador: '+S.nombre+'.':''}`;
  if (!L.filas.length){ $('#turnos').innerHTML = `<div class="empty"><strong>Sin turnos en el periodo</strong>Registra la entrada y salida de cada día trabajado.</div>`; }
  else $('#turnos').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Día</th><th>Horario</th><th class="r">Trabajadas</th><th class="r">Extra</th><th>Recargos</th><th></th></tr></thead><tbody>
    ${L.filas.map(({t,r}) => { const ex = CATS[S.pais].filter(x => !x.o).reduce((a,x) => a + r.min[x.k], 0); const rec = CATS[S.pais].filter(x => r.min[x.k]).map(x => `${x.s} ${hrs(r.min[x.k])} h`).join('<br>');
      return `<tr><td>${etiquetaDia(t.fecha)}${t.nota?`<div class="small muted">${esc(t.nota)}</div>`:''}</td><td>${t.ent} a ${t.sal}${r.cruza?' <span class="small muted">(día sig.)</span>':''}${r.desc?`<div class="small muted">Descanso ${r.desc} min</div>`:''}</td>
      <td class="r">${hrs(r.trab)} h</td><td class="r">${ex?`<b>${hrs(ex)} h</b>`:'<span class="muted">0</span>'}</td><td class="small">${rec||'<span class="muted">Ordinario diurno</span>'}</td>
      <td class="r"><button class="btn ghost sm icon" data-del="${t.id}" aria-label="Eliminar turno">${I.trash}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  $$('#turnos [data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este turno?'))) return; S.turnos = S.turnos.filter(t => t.id !== b.dataset.del); save(); renderAll(); });
  $('#ticket').innerHTML = `<div class="ticket-top"><h3>A pagar adicional</h3><span>${S.pais==='CO'?'Colombia':'Venezuela'}</span></div>
    <div class="ticket-hero"><span>Extras y recargos del periodo</span><strong>${m$(L.valor)}</strong><small>${fechaCorta(desde)} a ${fechaCorta(hasta)}. Hora ordinaria: ${m$(L.hora)}.</small></div>
    <div class="ticket-lines">${L.det.filter(x => x.min).map(x => `<div class="ticket-line"><span>${esc(x.n)} (${hrs(x.min)} h)</span><b>${m$(x.v)}</b></div>`).join('') || '<p class="muted small">Todo el tiempo registrado es ordinario diurno.</p>'}
      <div class="ticket-line total"><span>Horas extra</span><b>${hrs(L.extrasMin)} h</b></div></div>
    ${L.alertas.length?`<div style="margin-top:12px" class="small warn">${L.alertas.map(esc).join('<br>')}</div>`:''}`;
}

/* ---------- Liquidación ---------- */
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
function tablaRes(L){
  return `<table class="t"><thead><tr><th>Concepto</th><th class="r">Horas</th><th class="r">Se paga</th><th class="r">Valor hora</th><th class="r">Total</th></tr></thead><tbody>
    ${L.det.map(x => `<tr><td>${esc(x.n)}</td><td class="r">${hrs(x.min)}</td><td class="r">${fmt(x.p)}%</td><td class="r">${m$(L.hora*x.p/100)}</td><td class="r"><b>${m$(x.v)}</b></td></tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td><td class="r">${hrs(L.det.reduce((a,x)=>a+x.min,0))}</td><td></td><td></td><td class="r">${m$(L.valor)}</td></tr></tfoot></table>`;
}
function renderRes(){
  const L = liquidar();
  $('#res-cap').textContent = `${S.nombre||'Trabajador'}. Del ${fechaLarga(desde)} al ${fechaLarga(hasta)}. Salario ${m$(C().salario)}, hora ordinaria ${m$(L.hora)}.`;
  $('#resumen').innerHTML = `<div class="kpis" style="margin-bottom:14px"><div class="kpi"><span>Horas trabajadas</span><strong>${hrs(L.trab)}</strong><small>${L.filas.length} turnos</small></div>
    <div class="kpi"><span>Horas extra</span><strong>${hrs(L.extrasMin)}</strong><small>Fuera de la jornada</small></div>
    <div class="kpi accent"><span>Total a pagar</span><strong>${m$(L.valor)}</strong><small>Adicional al salario</small></div></div>
    <div class="table-wrap">${tablaRes(L)}</div>
    ${L.alertas.length?`<div class="empty" style="margin-top:14px;text-align:left;border-color:var(--warn)"><strong>Revisa los límites legales</strong>${L.alertas.map(esc).join('<br>')}</div>`:''}
    <p class="hint" style="margin-top:12px">${esc(NOTA[S.pais])}</p>`;
}
$('#btn-print').onclick = () => { const L = liquidar();
  imprimirDoc('Liquidación de horas extra y recargos', `<p><b>${esc(S.nombre||'')}</b>. Salario mensual ${m$(C().salario)}, hora ordinaria ${m$(L.hora)}.</p>${tablaRes(L)}
    <h2>Detalle de turnos</h2><table><thead><tr><th>Fecha</th><th>Horario</th><th class="r">Trabajadas</th><th>Clasificación</th></tr></thead><tbody>
    ${L.filas.map(({t,r}) => `<tr><td>${fechaCorta(t.fecha)}${esFestivo(S.pais,t.fecha)?' (festivo)':''}</td><td>${t.ent} a ${t.sal}</td><td class="r">${hrs(r.trab)}</td><td>${CATS[S.pais].filter(x => r.min[x.k]).map(x => `${x.n}: ${hrs(r.min[x.k])} h`).join('; ')||'Ordinario diurno'}</td></tr>`).join('')}</tbody></table>
    <p class="sub">${esc(NOTA[S.pais])}</p><div class="sig"><div>Firma del empleador</div><div>Firma del trabajador</div></div>`, `${fechaCorta(desde)} a ${fechaCorta(hasta)}, ${S.pais==='CO'?'Colombia':'Venezuela'}`); };
$('#btn-csv').onclick = () => { const L = liquidar();
  csv('horas-extra-'+desde, [['Fecha','Entrada','Salida','Descanso (min)','Horas trabajadas', ...CATS[S.pais].map(x => x.n+' (h)')],
    ...L.filas.map(({t,r}) => [t.fecha, t.ent, t.sal, r.desc, fmt(r.trab/60,2), ...CATS[S.pais].map(x => fmt(r.min[x.k]/60,2))]),
    [], ['Concepto','Horas','% que se paga','Valor'], ...L.det.map(x => [x.n, fmt(x.min/60,2), fmt(x.p), fmt(x.v)]), ['Total','','',fmt(L.valor)]]); };

/* ---------- Configuración ---------- */
function renderCfg(){
  const c = C();
  $('#c-nombre').value = S.nombre || '';
  bindOnce('#c-sal', c.salario, v => { C().salario = v; save(); renderTurnos(); });
  bindOnce('#c-div', c.div, v => { C().div = v; save(); renderTurnos(); }, 0);
  bindOnce('#c-hdia', c.hdia, v => { C().hdia = v; save(); renderTurnos(); });
  $('#c-nini').value = c.nini; $('#c-nfin').value = c.nfin; $('#c-desc').value = String(c.desc);
  $('#recs').innerHTML = CATS[S.pais].map(x => `<label class="field"><span>${esc(x.n)}</span><div class="input-group"><input class="input num" data-k="${x.k}" inputmode="decimal"><span class="addon">%</span></div></label>`).join('');
  $$('#recs [data-k]').forEach(i => bindNum(i, c.rec[i.dataset.k], v => { C().rec[i.dataset.k] = v; save(); }));
  $('#rec-nota').textContent = NOTA[S.pais];
}
const bound = {};
function bindOnce(sel, val, fn, d=2){ const el = $(sel); if (!bound[sel]){ bound[sel] = true; bindNum(el, val, v => bound[sel+'fn'](v), d); } bound[sel+'fn'] = fn; el.value = fmt(val, d); }
$('#c-nombre').oninput = e => { S.nombre = e.target.value; save(); };
$('#c-nini').onchange = e => { C().nini = e.target.value; save(); renderTurnos(); };
$('#c-nfin').onchange = e => { C().nfin = e.target.value; save(); renderTurnos(); };
$('#c-desc').onchange = e => { C().desc = +e.target.value; save(); renderTurnos(); };
$('#btn-def').onclick = async () => { if (!(await confirmar('Se restauran la jornada, el horario nocturno y los porcentajes legales de '+(S.pais==='CO'?'Colombia':'Venezuela')+'. El salario se conserva.', 'Restaurar', false))) return;
  const sal = C().salario; S[S.pais] = JSON.parse(JSON.stringify(DEF[S.pais])); S[S.pais].salario = sal; save(); renderAll(); toast('Valores legales restaurados'); };

function renderAll(){ $$('#pais button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.pais)); renderTurnos(); renderRes(); renderCfg(); }
tabs(id => { if (id === 'reg') renderTurnos(); if (id === 'res') renderRes(); if (id === 'cfg') renderCfg(); });
renderAll(); save();
})();

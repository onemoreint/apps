(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, mesNombre, fechaCorta, fechaLarga, csv, whatsapp, negocio, imprimirDoc} = MA;

/* ================= Valores legales por defecto ================= */
const PARAM_CO = () => ({
  smmlv:1750905, aux:249095, horasMes:210,
  rec:[
    {k:'HED', n:'Hora extra diurna', p:125}, {k:'HEN', n:'Hora extra nocturna', p:175},
    {k:'RN', n:'Recargo nocturno (hora ordinaria)', p:35}, {k:'RDF', n:'Recargo dominical o festivo diurno', p:90},
    {k:'RNDF', n:'Recargo dominical o festivo nocturno', p:125}, {k:'HEDDF', n:'Hora extra dominical o festiva diurna', p:215},
    {k:'HENDF', n:'Hora extra dominical o festiva nocturna', p:265}],
  saludT:4, penT:4, saludE:8.5, penE:12, caja:4, icbf:3, sena:2, exon:true,
  arl:[0.522, 1.044, 2.436, 4.35, 6.96],
  ces:8.33, intCes:12, prima:8.33, vac:4.17
});
const PARAM_VE = () => ({
  sm:130, tasa:0, ct:40, bono:200, pagaBono:false, jornada:8,
  rec:[
    {k:'HED', n:'Hora extra diurna', p:150}, {k:'HEN', n:'Hora extra nocturna', p:195},
    {k:'RN', n:'Recargo nocturno (hora ordinaria)', p:30}, {k:'FER', n:'Día feriado o de descanso trabajado', p:150, dia:true}],
  sso:4, rpe:0.5, faov:1, ssoP:9, rpeP:2, faovP:2, inces:2, incesOn:true, pens:9, pensOn:true, topeSso:5, topeRpe:10,
  util:30
});
const FUENTES = {
  CO:'Salario mínimo $1.750.905 y auxilio de transporte $249.095 (Decretos 1469 y 1470 de 2025). Jornada de 42 horas semanales desde el 15 de julio de 2026, 210 horas al mes (Ley 2101 de 2021). Recargo dominical y festivo del 90% desde el 1 de julio de 2026 y trabajo nocturno desde las 7:00 p. m. (Ley 2466 de 2025). Seguridad social, parafiscales y exoneración del artículo 114-1 del Estatuto Tributario. La retención en la fuente no se calcula automáticamente: regístrala en «Descuentos».',
  VE:'Salario mínimo Bs 130 (sin cambio desde 2022). Ingreso mínimo integral anunciado en mayo de 2026: USD 240, compuesto por cestaticket de USD 40 y bono contra la guerra económica de USD 200 (sector público), pagados en bolívares a la tasa oficial del BCV y sin incidencia salarial. Retenciones: SSO 4% y RPE 0,5% semanales por lunes del mes con topes de 5 y 10 salarios mínimos; FAOV 1% del salario integral. Aportes: SSO 9% a 11% según riesgo, RPE 2%, FAOV 2%, INCES 2% (cinco o más trabajadores) y contribución especial de pensiones 9% (Ley de Protección de las Pensiones, 2024). Recargos LOTTT: horas extra 50%, nocturno 30%, feriado 50%.'
};
const FSP = s => s >= 20 ? 2 : s >= 19 ? 1.8 : s >= 18 ? 1.6 : s >= 17 ? 1.4 : s >= 16 ? 1.2 : s >= 4 ? 1 : 0; // % según salarios mínimos
const ARL_N = ['I (riesgo mínimo)','II (bajo)','III (medio)','IV (alto)','V (máximo)'];

/* ================= Estado ================= */
const ej = {
  CO:[{id:uid(), n:'Ana María Restrepo', doc:'1.036.555.201', cargo:'Auxiliar de ventas', salario:1750905, tipo:'ord', aux:true, arl:1, ingreso:'2024-03-04', tel:'', vacTom:15},
      {id:uid(), n:'Julián Andrés Mejía', doc:'98.765.432', cargo:'Bodeguero', salario:2100000, tipo:'ord', aux:true, arl:2, ingreso:'2025-08-19', tel:'', vacTom:0},
      {id:uid(), n:'Carolina Vélez', doc:'43.210.987', cargo:'Administradora', salario:5200000, tipo:'ord', aux:false, arl:1, ingreso:'2022-01-10', tel:'', vacTom:45}],
  VE:[{id:uid(), n:'José Gregorio Pérez', doc:'V-18.456.789', cargo:'Vendedor', salario:130, ingreso:'2023-05-02', tel:''},
      {id:uid(), n:'María Alejandra Rojas', doc:'V-21.333.444', cargo:'Cajera', salario:400, ingreso:'2021-09-15', tel:''},
      {id:uid(), n:'Luis Fernando Castillo', doc:'V-15.222.111', cargo:'Encargado', salario:1500, ingreso:'2019-02-11', tel:''}]
};
let S = store.get('estado', null);
if (!S){ S = {pais:'CO', CO:{emps:ej.CO, P:PARAM_CO(), nov:{}, frec:'q'}, VE:{emps:ej.VE, P:PARAM_VE(), nov:{}, frec:'q'}};
  const mk = monthKey(); S.CO.nov[mk] = {}; S.CO.nov[mk][ej.CO[1].id] = {h:{HED:6, RDF:8}}; S.VE.nov[mk] = {}; S.VE.nov[mk][ej.VE[0].id] = {h:{HED:4}}; }
const save = () => store.set('estado', S);
let mes = monthKey();
const X = () => S[S.pais], P = () => X().P, CO = () => S.pais === 'CO';
const MON = () => CO() ? 'COP' : 'VES';
const m$ = v => money(v, MON());
const usd = v => money(v, 'USD');
const nov = (eid) => { const N = X().nov[mes] = X().nov[mes] || {}; return (N[eid] = N[eid] || {}); };
const lunesDelMes = (k) => { const [y,m] = k.split('-').map(Number); let c = 0; for (let d = 1; d <= new Date(y, m, 0).getDate(); d++) if (new Date(y, m-1, d).getDay() === 1) c++; return c; };

/* ================= Motor de cálculo ================= */
function calcCO(e, n){
  const p = P(), dias = n.dias ?? 30, f = dias / 30;
  const basico = e.salario * f, hora = e.salario / (p.horasMes || 210);
  const extrasDet = p.rec.map(r => ({...r, q:+((n.h||{})[r.k])||0})).filter(r => r.q).map(r => ({...r, v: hora * r.p / 100 * r.q}));
  const extras = extrasDet.reduce((a,r) => a + r.v, 0), dev = +n.dev||0, devNS = +n.devNS||0, desc = +n.desc||0;
  const integral = e.tipo === 'int';
  const salarial = basico + extras + dev;
  const auxT = (!integral && e.aux && e.salario <= 2 * p.smmlv) ? p.aux * f : 0;
  let ibc = integral ? salarial * 0.7 : salarial; if (dias > 0) ibc = Math.max(ibc, p.smmlv * f); ibc = Math.min(ibc, 25 * p.smmlv);
  const nSm = ibc / (p.smmlv * (f || 1));
  const saludT = ibc * p.saludT / 100, penT = ibc * p.penT / 100, fsp = ibc * FSP(nSm) / 100;
  const ded = saludT + penT + fsp + desc;
  const neto = salarial + auxT + devNS - ded;
  const exon = p.exon && e.salario < 10 * p.smmlv;
  const ap = {salud: exon ? 0 : ibc * p.saludE / 100, pension: ibc * p.penE / 100, arl: ibc * (p.arl[(e.arl||1)-1] || 0) / 100,
    caja: ibc * p.caja / 100, icbf: exon ? 0 : ibc * p.icbf / 100, sena: exon ? 0 : ibc * p.sena / 100};
  const aportes = Object.values(ap).reduce((a,b) => a + b, 0);
  const basePres = salarial + auxT;
  const pv = integral ? {ces:0, int:0, prima:0, vac: basico * p.vac / 100}
    : {ces: basePres * p.ces / 100, int: basePres * p.ces / 100 * p.intCes / 100, prima: basePres * p.prima / 100, vac: basico * p.vac / 100};
  const prov = pv.ces + pv.int + pv.prima + pv.vac;
  return {dias, basico, hora, extrasDet, extras, dev, devNS, desc, salarial, auxT, ibc, saludT, penT, fsp, ded, neto, ap, aportes, exon, pv, prov,
    devengado: salarial + auxT + devNS, costo: salarial + auxT + devNS + aportes + prov};
}
function calcVE(e, n){
  const p = P(), dias = n.dias ?? 30, f = dias / 30, sd = e.salario / 30;
  const basico = sd * dias, hora = sd / (p.jornada || 8);
  const extrasDet = p.rec.map(r => ({...r, q:+((n.h||{})[r.k])||0})).filter(r => r.q).map(r => ({...r, v: (r.dia ? sd : hora) * r.p / 100 * r.q}));
  const extras = extrasDet.reduce((a,r) => a + r.v, 0), dev = +n.dev||0, devNS = +n.devNS||0, desc = +n.desc||0;
  const tasa = +p.tasa || 0;
  const ct = (n.ct ?? p.ct) * tasa * f, bono = p.pagaBono ? (n.bono ?? p.bono) * tasa * f : 0;
  const salarial = basico + extras + dev;
  const lunes = lunesDelMes(mes), sem = 12 / 52;
  const baseSso = Math.min(salarial, p.topeSso * p.sm), baseRpe = Math.min(salarial, p.topeRpe * p.sm);
  const bvDias = diasBV(e, today());
  const integralMes = salarial * (1 + (p.util||30) / 360 + bvDias / 360);
  const sso = baseSso * sem * lunes * p.sso / 100, rpe = baseRpe * sem * lunes * p.rpe / 100, faov = integralMes * p.faov / 100;
  const ded = sso + rpe + faov + desc;
  const neto = salarial + ct + bono + devNS - ded;
  const ap = {sso: baseSso * sem * lunes * p.ssoP / 100, rpe: baseRpe * sem * lunes * p.rpeP / 100, faov: integralMes * p.faovP / 100,
    inces: p.incesOn ? salarial * p.inces / 100 : 0, pens: p.pensOn ? (salarial + ct + bono + devNS) * p.pens / 100 : 0};
  const aportes = Object.values(ap).reduce((a,b) => a + b, 0);
  const sdi = sd * (1 + (p.util||30) / 360 + bvDias / 360);
  const pv = {util: salarial * (p.util||30) / 360, bv: sd * bvDias / 12 * f, gar: sdi * 5 * f};
  const prov = pv.util + pv.bv + pv.gar;
  return {dias, basico, hora, sd, sdi, extrasDet, extras, dev, devNS, desc, salarial, ct, bono, lunes, baseSso, baseRpe, integralMes, sso, rpe, faov, ded, neto, ap, aportes, pv, prov,
    devengado: salarial + ct + bono + devNS, costo: salarial + ct + bono + devNS + aportes + prov};
}
const calc = (e) => CO() ? calcCO(e, nov(e.id)) : calcVE(e, nov(e.id));

/* ---- antigüedad ---- */
function anios(ini, fin){ if (!ini) return 0; const [y1,m1,d1] = ini.split('-').map(Number), [y2,m2,d2] = fin.split('-').map(Number); let a = y2 - y1; if (m2 < m1 || (m2 === m1 && d2 < d1)) a--; return Math.max(0, a); }
function mesesEntre(ini, fin){ if (!ini) return 0; const [y1,m1,d1] = ini.split('-').map(Number), [y2,m2,d2] = fin.split('-').map(Number); let m = (y2-y1)*12 + (m2-m1); if (d2 < d1) m--; return Math.max(0, m); }
function diasBV(e, corte){ const a = anios(e.ingreso, corte); return Math.min(30, 15 + Math.max(0, a - 1)); }
function diasVacVE(e, corte){ const a = anios(e.ingreso, corte); return Math.min(30, 15 + Math.max(0, a - 1)); }
function dias360(a, b){ // convención comercial 30/360, ambos días incluidos
  let [y1,m1,d1] = a.split('-').map(Number), [y2,m2,d2] = b.split('-').map(Number); d1 = Math.min(d1, 30); d2 = Math.min(d2, 30);
  return Math.max(0, (y2-y1)*360 + (m2-m1)*30 + (d2-d1) + 1); }

/* ================= País ================= */
$$('#pais button').forEach(b => b.onclick = () => { S.pais = b.dataset.v; save(); renderAll(); });
function renderPais(){
  $$('#pais button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.pais));
  $('#pais-nota').textContent = CO()
    ? `Valores 2026: salario mínimo ${money(P().smmlv,'COP')}, auxilio de transporte ${money(P().aux,'COP')}, ${P().horasMes} horas al mes. Cifras en pesos colombianos.`
    : `Salario mínimo Bs ${fmt(P().sm)}. Cestaticket USD ${fmt(P().ct)}${P().pagaBono?' y bono USD '+fmt(P().bono):''} a tasa BCV. Cifras en bolívares.`;
  $('#tasa-bcv-w').hidden = CO();
}

/* ================= Liquidación ================= */
$('#mes').value = mes; $('#mes').onchange = e => { mes = e.target.value || monthKey(); renderLiq(); };
$('#frec').onchange = e => { X().frec = e.target.value; save(); renderLiq(); };
bindNum($('#tasa-bcv'), S.VE.P.tasa, v => { S.VE.P.tasa = v; save(); renderLiq(); renderPais(); });
$('#btn-csv').innerHTML = I.csv + 'Exportar planilla (CSV)';
$('#btn-planilla').innerHTML = I.print + 'Imprimir planilla';

function renderLiq(){
  $('#frec').value = X().frec || 'm';
  $('#tasa-bcv').value = S.VE.P.tasa ? fmt(S.VE.P.tasa) : '';
  const E = X().emps;
  if (!E.length){ $('#novedades').innerHTML = `<div class="empty"><strong>No hay empleados</strong>Agrégalos en la pestaña «Empleados».</div>`; $('#resumen').innerHTML=''; $('#planilla').innerHTML=''; return; }
  const sinTasa = !CO() && !(S.VE.P.tasa > 0);
  $('#novedades').innerHTML = (sinTasa ? `<div class="empty" style="margin-bottom:12px;border-color:var(--warn)"><strong>Escribe la tasa BCV del día</strong>La necesitas para pagar el cestaticket${P().pagaBono?' y el bono':''} en bolívares.</div>` : '')
    + `<div class="table-wrap"><table class="t t-edit nov"><thead><tr><th>Empleado</th><th class="r">Días</th><th>Extras y recargos</th><th class="r">Otros devengos</th><th class="r">No salariales</th><th class="r">Descuentos</th><th class="r">Neto a pagar</th><th></th></tr></thead><tbody>
    ${E.map(e => `<tr data-id="${e.id}"><td><b>${esc(e.n)}</b><div class="small muted">${esc(e.cargo||'')}, ${m$(e.salario)}</div></td>
      <td><input class="input num" data-k="dias" inputmode="numeric" aria-label="Días trabajados"></td>
      <td><button class="btn sm" data-ext type="button"></button></td>
      <td><input class="input num" data-k="dev" inputmode="decimal" aria-label="Comisiones o bonos salariales" title="Comisiones, bonificaciones salariales"></td>
      <td><input class="input num" data-k="devNS" inputmode="decimal" aria-label="Pagos no salariales" title="Pagos que no son salario (auxilios, bonos no salariales)"></td>
      <td><input class="input num" data-k="desc" inputmode="decimal" aria-label="Descuentos" title="Préstamos, libranzas, retención en la fuente, otros"></td>
      <td class="r" data-neto style="white-space:nowrap"></td>
      <td class="r" style="white-space:nowrap"><button class="btn ghost sm" data-comp type="button">Comprobante</button></td></tr>`).join('')}
    </tbody></table></div><p class="hint" style="margin-top:8px">Otros devengos: comisiones y bonificaciones que sí son salario. No salariales: auxilios o bonos que no son salario. Descuentos: préstamos, libranzas${CO()?', retención en la fuente':''} u otros.</p>`;
  $$('#novedades tr[data-id]').forEach(tr => { const e = E.find(x => x.id === tr.dataset.id), n = nov(e.id);
    const upd = () => { const r = calc(e); tr.querySelector('[data-neto]').innerHTML = `<b>${m$(r.neto)}</b>${X().frec==='q'?`<div class="small muted">${m$(r.neto/2)} por quincena</div>`:''}`;
      const b = tr.querySelector('[data-ext]'); b.textContent = r.extras ? m$(r.extras) : 'Agregar'; renderResumen(); renderPlanilla(); };
    ['dias','dev','devNS','desc'].forEach(k => { const inp = tr.querySelector(`[data-k=${k}]`); if (k !== 'dias') inp.dataset.blank0 = '';
      bindNum(inp, k === 'dias' ? (n.dias ?? 30) : (n[k] || 0), v => { n[k] = k === 'dias' ? Math.max(0, Math.min(30, v)) : v; save(); upd(); }, k === 'dias' ? 0 : 2); });
    tr.querySelector('[data-ext]').onclick = () => extrasDlg(e, upd);
    tr.querySelector('[data-comp]').onclick = () => comprobante(e);
    upd(); });
}
function extrasDlg(e, done){
  const n = nov(e.id); n.h = n.h || {}; const p = P(); const tmp = Object.assign({}, n.h);
  const r0 = calc(e);
  dialog({title:'Horas extra y recargos de '+e.n.split(' ')[0], body:`<p class="muted small" style="margin-bottom:12px">Escribe la cantidad de horas${CO()?'':' (o de días para feriados)'} del mes. Valor de la hora ordinaria: <b>${m$(r0.hora)}</b>.</p>
    <div class="table-wrap"><table class="t t-edit"><thead><tr><th>Concepto</th><th class="r">Se paga</th><th class="r" style="width:110px">Cantidad</th><th class="r">Valor</th></tr></thead><tbody>
    ${p.rec.map(r => `<tr><td>${esc(r.n)}</td><td class="r muted">${fmt(r.p)}% ${r.dia?'del día':'de la hora'}</td><td><input class="input num" data-r="${r.k}" inputmode="decimal" aria-label="${esc(r.n)}"></td><td class="r" data-v="${r.k}"></td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="3">Total</td><td class="r" id="x-tot"></td></tr></tfoot></table></div>
    <p class="hint" style="margin-top:8px">${CO()?'Los recargos se pagan sobre horas que ya están dentro del salario; las horas extra se pagan completas con su recargo.':'El feriado o día de descanso trabajado se paga por día, adicional al salario del día.'} Si quieres calcular las horas a partir de entradas y salidas, usa la microapp Horas Extras y Recargos.</p>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Guardar', cls:'primary', onClick:()=>{ n.h = tmp; save(); done(); }}],
    onOpen: d => { const upd = () => { let t = 0; p.rec.forEach(r => { const v = (r.dia ? r0.sd : r0.hora) * r.p / 100 * (+tmp[r.k]||0); t += v; $(`[data-v="${r.k}"]`, d).textContent = tmp[r.k] ? m$(v) : ''; }); $('#x-tot', d).textContent = m$(t); };
      $$('[data-r]', d).forEach(i => { i.dataset.blank0 = ''; bindNum(i, tmp[i.dataset.r] || 0, v => { tmp[i.dataset.r] = v; upd(); }, 2); }); upd(); }});
}
function totales(){ const R = X().emps.map(e => calc(e)); const s = k => R.reduce((a,r) => a + (r[k]||0), 0); return {R, s}; }
function renderResumen(){
  const {s} = totales(), q = X().frec === 'q';
  $('#resumen').innerHTML = `<div class="ticket-top"><h3>Nómina de ${mesNombre(mes).toLowerCase()}</h3><span>${CO()?'Colombia':'Venezuela'}</span></div>
    <div class="ticket-hero"><span>Neto a pagar a empleados</span><strong>${m$(s('neto'))}</strong><small>${q?m$(s('neto')/2)+' en cada quincena':'Pago mensual'}${!CO()&&S.VE.P.tasa?', equivale a '+usd(s('neto')/S.VE.P.tasa):''}</small></div>
    <div class="ticket-lines">
      <div class="ticket-line"><span>Salarios y extras</span><b>${m$(s('salarial'))}</b></div>
      ${CO()?`<div class="ticket-line"><span>Auxilio de transporte</span><b>${m$(s('auxT'))}</b></div>`:`<div class="ticket-line"><span>Cestaticket${P().pagaBono?' y bono':''}</span><b>${m$(s('ct')+s('bono'))}</b></div>`}
      <div class="ticket-line"><span>Pagos no salariales</span><b>${m$(s('devNS'))}</b></div>
      <div class="ticket-line"><span>Deducciones a empleados</span><b class="neg">-${m$(s('ded'))}</b></div>
      <div class="ticket-line total"><span>Aportes del empleador</span><b>${m$(s('aportes'))}</b></div>
      <div class="ticket-line"><span>${CO()?'Provisiones de prestaciones':'Provisiones (utilidades, bono vac., prestaciones)'}</span><b>${m$(s('prov'))}</b></div>
      <div class="ticket-line total"><span>Costo total de la nómina</span><b>${m$(s('costo'))}</b></div>
    </div>`;
}
function columnas(){
  return CO() ? [
    ['Devengos', [['Días','dias',0],['Básico','basico'],['Extras y recargos','extras'],['Otros devengos','dev'],['Aux. transporte','auxT'],['No salariales','devNS'],['Total devengado','devengado']]],
    ['Deducciones', [['IBC','ibc'],['Salud 4%','saludT'],['Pensión 4%','penT'],['Fondo solidaridad','fsp'],['Descuentos','desc'],['Total deducciones','ded']]],
    ['Neto', [['Neto a pagar','neto']]],
    ['Aportes del empleador', [['Salud','ap.salud'],['Pensión','ap.pension'],['ARL','ap.arl'],['Caja','ap.caja'],['ICBF','ap.icbf'],['SENA','ap.sena']]],
    ['Provisiones', [['Cesantías','pv.ces'],['Int. cesantías','pv.int'],['Prima','pv.prima'],['Vacaciones','pv.vac']]],
    ['Costo', [['Costo total','costo']]]
  ] : [
    ['Devengos', [['Días','dias',0],['Básico','basico'],['Extras y recargos','extras'],['Otros devengos','dev'],['Cestaticket','ct'],['Bono','bono'],['No salariales','devNS'],['Total devengado','devengado']]],
    ['Deducciones', [['SSO 4%','sso'],['RPE 0,5%','rpe'],['FAOV 1%','faov'],['Descuentos','desc'],['Total deducciones','ded']]],
    ['Neto', [['Neto a pagar','neto']]],
    ['Aportes del patrono', [['SSO','ap.sso'],['RPE','ap.rpe'],['FAOV','ap.faov'],['INCES','ap.inces'],['Pensiones 9%','ap.pens']]],
    ['Provisiones', [['Utilidades','pv.util'],['Bono vacacional','pv.bv'],['Garantía prestaciones','pv.gar']]],
    ['Costo', [['Costo total','costo']]]
  ];
}
const get = (r, k) => k.split('.').reduce((o,x) => o ? o[x] : 0, r) || 0;
function renderPlanilla(){
  const {R} = totales(), E = X().emps, C = columnas(), cols = C.flatMap(g => g[1]);
  $('#planilla-cap').textContent = `${mesNombre(mes)}. ${CO()?'':'Lunes del mes para SSO y RPE: '+lunesDelMes(mes)+'. '}Desliza la tabla para ver todas las columnas.`;
  $('#planilla').innerHTML = `<thead><tr><th></th>${C.map(g => `<th class="grp" colspan="${g[1].length}">${g[0]}</th>`).join('')}</tr>
    <tr><th>Empleado</th>${cols.map(c => `<th class="r">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${R.map((r,i) => `<tr><td><b>${esc(E[i].n)}</b></td>${cols.map(c => `<td class="r">${c[2]===0?fmt(get(r,c[1]),0):m$(get(r,c[1]))}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${cols.map(c => `<td class="r">${c[2]===0?'':m$(R.reduce((a,r) => a + get(r,c[1]), 0))}</td>`).join('')}</tr></tfoot>`;
}
$('#btn-csv').onclick = () => { const {R} = totales(), E = X().emps, cols = columnas().flatMap(g => g[1]);
  csv(`nomina-${S.pais}-${mes}`, [['Empleado','Documento', ...cols.map(c => c[0])], ...R.map((r,i) => [E[i].n, E[i].doc||'', ...cols.map(c => fmt(get(r,c[1]), c[2]===0?0:2))])]); };
$('#btn-planilla').onclick = () => { const {R} = totales(), E = X().emps, C = columnas(), cols = C.flatMap(g => g[1]);
  imprimirDoc('Planilla de nómina', `<style>@page{size:landscape}table{font-size:7pt}td,th{padding:3px 4px}</style><table><thead><tr><th></th>${C.map(g => `<th colspan="${g[1].length}" style="text-align:center">${g[0]}</th>`).join('')}</tr><tr><th>Empleado</th>${cols.map(c => `<th class="r">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${R.map((r,i) => `<tr><td>${esc(E[i].n)}</td>${cols.map(c => `<td class="r">${c[2]===0?fmt(get(r,c[1]),0):fmt(get(r,c[1]),0)}</td>`).join('')}</tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${cols.map(c => `<td class="r">${c[2]===0?'':fmt(R.reduce((a,r) => a + get(r,c[1]), 0),0)}</td>`).join('')}</tr></tfoot></table>
    <p class="sub">Valores en ${CO()?'pesos colombianos':'bolívares'}.${CO()?'':' Tasa BCV: '+fmt(S.VE.P.tasa)+' Bs por USD.'}</p><div class="sig"><div>Elaborado por</div><div>Aprobado por</div></div>`, mesNombre(mes) + (CO()?', Colombia':', Venezuela')); };

function comprobante(e){
  const r = calc(e), q = X().frec === 'q', c = MON();
  const filas = [['Salario básico ('+r.dias+' días)', r.basico], ...r.extrasDet.map(x => [x.n+' ('+fmt(x.q)+')', x.v]), ['Comisiones y otros devengos', r.dev],
    ...(CO() ? [['Auxilio de transporte', r.auxT]] : [['Cestaticket socialista', r.ct], ['Bono contra la guerra económica', r.bono]]), ['Pagos no salariales', r.devNS]].filter(x => x[1]);
  const deds = CO() ? [['Salud ('+fmt(P().saludT)+'%)', r.saludT], ['Pensión ('+fmt(P().penT)+'%)', r.penT], ['Fondo de solidaridad pensional', r.fsp], ['Otros descuentos', r.desc]]
    : [['Seguro Social Obligatorio ('+fmt(P().sso)+'%)', r.sso], ['Régimen Prestacional de Empleo ('+fmt(P().rpe)+'%)', r.rpe], ['FAOV ('+fmt(P().faov)+'%)', r.faov], ['Otros descuentos', r.desc]];
  const body = `<p><b>${esc(e.n)}</b>, ${esc(e.doc||'')}<br>${esc(e.cargo||'')}. Salario mensual: ${money(e.salario,c)}${CO()&&e.tipo==='int'?' (integral)':''}</p>
    <table><thead><tr><th>Devengos</th><th class="r">Valor</th></tr></thead><tbody>${filas.map(x => `<tr><td>${esc(x[0])}</td><td class="r">${money(x[1],c)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total devengado</td><td class="r">${money(r.devengado,c)}</td></tr></tfoot></table>
    <table><thead><tr><th>Deducciones</th><th class="r">Valor</th></tr></thead><tbody>${deds.filter(x => x[1]).map(x => `<tr><td>${esc(x[0])}</td><td class="r">${money(x[1],c)}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total deducciones</td><td class="r">${money(r.ded,c)}</td></tr></tfoot></table>
    <div class="kp"><div><span>Neto a pagar del mes</span><b>${money(r.neto,c)}</b></div>${q?`<div><span>Primera quincena</span><b>${money(r.neto/2,c)}</b></div><div><span>Segunda quincena</span><b>${money(r.neto/2,c)}</b></div>`:''}${!CO()&&S.VE.P.tasa?`<div><span>Equivalente</span><b>${usd(r.neto/S.VE.P.tasa)}</b></div>`:''}</div>
    <div class="sig"><div>Firma del empleador</div><div>Recibí conforme, ${esc(e.n)}</div></div>`;
  const txt = `*Comprobante de pago de nómina, ${mesNombre(mes).toLowerCase()}*\n${e.n}\n\n` + filas.map(x => `${x[0]}: ${money(x[1],c)}`).join('\n') + `\n*Total devengado: ${money(r.devengado,c)}*\n\n`
    + deds.filter(x => x[1]).map(x => `${x[0]}: -${money(x[1],c)}`).join('\n') + `\n*Total deducciones: ${money(r.ded,c)}*\n\n*Neto a pagar: ${money(r.neto,c)}*${q?`\n(${money(r.neto/2,c)} por quincena)`:''}${negocio().nombre?'\n\n'+negocio().nombre:''}`;
  const tabla = (tit, rows, totL, totV) => `<div class="table-wrap"><table class="t"><thead><tr><th>${tit}</th><th class="r">Valor</th></tr></thead><tbody>${rows.map(x => `<tr><td>${esc(x[0])}</td><td class="r">${money(x[1],c)}</td></tr>`).join('')}</tbody><tfoot><tr><td>${totL}</td><td class="r">${money(totV,c)}</td></tr></tfoot></table></div>`;
  const pantalla = `<div class="stack"><p class="small"><b>${esc(e.n)}</b>, ${esc(e.doc||'')}. ${esc(e.cargo||'')}. Salario mensual ${money(e.salario,c)}.</p>
    ${tabla('Devengos', filas, 'Total devengado', r.devengado)}${tabla('Deducciones', deds.filter(x => x[1]), 'Total deducciones', r.ded)}
    <div class="kpis"><div class="kpi accent"><span>Neto a pagar del mes</span><strong>${money(r.neto,c)}</strong>${q?`<small>${money(r.neto/2,c)} por quincena</small>`:''}</div>${!CO()&&S.VE.P.tasa?`<div class="kpi"><span>Equivalente</span><strong>${usd(r.neto/S.VE.P.tasa)}</strong><small>Tasa ${fmt(S.VE.P.tasa)} Bs</small></div>`:''}</div></div>`;
  dialog({title:'Comprobante de '+e.n, wide:true, body:pantalla,
    actions:[{label:'Enviar por WhatsApp', onClick:()=>{ whatsapp(txt, e.tel); return false; }},{label:'Imprimir', cls:'primary', onClick:()=>{ imprimirDoc('Comprobante de pago', body, mesNombre(mes)); return false; }}]});
}

/* ================= Empleados ================= */
$('#btn-emp').innerHTML = I.plus + 'Agregar empleado';
$('#btn-emp').onclick = () => editarEmp();
function renderEmp(){
  const E = X().emps;
  $('#emp-cap').textContent = `${E.length} ${E.length===1?'empleado':'empleados'} en la nómina de ${CO()?'Colombia':'Venezuela'}. Cada país tiene su propia lista.`;
  if (!E.length){ $('#empleados').innerHTML = `<div class="empty"><strong>Sin empleados</strong>Agrega el primero para liquidar la nómina.</div>`; return; }
  $('#empleados').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Empleado</th><th>Cargo</th><th class="r">Salario</th><th>Ingreso</th><th>Antigüedad</th>${CO()?'<th>Condiciones</th>':''}<th></th></tr></thead><tbody>
    ${E.map(e => { const a = anios(e.ingreso, today()), m = mesesEntre(e.ingreso, today()) % 12;
      return `<tr><td><b>${esc(e.n)}</b><div class="small muted">${esc(e.doc||'')}</div></td><td>${esc(e.cargo||'')}</td><td class="r">${m$(e.salario)}${!CO()&&S.VE.P.tasa?`<div class="small muted">${usd(e.salario/S.VE.P.tasa)}</div>`:''}</td>
      <td>${e.ingreso?fechaCorta(e.ingreso):''}</td><td>${e.ingreso?(a?a+(a===1?' año':' años'):'')+(m?(a?', ':'')+m+(m===1?' mes':' meses'):'')||'Menos de un mes':''}</td>
      ${CO()?`<td class="small">${e.tipo==='int'?'<span class="pill acc">Salario integral</span> ':''}${e.aux&&e.salario<=2*P().smmlv&&e.tipo!=='int'?'<span class="pill">Auxilio de transporte</span> ':''}<span class="pill">ARL ${['I','II','III','IV','V'][(e.arl||1)-1]}</span></td>`:''}
      <td class="r"><button class="btn ghost sm icon" data-ed="${e.id}" aria-label="Editar">${I.edit}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('#empleados [data-ed]').forEach(b => b.onclick = () => editarEmp(E.find(x => x.id === b.dataset.ed)));
}
function editarEmp(e){
  const nuevo = !e, co = CO();
  e = e || (co ? {id:uid(), n:'', doc:'', cargo:'', salario:P().smmlv, tipo:'ord', aux:true, arl:1, ingreso:today(), tel:'', vacTom:0} : {id:uid(), n:'', doc:'', cargo:'', salario:P().sm, ingreso:today(), tel:''});
  let sal = e.salario;
  dialog({title: nuevo?'Nuevo empleado':'Editar empleado', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Nombre completo</span><input class="input" id="e-n" value="${esc(e.n)}"></label>
    <label class="field"><span>${co?'Cédula':'Cédula (V- o E-)'}</span><input class="input" id="e-doc" value="${esc(e.doc)}"></label>
    <label class="field"><span>Cargo</span><input class="input" id="e-cargo" value="${esc(e.cargo)}"></label>
    <label class="field"><span>Salario mensual (${co?'COP':'Bs'})</span><input class="input num" id="e-sal" inputmode="decimal"></label>
    <label class="field"><span>Fecha de ingreso</span><input class="input" type="date" id="e-ing" value="${e.ingreso||''}"></label>
    <label class="field"><span>WhatsApp</span><input class="input" id="e-tel" value="${esc(e.tel||'')}" inputmode="tel" placeholder="Para enviar comprobantes"></label>
    ${co?`<label class="field"><span>Tipo de salario</span><select class="input" id="e-tipo"><option value="ord" ${e.tipo!=='int'?'selected':''}>Ordinario</option><option value="int" ${e.tipo==='int'?'selected':''}>Integral (mínimo 13 salarios mínimos)</option></select></label>
    <label class="field"><span>Clase de riesgo ARL</span><select class="input" id="e-arl">${ARL_N.map((x,i) => `<option value="${i+1}" ${(e.arl||1)===i+1?'selected':''}>Clase ${x}, ${fmt(P().arl[i],3)}%</option>`).join('')}</select></label>
    <label class="field"><span>Días de vacaciones ya disfrutados</span><input class="input num" id="e-vac" inputmode="numeric"></label>
    <label class="check" style="grid-column:1/-1"><input type="checkbox" id="e-aux" ${e.aux?'checked':''}> Recibe auxilio de transporte (si gana hasta 2 salarios mínimos)</label>`:''}
  </div>`, actions:[
    ...(nuevo?[]:[{label:'Eliminar', cls:'ghost danger', onClick:async ()=>{ if (!(await confirmar('¿Quitar a '+e.n+' de la nómina?'))) return false; X().emps = X().emps.filter(x => x.id !== e.id); save(); renderAll(); toast('Empleado eliminado'); }}]),
    {label:'Cancelar', cls:'ghost'},
    {label: nuevo?'Agregar empleado':'Guardar cambios', cls:'primary', onClick:(d)=>{
      const n = $('#e-n',d).value.trim(); if (!n){ toast('Escribe el nombre.', true); return false; }
      if (!(sal > 0)){ toast('Escribe el salario.', true); return false; }
      if (co && sal < P().smmlv) toast('El salario es menor que el mínimo legal ('+money(P().smmlv,'COP')+').', true);
      if (co && $('#e-tipo',d).value === 'int' && sal < 13 * P().smmlv){ toast('El salario integral debe ser de al menos 13 salarios mínimos ('+money(13*P().smmlv,'COP')+').', true); return false; }
      Object.assign(e, {n, doc:$('#e-doc',d).value.trim(), cargo:$('#e-cargo',d).value.trim(), salario:sal, ingreso:$('#e-ing',d).value, tel:$('#e-tel',d).value.trim()});
      if (co) Object.assign(e, {tipo:$('#e-tipo',d).value, arl:+$('#e-arl',d).value, aux:$('#e-aux',d).checked, vacTom:num($('#e-vac',d).value)});
      if (nuevo) X().emps.push(e); save(); renderAll(); toast(nuevo?'Empleado agregado':'Cambios guardados'); }}],
    onOpen: d => { bindNum($('#e-sal',d), e.salario, v => sal = v); if (co){ const v = $('#e-vac',d); v.value = fmt(e.vacTom||0,0); } $('#e-n',d).focus(); }});
}

/* ================= Prestaciones ================= */
let corte = today(); $('#corte').value = corte; $('#corte').onchange = e => { corte = e.target.value || today(); renderPrest(); };
function prestCO(e){
  const p = P(), [y] = corte.split('-').map(Number), m = +corte.slice(5,7);
  const auxOk = e.tipo !== 'int' && e.aux && e.salario <= 2 * p.smmlv; const base = e.salario + (auxOk ? p.aux : 0);
  const iniAnio = e.ingreso > `${y}-01-01` ? e.ingreso : `${y}-01-01`;
  const iniSem = (m <= 6 ? `${y}-01-01` : `${y}-07-01`); const iniPrima = e.ingreso > iniSem ? e.ingreso : iniSem;
  const dAn = e.ingreso && e.ingreso <= corte ? dias360(iniAnio, corte) : 0, dSem = e.ingreso && e.ingreso <= corte ? dias360(iniPrima, corte) : 0;
  const dTot = e.ingreso && e.ingreso <= corte ? dias360(e.ingreso, corte) : 0;
  const integral = e.tipo === 'int';
  const ces = integral ? 0 : base * dAn / 360, int = ces * dAn * 0.12 / 360, prima = integral ? 0 : base * dSem / 360;
  const vacDer = dTot / 360 * 15, vacPend = Math.max(0, vacDer - (e.vacTom||0)), vac = e.salario / 30 * vacPend;
  return {base, dAn, dSem, ces, int, prima, vacDer, vacPend, vac, total: ces + int + prima + vac};
}
function prestVE(e){
  const p = P(), sd = e.salario / 30, a = anios(e.ingreso, corte), meses = mesesEntre(e.ingreso, corte);
  const bv = diasBV(e, corte), vac = diasVacVE(e, corte), util = p.util || 30;
  const sdi = sd * (1 + util / 360 + bv / 360);
  const trim = Math.floor(meses / 3), garDias = trim * 15;
  let adic = 0; for (let k = 2; k <= a; k++) adic += Math.min(30, 2 * (k - 1));
  const garantia = (garDias + adic) * sdi;
  const anRetro = Math.floor(meses / 12) + ((meses % 12) >= 6 ? 1 : 0), retro = anRetro * 30 * sdi;
  return {sd, sdi, a, meses, bv, vac, util, garDias, adic, garantia, anRetro, retro, prest: Math.max(garantia, retro), utilV: sd * util, bvV: sd * bv, vacV: sd * vac};
}
function renderPrest(){
  const E = X().emps;
  $('#prest-tit').textContent = CO() ? 'Liquidación de prestaciones sociales' : 'Prestaciones sociales, utilidades y vacaciones (LOTTT)';
  $('#prest-cap').textContent = CO()
    ? 'Cesantías e intereses del año, prima del semestre y vacaciones pendientes a la fecha de corte. Base 360 días, con el salario actual.'
    : 'Estimado con el salario actual. Prestaciones: se paga el mayor entre la garantía (15 días por trimestre más días adicionales) y el retroactivo (30 días por año).';
  if (!E.length){ $('#prestaciones').innerHTML = `<div class="empty"><strong>Sin empleados</strong>Agrégalos en «Empleados».</div>`; return; }
  if (CO()){
    const L = E.map(e => ({e, r:prestCO(e)})), T = k => L.reduce((a,x) => a + x.r[k], 0);
    $('#prestaciones').innerHTML = `<div class="table-wrap"><table class="t nw"><thead><tr><th>Empleado</th><th class="r">Base</th><th class="r">Días año</th><th class="r">Cesantías</th><th class="r">Intereses</th><th class="r">Días sem.</th><th class="r">Prima</th><th class="r">Vac. pendientes</th><th class="r">Vacaciones</th><th class="r">Total</th><th></th></tr></thead><tbody>
      ${L.map(({e,r}) => `<tr><td><b>${esc(e.n)}</b><div class="small muted">Ingreso ${fechaCorta(e.ingreso)}</div></td><td class="r">${m$(r.base)}</td><td class="r">${r.dAn}</td><td class="r">${m$(r.ces)}</td><td class="r">${m$(r.int)}</td><td class="r">${r.dSem}</td><td class="r">${m$(r.prima)}</td><td class="r">${fmt(r.vacPend,1)} días</td><td class="r">${m$(r.vac)}</td><td class="r"><b>${m$(r.total)}</b></td>
      <td class="r"><button class="btn ghost sm" data-pr="${e.id}">Imprimir</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td></td><td></td><td class="r">${m$(T('ces'))}</td><td class="r">${m$(T('int'))}</td><td></td><td class="r">${m$(T('prima'))}</td><td></td><td class="r">${m$(T('vac'))}</td><td class="r">${m$(T('total'))}</td><td></td></tr></tfoot></table></div>
      <p class="hint" style="margin-top:8px">La base incluye el auxilio de transporte para cesantías y prima. Las vacaciones se liquidan sin auxilio. No incluye indemnización por despido.</p>`;
  } else {
    const L = E.map(e => ({e, r:prestVE(e)})), T = k => L.reduce((a,x) => a + x.r[k], 0);
    $('#prestaciones').innerHTML = `<div class="table-wrap"><table class="t nw"><thead><tr><th>Empleado</th><th class="r">Antigüedad</th><th class="r">Salario integral diario</th><th class="r">Garantía</th><th class="r">Retroactivo</th><th class="r">Prestaciones</th><th class="r">Utilidades (${fmt(P().util)} d)</th><th class="r">Bono vacacional</th><th class="r">Vacaciones</th><th></th></tr></thead><tbody>
      ${L.map(({e,r}) => `<tr><td><b>${esc(e.n)}</b><div class="small muted">Ingreso ${fechaCorta(e.ingreso)}</div></td><td class="r">${r.a} a, ${r.meses%12} m</td><td class="r">${m$(r.sdi)}</td>
        <td class="r">${m$(r.garantia)}<div class="small muted">${r.garDias + r.adic} días</div></td><td class="r">${m$(r.retro)}<div class="small muted">${r.anRetro*30} días</div></td><td class="r"><b>${m$(r.prest)}</b></td>
        <td class="r">${m$(r.utilV)}</td><td class="r">${m$(r.bvV)}<div class="small muted">${r.bv} días</div></td><td class="r">${m$(r.vacV)}<div class="small muted">${r.vac} días</div></td>
        <td class="r"><button class="btn ghost sm" data-pr="${e.id}">Imprimir</button></td></tr>`).join('')}
      </tbody><tfoot><tr><td>Total</td><td></td><td></td><td class="r">${m$(T('garantia'))}</td><td class="r">${m$(T('retro'))}</td><td class="r">${m$(T('prest'))}</td><td class="r">${m$(T('utilV'))}</td><td class="r">${m$(T('bvV'))}</td><td class="r">${m$(T('vacV'))}</td><td></td></tr></tfoot></table></div>
      <p class="hint" style="margin-top:8px">Bono vacacional y vacaciones: 15 días más 1 por año de servicio, hasta 30. Utilidades: entre 30 y 120 días según la empresa (se cambia en «Valores legales»). El cestaticket y el bono no tienen incidencia salarial.</p>`;
  }
  $$('#prestaciones [data-pr]').forEach(b => b.onclick = () => imprimirPrest(E.find(x => x.id === b.dataset.pr)));
}
function imprimirPrest(e){
  const c = MON();
  if (CO()){ const r = prestCO(e);
    imprimirDoc('Liquidación de prestaciones sociales', `<p><b>${esc(e.n)}</b>, ${esc(e.doc||'')}. ${esc(e.cargo||'')}<br>Fecha de ingreso: ${fechaLarga(e.ingreso)}. Fecha de corte: ${fechaLarga(corte)}.<br>Salario: ${money(e.salario,c)}. Base para prestaciones: ${money(r.base,c)}.</p>
      <table><thead><tr><th>Concepto</th><th>Cálculo</th><th class="r">Valor</th></tr></thead><tbody>
      <tr><td>Cesantías</td><td>${money(r.base,c)} × ${r.dAn} días / 360</td><td class="r">${money(r.ces,c)}</td></tr>
      <tr><td>Intereses sobre cesantías</td><td>${money(r.ces,c)} × ${r.dAn} × 12% / 360</td><td class="r">${money(r.int,c)}</td></tr>
      <tr><td>Prima de servicios</td><td>${money(r.base,c)} × ${r.dSem} días / 360</td><td class="r">${money(r.prima,c)}</td></tr>
      <tr><td>Vacaciones pendientes</td><td>${fmt(r.vacPend,2)} días × ${money(e.salario/30,c)}</td><td class="r">${money(r.vac,c)}</td></tr></tbody>
      <tfoot><tr><td colspan="2">Total</td><td class="r">${money(r.total,c)}</td></tr></tfoot></table><div class="sig"><div>Firma del empleador</div><div>Firma del trabajador</div></div>`, 'Colombia');
  } else { const r = prestVE(e);
    imprimirDoc('Cálculo de prestaciones sociales', `<p><b>${esc(e.n)}</b>, ${esc(e.doc||'')}. ${esc(e.cargo||'')}<br>Fecha de ingreso: ${fechaLarga(e.ingreso)}. Fecha de corte: ${fechaLarga(corte)}. Antigüedad: ${r.a} años y ${r.meses%12} meses.<br>Salario mensual: ${money(e.salario,c)}. Salario diario: ${money(r.sd,c)}. Salario integral diario: ${money(r.sdi,c)}.</p>
      <table><thead><tr><th>Concepto</th><th>Cálculo</th><th class="r">Valor</th></tr></thead><tbody>
      <tr><td>Garantía de prestaciones (art. 142 a y b)</td><td>(${r.garDias} + ${r.adic} días) × ${money(r.sdi,c)}</td><td class="r">${money(r.garantia,c)}</td></tr>
      <tr><td>Cálculo retroactivo (art. 142 c)</td><td>${r.anRetro} años × 30 días × ${money(r.sdi,c)}</td><td class="r">${money(r.retro,c)}</td></tr>
      <tr class="tot"><td>Prestaciones a pagar (el mayor)</td><td></td><td class="r">${money(r.prest,c)}</td></tr>
      <tr><td>Utilidades del año</td><td>${r.util} días × ${money(r.sd,c)}</td><td class="r">${money(r.utilV,c)}</td></tr>
      <tr><td>Bono vacacional</td><td>${r.bv} días × ${money(r.sd,c)}</td><td class="r">${money(r.bvV,c)}</td></tr>
      <tr><td>Vacaciones</td><td>${r.vac} días × ${money(r.sd,c)}</td><td class="r">${money(r.vacV,c)}</td></tr></tbody></table>
      <p class="sub">Estimado con el salario actual. Los intereses sobre prestaciones y los anticipos no están incluidos.</p><div class="sig"><div>Firma del patrono</div><div>Firma del trabajador</div></div>`, 'Venezuela, LOTTT');
  }
}

/* ================= Parámetros ================= */
function renderParam(){
  const p = P(), co = CO();
  $('#param-tit').textContent = co ? 'Valores legales de Colombia' : 'Valores legales de Venezuela';
  const f = (k, l, suf='', dec=2) => `<label class="field"><span>${l}</span>${suf?`<div class="input-group"><input class="input num" data-p="${k}" data-d="${dec}" inputmode="decimal"><span class="addon">${suf}</span></div>`:`<input class="input num" data-p="${k}" data-d="${dec}" inputmode="decimal">`}</label>`;
  const chk = (k, l) => `<label class="check" style="grid-column:1/-1"><input type="checkbox" data-c="${k}" ${p[k]?'checked':''}> ${l}</label>`;
  const recs = `<h3 class="param-sec">Horas extra y recargos</h3><p class="hint" style="margin-bottom:10px">Porcentaje del valor de la hora ordinaria${co?'':' (o del día, para feriados)'} que se paga por cada hora.</p><div class="param-grid">${p.rec.map((r,i) => `<label class="field"><span>${esc(r.n)}</span><div class="input-group"><input class="input num" data-rec="${i}" inputmode="decimal"><span class="addon">%</span></div></label>`).join('')}</div>`;
  $('#params').innerHTML = co ? `<h3 class="param-sec">Salario y jornada</h3><div class="param-grid">${f('smmlv','Salario mínimo mensual','',0)}${f('aux','Auxilio de transporte','',0)}${f('horasMes','Horas ordinarias al mes','h',0)}</div>${recs}
    <h3 class="param-sec">Seguridad social y parafiscales</h3><div class="param-grid">${f('saludT','Salud del trabajador','%')}${f('penT','Pensión del trabajador','%')}${f('saludE','Salud del empleador','%')}${f('penE','Pensión del empleador','%')}${f('caja','Caja de compensación','%')}${f('icbf','ICBF','%')}${f('sena','SENA','%')}${chk('exon','La empresa está exonerada de salud, ICBF y SENA para salarios menores de 10 mínimos (artículo 114-1 E.T.)')}</div>
    <h3 class="param-sec">ARL por clase de riesgo</h3><div class="param-grid">${p.arl.map((v,i) => `<label class="field"><span>Clase ${ARL_N[i]}</span><div class="input-group"><input class="input num" data-arl="${i}" inputmode="decimal"><span class="addon">%</span></div></label>`).join('')}</div>
    <h3 class="param-sec">Provisiones de prestaciones</h3><div class="param-grid">${f('ces','Cesantías','%')}${f('intCes','Intereses sobre cesantías (anual)','%')}${f('prima','Prima de servicios','%')}${f('vac','Vacaciones','%')}</div>`
  : `<h3 class="param-sec">Salario y bonificaciones</h3><div class="param-grid">${f('sm','Salario mínimo mensual','Bs')}${f('tasa','Tasa BCV del día','Bs/USD',4)}${f('ct','Cestaticket socialista','USD')}${f('bono','Bono contra la guerra económica','USD')}${f('jornada','Horas de la jornada diurna','h',0)}${f('util','Días de utilidades al año','días',0)}${chk('pagaBono','Pagar el bono contra la guerra económica (aplica al sector público)')}</div>${recs}
    <h3 class="param-sec">Retenciones al trabajador</h3><div class="param-grid">${f('sso','Seguro Social Obligatorio','%')}${f('rpe','Régimen Prestacional de Empleo','%')}${f('faov','FAOV (vivienda)','%')}${f('topeSso','Tope SSO','salarios mín.',0)}${f('topeRpe','Tope RPE','salarios mín.',0)}</div>
    <h3 class="param-sec">Aportes del patrono</h3><div class="param-grid">${f('ssoP','SSO según riesgo (9, 10 u 11)','%')}${f('rpeP','RPE','%')}${f('faovP','FAOV','%')}${f('inces','INCES','%')}${f('pens','Contribución especial de pensiones','%')}${chk('incesOn','La empresa tiene cinco o más trabajadores (paga INCES)')}${chk('pensOn','Pagar contribución especial de pensiones')}</div>`;
  $$('#params [data-p]').forEach(i => bindNum(i, p[i.dataset.p], v => { p[i.dataset.p] = v; save(); renderPais(); }, +i.dataset.d));
  $$('#params [data-rec]').forEach(i => bindNum(i, p.rec[+i.dataset.rec].p, v => { p.rec[+i.dataset.rec].p = v; save(); }));
  $$('#params [data-arl]').forEach(i => bindNum(i, p.arl[+i.dataset.arl], v => { p.arl[+i.dataset.arl] = v; save(); }, 3));
  $$('#params [data-c]').forEach(i => i.onchange = () => { p[i.dataset.c] = i.checked; save(); renderPais(); });
  $('#fuentes').innerHTML = `<b>Referencias de los valores por defecto (octubre de 2026):</b> ${esc(FUENTES[S.pais])} Verifica con tu contador ante cualquier cambio normativo.`;
}
$('#btn-reset-param').onclick = async () => { if (!(await confirmar('Se reemplazarán los valores legales de '+(CO()?'Colombia':'Venezuela')+' por los de fábrica. La tasa BCV se conserva.', 'Restaurar', false))) return;
  const t = S.VE.P.tasa; X().P = CO() ? PARAM_CO() : PARAM_VE(); if (!CO()) X().P.tasa = t; save(); renderAll(); toast('Valores restaurados'); };

function renderAll(){ renderPais(); renderLiq(); renderEmp(); renderPrest(); renderParam(); }
tabs(id => { if (id === 'liq') renderLiq(); if (id === 'emp') renderEmp(); if (id === 'prest') renderPrest(); if (id === 'param') renderParam(); });
renderAll(); save();
document.addEventListener('ma:negocio', renderAll);
})();

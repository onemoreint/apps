(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, mesNombre, fechaCorta, fechaLarga, csv, negocio} = MA;

const DENOMS = {
  COP:[100000,50000,20000,10000,5000,2000,1000,500,200,100,50], USD:[100,50,20,10,5,2,1,0.25,0.1,0.05,0.01],
  VES:[500,200,100,50,20,10,5,1,0.5], EUR:[500,200,100,50,20,10,5,2,1,0.5,0.2,0.1,0.05], MXN:[1000,500,200,100,50,20,10,5,2,1,0.5],
  PEN:[200,100,50,20,10,5,2,1,0.5,0.2,0.1], CLP:[20000,10000,5000,2000,1000,500,100,50,10]
};
const moneda = () => negocio().moneda || 'COP';
const DEF_CFG = {
  catsIn:['Ventas','Abonos de clientes','Otros ingresos'],
  catsOut:['Compras de mercancía','Pago a proveedores','Gastos del local','Servicios','Nómina','Retiros del dueño','Otros gastos'],
  medios:['Efectivo','Transferencia','Tarjeta','Nequi','Daviplata'],
  base:200000, denoms:null
};
let CFG = Object.assign({}, DEF_CFG, store.get('cfg', {}));
let DIAS = store.get('dias', null);
if (!DIAS){ // datos de ejemplo del día de hoy
  const h = today(); DIAS = {}; DIAS[h] = {base:200000, movs:[
    {id:uid(), tipo:'in', monto:85000, medio:'Efectivo', cat:'Ventas', conc:'Venta mostrador', hora:'08:42'},
    {id:uid(), tipo:'in', monto:120000, medio:'Nequi', cat:'Ventas', conc:'Pedido domicilio', hora:'10:15'},
    {id:uid(), tipo:'out', monto:45000, medio:'Efectivo', cat:'Compras de mercancía', conc:'Pan y lácteos', hora:'11:02'},
    {id:uid(), tipo:'in', monto:230000, medio:'Efectivo', cat:'Ventas', conc:'Ventas del mediodía', hora:'13:30'}], cierre:null};
}
const saveCfg = () => store.set('cfg', CFG), saveDias = () => store.set('dias', DIAS);
const denoms = () => (CFG.denoms && CFG.denoms.length ? CFG.denoms : (DENOMS[moneda()] || DENOMS.COP));
const efectivo = () => CFG.medios[0] || 'Efectivo';
let diaSel = today(), tipo = 'in', mMonto = 0;
const dia = (k=diaSel) => (DIAS[k] = DIAS[k] || {base:CFG.base, movs:[], cierre:null});
const hora = () => { const d = new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); };

function calcDia(d){
  const ef = efectivo();
  const inEf = d.movs.filter(m => m.tipo==='in' && m.medio===ef).reduce((a,m)=>a+m.monto,0);
  const outEf = d.movs.filter(m => m.tipo==='out' && m.medio===ef).reduce((a,m)=>a+m.monto,0);
  const tin = d.movs.filter(m => m.tipo==='in').reduce((a,m)=>a+m.monto,0);
  const tout = d.movs.filter(m => m.tipo==='out').reduce((a,m)=>a+m.monto,0);
  const porMedio = {}; d.movs.forEach(m => { porMedio[m.medio] = porMedio[m.medio] || {in:0,out:0}; porMedio[m.medio][m.tipo] += m.monto; });
  const esperado = (+d.base||0) + inEf - outEf;
  const contado = d.cierre ? d.cierre.contado : null;
  return {inEf, outEf, tin, tout, porMedio, esperado, contado, dif: contado===null ? null : contado - esperado};
}

/* ---------- Caja del día ---------- */
$('#btn-print-dia').innerHTML = I.print + 'Imprimir cierre';
$('#btn-print-dia').onclick = () => window.print();
$('#dia').value = diaSel;
$('#dia').onchange = e => { diaSel = e.target.value || today(); renderDia(); };
$$('#tipo-mov button').forEach(b => b.onclick = () => { tipo = b.dataset.v; renderForm(); });
bindNum($('#m-monto'), '', v => mMonto = v);
function renderForm(){
  $$('#tipo-mov button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === tipo));
  const cats = tipo === 'in' ? CFG.catsIn : CFG.catsOut;
  const cv = $('#m-cat').value; $('#m-cat').innerHTML = cats.map(c => `<option>${esc(c)}</option>`).join(''); if (cats.includes(cv)) $('#m-cat').value = cv;
  const mv = $('#m-medio').value; $('#m-medio').innerHTML = CFG.medios.map(c => `<option>${esc(c)}</option>`).join(''); if (CFG.medios.includes(mv)) $('#m-medio').value = mv;
  $('#m-btn').textContent = tipo === 'in' ? 'Agregar entrada' : 'Agregar salida';
}
$('#f-mov').onsubmit = e => {
  e.preventDefault(); const d = dia();
  if (d.cierre && d.cierre.cerrado){ toast('La caja de este día está cerrada. Reábrela para agregar movimientos.', true); return; }
  if (!(mMonto > 0)){ toast('Escribe el valor.', true); $('#m-monto').focus(); return; }
  d.movs.push({id:uid(), tipo, monto:mMonto, medio:$('#m-medio').value, cat:$('#m-cat').value, conc:$('#m-conc').value.trim(), hora: diaSel===today()?hora():''});
  saveDias(); mMonto = 0; $('#m-monto').value = ''; $('#m-conc').value = ''; $('#m-monto').focus();
  toast(tipo === 'in' ? 'Entrada registrada' : 'Salida registrada'); renderDia();
};

function renderDia(){
  const d = dia(), c = calcDia(d), cur = moneda(), cerrado = !!(d.cierre && d.cierre.cerrado);
  $('#estado-dia').innerHTML = cerrado ? '<span class="pill ok">Caja cerrada</span>' : '<span class="pill mid">Caja abierta</span>';
  $('#card-mov').style.opacity = cerrado ? .55 : 1;
  $('#mov-cap').textContent = fechaLarga(diaSel) + ', ' + d.movs.length + (d.movs.length===1?' movimiento':' movimientos');
  const movs = [...d.movs].sort((a,b) => (b.hora||'').localeCompare(a.hora||''));
  $('#movs').innerHTML = movs.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Hora</th><th>Concepto</th><th>Medio</th><th class="r">Valor</th><th class="no-print"></th></tr></thead><tbody>
    ${movs.map(m => `<tr><td class="muted">${m.hora||''}</td><td>${esc(m.conc||m.cat)}<div class="small muted">${esc(m.cat)}</div></td><td>${esc(m.medio)}</td>
      <td class="r"><b class="${m.tipo==='in'?'pos':'neg'}">${m.tipo==='in'?'+':'-'}${money(m.monto,cur)}</b></td>
      <td class="r no-print">${cerrado?'':`<button class="btn ghost sm icon" data-del="${m.id}" aria-label="Eliminar movimiento">${I.trash}</button>`}</td></tr>`).join('')}</tbody></table></div>`
    : `<div class="empty"><strong>Sin movimientos</strong>Registra la primera venta o gasto del día.</div>`;
  $$('#movs [data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este movimiento?'))) return; d.movs = d.movs.filter(m => m.id !== b.dataset.del); saveDias(); renderDia(); });

  const medios = Object.entries(c.porMedio).filter(([k]) => k !== efectivo());
  $('#ticket').innerHTML = `<div class="ticket-top"><h3>Efectivo en caja</h3><span>${fechaCorta(diaSel)}</span></div>
    <div class="ticket-hero"><span>Debe haber en la caja</span><strong>${money(c.esperado,cur)}</strong>
      <small>${c.dif===null?'Haz el arqueo para compararlo con lo contado.':c.dif===0?'El arqueo cuadra exacto.':(c.dif>0?'Sobrante de ':'Faltante de ')+money(Math.abs(c.dif),cur)+' en el arqueo.'}</small></div>
    <div class="ticket-lines">
      <div class="ticket-line"><span>Base de apertura</span><b><input class="input num" id="base" inputmode="decimal" style="max-width:140px;min-height:32px;padding:4px 8px" ${cerrado?'disabled':''} aria-label="Base de apertura"></b></div>
      <div class="ticket-line"><span>Entradas en ${esc(efectivo().toLowerCase())}</span><b class="pos">+${money(c.inEf,cur)}</b></div>
      <div class="ticket-line"><span>Salidas en ${esc(efectivo().toLowerCase())}</span><b class="neg">-${money(c.outEf,cur)}</b></div>
      ${medios.length?`<div class="ticket-line" style="margin-top:6px"><span class="small muted">Otros medios (no están en la caja)</span><b></b></div>`:''}
      ${medios.map(([k,v]) => `<div class="ticket-line"><span>${esc(k)}</span><b>${money(v.in - v.out,cur)}</b></div>`).join('')}
      <div class="ticket-line total"><span>Total entradas del día</span><b>${money(c.tin,cur)}</b></div>
      <div class="ticket-line"><span>Total salidas del día</span><b>${money(c.tout,cur)}</b></div>
      <div class="ticket-line"><span>Resultado del día</span><b class="${c.tin-c.tout>=0?'pos':'neg'}">${money(c.tin-c.tout,cur)}</b></div>
    </div>`;
  bindNum($('#base'), d.base, v => { d.base = v; saveDias(); });
  $('#base').addEventListener('change', renderDia);
  renderArqueo();
}

function renderArqueo(){
  const d = dia(), c = calcDia(d), cur = moneda(), cerrado = !!(d.cierre && d.cierre.cerrado);
  const conteo = (d.cierre && d.cierre.conteo) || {};
  const ds = denoms();
  const sum = () => ds.reduce((a,v) => a + v * (+conteo[v]||0), 0);
  $('#arqueo').innerHTML = `<div class="table-wrap"><table class="t t-edit"><thead><tr><th>Billete o moneda</th><th class="r" style="width:120px">Cantidad</th><th class="r">Subtotal</th></tr></thead><tbody>
    ${ds.map(v => `<tr><td>${money(v,cur)}</td><td><input class="input num" data-den="${v}" inputmode="numeric" ${cerrado?'disabled':''} aria-label="Cantidad de ${money(v,cur)}"></td><td class="r" data-sub="${v}"></td></tr>`).join('')}
    </tbody><tfoot><tr><td>Total contado</td><td></td><td class="r" id="arq-total"></td></tr></tfoot></table></div>
    <div class="row" style="margin-top:12px;align-items:stretch">
      <div class="kpi" style="flex:1;min-width:150px"><span>Debe haber</span><strong style="font-size:1.15rem">${money(c.esperado,cur)}</strong></div>
      <div class="kpi" style="flex:1;min-width:150px" id="arq-dif"></div>
    </div>
    <label class="field" style="margin-top:12px"><span>Nota del cierre</span><input class="input" id="arq-nota" value="${esc((d.cierre&&d.cierre.nota)||'')}" placeholder="Ej: se consignaron 300.000 al banco" ${cerrado?'disabled':''}></label>
    <div class="row no-print" style="margin-top:12px">${cerrado
      ? `<span class="muted small">Cerrada${d.cierre.hora?' a las '+d.cierre.hora:''}.</span><span class="spacer"></span><button class="btn" id="arq-reabrir" type="button">Reabrir caja</button>`
      : `<button class="btn primary" id="arq-cerrar" type="button">Cerrar caja del día</button>`}</div>`;
  const upd = () => { ds.forEach(v => { const el = $(`[data-sub="${v}"]`); el.textContent = conteo[v] ? money(v*conteo[v],cur) : ''; });
    const tot = sum(); $('#arq-total').textContent = money(tot,cur); const dif = tot - c.esperado;
    $('#arq-dif').innerHTML = `<span>${tot===0?'Diferencia':dif===0?'Cuadra':dif>0?'Sobrante':'Faltante'}</span><strong style="font-size:1.15rem" class="${tot===0?'':dif===0?'pos':dif>0?'warn':'neg'}">${tot===0?'Sin contar':money(Math.abs(dif),cur)}</strong>`;
    return tot; };
  $$('#arqueo [data-den]').forEach(inp => { const v = +inp.dataset.den; inp.dataset.blank0 = '';
    bindNum(inp, conteo[v]||0, q => { conteo[v] = Math.max(0, Math.floor(q)); d.cierre = Object.assign(d.cierre||{}, {conteo, contado:sum(), cerrado:false}); saveDias(); upd(); }, 0); });
  upd();
  const nota = $('#arq-nota'); if (nota) nota.oninput = () => { d.cierre = Object.assign(d.cierre||{conteo, contado:sum()}, {nota:nota.value}); saveDias(); };
  const cerrar = $('#arq-cerrar'); if (cerrar) cerrar.onclick = async () => {
    const tot = sum(); if (!tot && !(await confirmar('No has contado el efectivo. ¿Cerrar la caja con cero contado?', 'Cerrar caja', false))) return;
    d.cierre = Object.assign(d.cierre||{}, {conteo, contado:tot, cerrado:true, hora:hora(), nota:$('#arq-nota').value});
    saveDias(); const dif = tot - c.esperado; toast(dif===0?'Caja cerrada: cuadra exacto':'Caja cerrada con '+(dif>0?'sobrante':'faltante')+' de '+money(Math.abs(dif),cur)); renderDia(); };
  const re = $('#arq-reabrir'); if (re) re.onclick = () => { d.cierre.cerrado = false; saveDias(); renderDia(); toast('Caja reabierta'); };
}

/* ---------- Historial ---------- */
function renderHist(){
  const ks = Object.keys(DIAS).filter(k => DIAS[k].movs.length || DIAS[k].cierre).sort().reverse(), cur = moneda();
  if (!ks.length){ $('#historial').innerHTML = `<div class="empty"><strong>Aún no hay días registrados</strong>Empieza en «Caja del día».</div>`; return; }
  $('#historial').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Día</th><th class="r">Entradas</th><th class="r">Salidas</th><th class="r">Efectivo esperado</th><th class="r">Contado</th><th class="r">Diferencia</th><th>Estado</th></tr></thead><tbody>
    ${ks.map(k => { const d = DIAS[k], c = calcDia(d); return `<tr data-k="${k}" style="cursor:pointer"><td><b>${fechaCorta(k)}</b></td><td class="r pos">${money(c.tin,cur)}</td><td class="r neg">${money(c.tout,cur)}</td><td class="r">${money(c.esperado,cur)}</td>
      <td class="r">${c.contado===null?'<span class="muted">Sin arqueo</span>':money(c.contado,cur)}</td>
      <td class="r">${c.dif===null?'':`<b class="${c.dif===0?'pos':c.dif>0?'warn':'neg'}">${c.dif>0?'+':''}${money(c.dif,cur)}</b>`}</td>
      <td>${d.cierre&&d.cierre.cerrado?'<span class="pill ok">Cerrada</span>':'<span class="pill mid">Abierta</span>'}</td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('#historial tr[data-k]').forEach(tr => tr.onclick = () => { diaSel = tr.dataset.k; $('#dia').value = diaSel; selTab('hoy'); renderDia(); });
}

/* ---------- Resumen del mes ---------- */
let mes = monthKey();
$('#mes').value = mes; $('#mes').onchange = e => { mes = e.target.value || monthKey(); renderMes(); };
$('#btn-csv').innerHTML = I.csv + 'Exportar movimientos (CSV)';
function movsMes(){ return Object.keys(DIAS).filter(k => k.slice(0,7) === mes).sort().flatMap(k => DIAS[k].movs.map(m => Object.assign({fecha:k}, m))); }
function bars(el, grupos, cur){
  const e = Object.entries(grupos).sort((a,b) => b[1]-a[1]); const max = Math.max(1, ...e.map(x => x[1]));
  el.innerHTML = e.length ? e.map(([k,v]) => `<div class="bar-row"><span class="lbl">${esc(k)}</span><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div><b class="small">${money(v,cur)}</b></div>`).join('') : '<p class="muted small">Sin datos este mes.</p>';
}
function renderMes(){
  const ms = movsMes(), cur = moneda();
  const tin = ms.filter(m => m.tipo==='in').reduce((a,m)=>a+m.monto,0), tout = ms.filter(m => m.tipo==='out').reduce((a,m)=>a+m.monto,0);
  const ks = Object.keys(DIAS).filter(k => k.slice(0,7) === mes);
  const difs = ks.map(k => calcDia(DIAS[k]).dif).filter(x => x !== null);
  const sumDif = difs.reduce((a,x)=>a+x,0);
  $('#mes-kpis').innerHTML = `<div class="kpi"><span>Entradas</span><strong class="pos">${money(tin,cur)}</strong><small>${ms.filter(m=>m.tipo==='in').length} movimientos</small></div>
    <div class="kpi"><span>Salidas</span><strong class="neg">${money(tout,cur)}</strong><small>${ms.filter(m=>m.tipo==='out').length} movimientos</small></div>
    <div class="kpi accent"><span>Resultado del mes</span><strong>${money(tin-tout,cur)}</strong><small>${ks.length} días con caja</small></div>
    <div class="kpi"><span>Diferencias de arqueo</span><strong class="${sumDif===0?'':sumDif>0?'warn':'neg'}">${money(sumDif,cur)}</strong><small>${difs.filter(x=>x!==0).length} días con diferencia</small></div>`;
  const gi = {}, go = {}, gm = {};
  ms.forEach(m => { const g = m.tipo==='in'?gi:go; g[m.cat] = (g[m.cat]||0) + m.monto; gm[m.medio] = gm[m.medio] || {in:0,out:0}; gm[m.medio][m.tipo] += m.monto; });
  bars($('#bar-in'), gi, cur); bars($('#bar-out'), go, cur);
  const em = Object.entries(gm);
  $('#por-medio').innerHTML = em.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Medio</th><th class="r">Entradas</th><th class="r">Salidas</th><th class="r">Neto</th><th class="r">Participación</th></tr></thead><tbody>
    ${em.map(([k,v]) => `<tr><td>${esc(k)}</td><td class="r">${money(v.in,cur)}</td><td class="r">${money(v.out,cur)}</td><td class="r"><b>${money(v.in-v.out,cur)}</b></td><td class="r">${tin?pct(v.in/tin*100):''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin datos este mes.</p>';
}
$('#btn-csv').onclick = () => { const cur = moneda();
  csv('caja-'+mes, [['Fecha','Hora','Tipo','Categoría','Concepto','Medio','Valor ('+cur+')'], ...movsMes().map(m => [m.fecha, m.hora||'', m.tipo==='in'?'Entrada':'Salida', m.cat, m.conc||'', m.medio, fmt(m.tipo==='in'?m.monto:-m.monto)])]); };

/* ---------- Configuración ---------- */
function renderCfg(){
  $('#cfg-in').value = CFG.catsIn.join('\n'); $('#cfg-out').value = CFG.catsOut.join('\n'); $('#cfg-medios').value = CFG.medios.join('\n');
  $('#cfg-denoms').value = denoms().map(v => String(v).replace('.', ',')).join('; ');
  $('#denom-hint').textContent = `Separados por punto y coma. Si los borras se usan los de ${moneda()}.`;
}
const lineas = v => v.split('\n').map(x => x.trim()).filter(Boolean);
$('#cfg-in').oninput = e => { CFG.catsIn = lineas(e.target.value); saveCfg(); renderForm(); };
$('#cfg-out').oninput = e => { CFG.catsOut = lineas(e.target.value); saveCfg(); renderForm(); };
$('#cfg-medios').oninput = e => { CFG.medios = lineas(e.target.value); saveCfg(); renderForm(); };
bindNum($('#cfg-base'), CFG.base, v => { CFG.base = v; saveCfg(); });
$('#cfg-denoms').onchange = e => { const vs = e.target.value.split(/[;\n]/).map(x => num(x)).filter(x => x > 0).sort((a,b)=>b-a); CFG.denoms = vs.length ? vs : null; saveCfg(); renderCfg(); toast('Billetes y monedas actualizados'); };

const selTab = tabs(id => { if (id === 'hoy') renderDia(); if (id === 'hist') renderHist(); if (id === 'mes') renderMes(); if (id === 'config') renderCfg(); });
renderForm(); renderDia(); renderHist(); renderMes(); renderCfg();
saveDias();
document.addEventListener('ma:negocio', () => { renderDia(); renderMes(); });
})();

(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, mesNombre, fechaCorta, csv, whatsapp, negocio} = MA;

const v1 = uid(), v2 = uid(), v3 = uid();
const mk = monthKey();
const DEF = {
  esquema:{tipo:'tramos', base:'venta', tasa:5, modoTramo:'total', bono:0,
    tramos:[{desde:0, hasta:10000000, tasa:3},{desde:10000000, hasta:25000000, tasa:5},{desde:25000000, hasta:0, tasa:7}]},
  vendedores:[{id:v1, n:'Laura Gómez', meta:20000000, tel:''},{id:v2, n:'Carlos Pérez', meta:15000000, tel:''},{id:v3, n:'Daniela Ruiz', meta:15000000, tel:''}],
  ventas:[
    {id:uid(), fecha:mk+'-03', vid:v1, cli:'Tienda El Sol', doc:'F-101', monto:4800000, costo:3100000},
    {id:uid(), fecha:mk+'-06', vid:v2, cli:'Minimarket Ana', doc:'F-102', monto:2350000, costo:1500000},
    {id:uid(), fecha:mk+'-09', vid:v1, cli:'Droguería Central', doc:'F-103', monto:7900000, costo:5200000},
    {id:uid(), fecha:mk+'-12', vid:v3, cli:'Panadería Trigal', doc:'F-104', monto:3600000, costo:2300000},
    {id:uid(), fecha:mk+'-15', vid:v2, cli:'Ferretería Norte', doc:'F-105', monto:6100000, costo:4000000},
    {id:uid(), fecha:mk+'-18', vid:v1, cli:'Tienda El Sol', doc:'F-106', monto:9200000, costo:6100000}
  ]
};
let S = Object.assign({}, DEF, store.get('estado', {}));
const save = () => store.set('estado', S);
let mes = monthKey();

$('#btn-csv').innerHTML = I.csv + 'Exportar liquidación (CSV)';
$('#btn-print').innerHTML = I.print + 'Imprimir';
$('#mes').value = mes;
$('#mes').onchange = e => { mes = e.target.value || monthKey(); renderAll(); };

const vend = id => S.vendedores.find(v => v.id === id) || {n:'(vendedor eliminado)', meta:0};
const ventasMes = () => S.ventas.filter(v => v.fecha.slice(0,7) === mes);

/* ---------- Cálculo de comisión ---------- */
function comision(base){
  const E = S.esquema;
  if (base <= 0) return {com:0, tasa:0};
  if (E.tipo === 'fijo') return {com: base * E.tasa / 100, tasa:E.tasa};
  const tr = [...E.tramos].sort((a,b) => a.desde - b.desde);
  if (E.modoTramo === 'total'){
    let t = tr.filter(x => base >= x.desde).pop() || {tasa:0};
    return {com: base * t.tasa / 100, tasa:t.tasa};
  }
  let com = 0;
  tr.forEach(x => { const top = x.hasta > 0 ? x.hasta : Infinity; const parte = Math.max(0, Math.min(base, top) - x.desde); com += parte * x.tasa / 100; });
  return {com, tasa: com / base * 100};
}
function liquidacion(){
  const vs = ventasMes();
  return S.vendedores.map(v => {
    const mias = vs.filter(x => x.vid === v.id);
    const vendido = mias.reduce((a,x) => a + x.monto, 0);
    const costo = mias.reduce((a,x) => a + (x.costo||0), 0);
    const margen = vendido - costo;
    const base = S.esquema.base === 'margen' ? margen : vendido;
    const c = comision(base);
    const cumple = v.meta > 0 ? vendido / v.meta * 100 : null;
    const bono = (S.esquema.bono > 0 && cumple !== null && cumple >= 100) ? S.esquema.bono : 0;
    return {v, n:mias.length, vendido, costo, margen, base, com:c.com, tasa:c.tasa, cumple, bono, total:c.com + bono, ventas:mias};
  }).sort((a,b) => b.vendido - a.vendido);
}

/* ---------- Ventas ---------- */
let edit = null, vMonto = 0, vCosto = 0;
function renderVendSelects(){
  const opts = S.vendedores.map(v => `<option value="${v.id}">${esc(v.n)}</option>`).join('');
  const cur = $('#v-vend').value; $('#v-vend').innerHTML = opts || '<option value="">Agrega un vendedor primero</option>'; if (cur) $('#v-vend').value = cur;
  const cf = $('#filtro-vend').value; $('#filtro-vend').innerHTML = '<option value="">Todos los vendedores</option>' + opts; $('#filtro-vend').value = cf;
}
$('#v-fecha').value = today();
$('#v-costo').dataset.blank0 = '';
bindNum($('#v-monto'), '', v => vMonto = v);
bindNum($('#v-costo'), '', v => vCosto = v);
$('#f-venta').onsubmit = e => {
  e.preventDefault();
  if (!S.vendedores.length){ toast('Primero agrega vendedores en «Vendedores y esquema».', true); return; }
  if (!(vMonto > 0)){ toast('Escribe el valor de la venta.', true); $('#v-monto').focus(); return; }
  const o = {fecha:$('#v-fecha').value || today(), vid:$('#v-vend').value, cli:$('#v-cli').value.trim(), doc:$('#v-doc').value.trim(), monto:vMonto, costo:vCosto};
  if (edit){ Object.assign(S.ventas.find(x => x.id === edit), o); toast('Venta actualizada'); }
  else { S.ventas.push(Object.assign({id:uid()}, o)); toast('Venta agregada'); }
  save(); limpiar();
  if (o.fecha.slice(0,7) !== mes){ mes = o.fecha.slice(0,7); $('#mes').value = mes; }
  renderAll();
};
function limpiar(){ edit = null; vMonto = 0; vCosto = 0; $('#v-cli').value=''; $('#v-doc').value=''; $('#v-monto').value=''; $('#v-costo').value=''; $('#v-btn').textContent='Agregar venta'; }
$('#filtro-vend').onchange = renderVentas;

function renderVentas(){
  const f = $('#filtro-vend').value;
  const vs = ventasMes().filter(v => !f || v.vid === f).sort((a,b) => b.fecha.localeCompare(a.fecha));
  $('#ventas-cap').textContent = mesNombre(mes) + ', ' + vs.length + (vs.length===1?' venta':' ventas');
  if (!vs.length){ $('#ventas-lista').innerHTML = `<div class="empty"><strong>Sin ventas en ${mesNombre(mes).toLowerCase()}</strong>Registra la primera con el formulario.</div>`; return; }
  $('#ventas-lista').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Vendedor</th><th>Cliente</th><th class="r">Venta</th><th></th></tr></thead><tbody>
    ${vs.map(v => `<tr><td>${fechaCorta(v.fecha)}</td><td>${esc(vend(v.vid).n)}</td><td>${esc(v.cli||'')}${v.doc?`<div class="small muted">${esc(v.doc)}</div>`:''}</td>
      <td class="r"><b>${money(v.monto)}</b>${v.costo?`<div class="small muted">Margen ${money(v.monto-v.costo)}</div>`:''}</td>
      <td class="r" style="white-space:nowrap"><button class="btn ghost sm icon" data-ed="${v.id}" aria-label="Editar">${I.edit}</button><button class="btn ghost sm icon" data-del="${v.id}" aria-label="Eliminar">${I.trash}</button></td></tr>`).join('')}
  </tbody></table></div>`;
  $$('#ventas-lista [data-ed]').forEach(b => b.onclick = () => { const v = S.ventas.find(x => x.id === b.dataset.ed); edit = v.id;
    $('#v-fecha').value = v.fecha; $('#v-vend').value = v.vid; $('#v-cli').value = v.cli||''; $('#v-doc').value = v.doc||'';
    vMonto = v.monto; vCosto = v.costo||0; $('#v-monto').value = fmt(v.monto); $('#v-costo').value = v.costo?fmt(v.costo):'';
    $('#v-btn').textContent = 'Guardar cambios'; $('#v-monto').focus(); });
  $$('#ventas-lista [data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar esta venta?'))) return;
    S.ventas = S.ventas.filter(x => x.id !== b.dataset.del); save(); renderAll(); toast('Venta eliminada'); });
}
function renderResumen(){
  const L = liquidacion(); const tv = L.reduce((a,x) => a + x.vendido, 0), tc = L.reduce((a,x) => a + x.total, 0);
  $('#resumen').innerHTML = `<div class="ticket-top"><h3>Comisiones a pagar</h3><span>${mesNombre(mes)}</span></div>
    <div class="ticket-hero"><span>Total del mes</span><strong>${money(tc)}</strong><small>${tv?pct(tc/tv*100,2)+' de lo vendido':'Aún sin ventas'}</small></div>
    <div class="ticket-lines">${L.map(x => `<div class="ticket-line"><span>${esc(x.v.n)}</span><b>${money(x.total)}</b></div>`).join('')}
    <div class="ticket-line total"><span>Total vendido</span><b>${money(tv)}</b></div></div>`;
}

/* ---------- Liquidación ---------- */
function renderLiq(){
  const L = liquidacion(); const E = S.esquema;
  const tv = L.reduce((a,x) => a + x.vendido, 0), tc = L.reduce((a,x) => a + x.total, 0), tm = L.reduce((a,x) => a + x.margen, 0);
  const top = L[0];
  $('#liq-kpis').innerHTML = `<div class="kpi"><span>Total vendido</span><strong>${money(tv)}</strong><small>${ventasMes().length} ventas</small></div>
    <div class="kpi accent"><span>Comisiones y bonos</span><strong>${money(tc)}</strong><small>${tv?pct(tc/tv*100,2)+' de las ventas':''}</small></div>
    <div class="kpi"><span>Margen bruto</span><strong>${money(tm)}</strong><small>${ventasMes().some(v=>v.costo)?'Según costos registrados':'Sin costos registrados'}</small></div>
    <div class="kpi"><span>Mejor vendedor</span><strong style="font-size:1.1rem;margin-top:6px">${top&&top.vendido?esc(top.v.n):'Sin datos'}</strong><small>${top&&top.vendido?money(top.vendido):''}</small></div>`;
  $('#liq-cap').textContent = `${mesNombre(mes)}. ${E.tipo==='fijo'?'Comisión fija del '+pct(E.tasa,2):'Comisión por tramos'} sobre ${E.base==='margen'?'el margen':'el valor vendido'}${E.bono?', bono de '+money(E.bono)+' al cumplir la meta':''}.`;
  if (!S.vendedores.length){ $('#liq-tabla').innerHTML = `<div class="empty"><strong>No hay vendedores</strong>Agrégalos en «Vendedores y esquema».</div>`; $('#ranking').innerHTML=''; return; }
  $('#liq-tabla').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Vendedor</th><th class="r">Ventas</th><th class="r">Vendido</th>${E.base==='margen'?'<th class="r">Margen</th>':''}<th class="r">Meta</th><th class="r">% aplicado</th><th class="r">Comisión</th><th class="r">Bono</th><th class="r">Total a pagar</th><th class="no-print"></th></tr></thead><tbody>
    ${L.map(x => `<tr><td><b>${esc(x.v.n)}</b></td><td class="r">${x.n}</td><td class="r">${money(x.vendido)}</td>${E.base==='margen'?`<td class="r">${money(x.margen)}</td>`:''}
      <td class="r">${x.cumple===null?'<span class="muted">Sin meta</span>':`<span class="pill ${x.cumple>=100?'ok':x.cumple>=70?'mid':'bad'}">${pct(x.cumple,0)}</span>`}</td>
      <td class="r">${pct(x.tasa,2)}</td><td class="r">${money(x.com)}</td><td class="r">${x.bono?money(x.bono):'<span class="muted">0</span>'}</td><td class="r"><b>${money(x.total)}</b></td>
      <td class="r no-print"><button class="btn sm" data-det="${x.v.id}">Ver detalle</button></td></tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td><td class="r">${L.reduce((a,x)=>a+x.n,0)}</td><td class="r">${money(tv)}</td>${E.base==='margen'?`<td class="r">${money(tm)}</td>`:''}<td></td><td></td>
      <td class="r">${money(L.reduce((a,x)=>a+x.com,0))}</td><td class="r">${money(L.reduce((a,x)=>a+x.bono,0))}</td><td class="r">${money(tc)}</td><td class="no-print"></td></tr></tfoot></table></div>`;
  $$('#liq-tabla [data-det]').forEach(b => b.onclick = () => detalle(L.find(x => x.v.id === b.dataset.det)));
  const max = Math.max(...L.map(x => x.vendido), 1);
  $('#ranking').innerHTML = L.map((x,i) => `<div class="bar-row"><span class="lbl">${i+1}. ${esc(x.v.n)}</span><div class="track"><div class="fill" style="width:${x.vendido/max*100}%"></div></div><b class="small">${money(x.vendido)}</b></div>`).join('');
}
function detalle(x){
  const txt = `*Liquidación de comisiones — ${mesNombre(mes)}*\n${x.v.n}\n\nVentas: ${x.n}\nTotal vendido: ${money(x.vendido)}\n${S.esquema.base==='margen'?'Margen: '+money(x.margen)+'\n':''}Porcentaje aplicado: ${pct(x.tasa,2)}\nComisión: ${money(x.com)}\n${x.bono?'Bono por meta: '+money(x.bono)+'\n':''}*Total a pagar: ${money(x.total)}*${negocio().nombre?'\n\n'+negocio().nombre:''}`;
  dialog({title:'Liquidación de '+x.v.n, wide:true, body:`
    <div class="kpis" style="margin-bottom:14px"><div class="kpi"><span>Vendido</span><strong>${money(x.vendido)}</strong></div><div class="kpi"><span>% aplicado</span><strong>${pct(x.tasa,2)}</strong></div><div class="kpi accent"><span>Total a pagar</span><strong>${money(x.total)}</strong></div></div>
    ${x.ventas.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Cliente</th><th>Documento</th><th class="r">Venta</th>${S.esquema.base==='margen'?'<th class="r">Margen</th>':''}</tr></thead><tbody>
    ${x.ventas.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(v => `<tr><td>${fechaCorta(v.fecha)}</td><td>${esc(v.cli||'')}</td><td>${esc(v.doc||'')}</td><td class="r">${money(v.monto)}</td>${S.esquema.base==='margen'?`<td class="r">${money(v.monto-(v.costo||0))}</td>`:''}</tr>`).join('')}</tbody></table></div>`:'<div class="empty">Sin ventas este mes.</div>'}`,
    actions:[{label:'Enviar por WhatsApp', cls:'', onClick:()=>{ whatsapp(txt, x.v.tel); return false; }},{label:'Imprimir', cls:'', onClick:()=>{ imprimirDetalle(x); return false; }},{label:'Cerrar', cls:'primary'}]});
}
function imprimirDetalle(x){
  const w = window.open('', '_blank'); if (!w){ toast('Permite las ventanas emergentes para imprimir.', true); return; }
  const n = negocio();
  w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Liquidación ${esc(x.v.n)}</title><style>body{font:12pt system-ui,sans-serif;margin:28px;color:#111}h1{font-size:17pt;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:14px}td,th{padding:6px 8px;border-bottom:1px solid #ccc;text-align:left}.r{text-align:right}.tot td{font-weight:700;border-top:2px solid #111}.sig{margin-top:60px;display:flex;gap:60px}.sig div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:10pt}.foot{margin-top:30px;font-size:8.5pt;color:#666;text-align:center}</style></head><body>
    ${n.logo?`<img src="${n.logo}" style="height:54px;float:right">`:''}<h1>Liquidación de comisiones</h1><div>${esc(n.nombre||'')} ${n.doc?'· '+esc(n.doc):''}</div><div>Periodo: <b>${mesNombre(mes)}</b> — Vendedor: <b>${esc(x.v.n)}</b></div>
    <table><thead><tr><th>Fecha</th><th>Cliente</th><th>Documento</th><th class="r">Venta</th></tr></thead><tbody>${x.ventas.map(v=>`<tr><td>${fechaCorta(v.fecha)}</td><td>${esc(v.cli||'')}</td><td>${esc(v.doc||'')}</td><td class="r">${money(v.monto)}</td></tr>`).join('')}</tbody></table>
    <table><tbody><tr><td>Total vendido</td><td class="r">${money(x.vendido)}</td></tr>${S.esquema.base==='margen'?`<tr><td>Margen</td><td class="r">${money(x.margen)}</td></tr>`:''}<tr><td>Porcentaje aplicado</td><td class="r">${pct(x.tasa,2)}</td></tr><tr><td>Comisión</td><td class="r">${money(x.com)}</td></tr><tr><td>Bono por meta</td><td class="r">${money(x.bono)}</td></tr><tr class="tot"><td>Total a pagar</td><td class="r">${money(x.total)}</td></tr></tbody></table>
    <div class="sig"><div>Firma de quien paga</div><div>Firma del vendedor</div></div>
    <div class="foot">Generado con Comisiones de Venta, desarrollada por José Lugo. WhatsApp +57 312 638 7467, jose.lugocdv@gmail.com</div>
    </body></html>`);
  w.document.close(); MA.imprimirVentana(w);
}
$('#btn-print').onclick = () => window.print();
$('#btn-csv').onclick = () => {
  const L = liquidacion();
  csv('comisiones-'+mes, [['Mes','Vendedor','Ventas','Vendido','Costo','Margen','Base de cálculo','% aplicado','Comisión','Bono','Total a pagar'],
    ...L.map(x => [mes, x.v.n, x.n, fmt(x.vendido), fmt(x.costo), fmt(x.margen), fmt(x.base), fmt(x.tasa,2), fmt(x.com), fmt(x.bono), fmt(x.total)])]);
};

/* ---------- Configuración ---------- */
function renderConfig(){
  const E = S.esquema;
  $$('#tipo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === E.tipo));
  $$('#base button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === E.base));
  $$('#modo-tramo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === E.modoTramo));
  $('#cfg-fijo').hidden = E.tipo !== 'fijo'; $('#cfg-tramos').hidden = E.tipo !== 'tramos';
  $('#tramo-hint').textContent = E.modoTramo === 'total'
    ? 'Ejemplo: si vende 12 millones y el tramo de 10 a 25 millones paga 5%, gana el 5% de los 12 millones.'
    : 'Ejemplo: los primeros 10 millones al 3% y los 2 millones siguientes al 5%.';
  $('#tramos').innerHTML = E.tramos.map((t,i) => `<tr data-i="${i}"><td><input class="input num" data-k="desde" inputmode="decimal" aria-label="Desde"></td><td><input class="input num" data-k="hasta" inputmode="decimal" placeholder="Sin límite" aria-label="Hasta"></td><td><input class="input num" data-k="tasa" inputmode="decimal" style="max-width:80px" aria-label="Porcentaje"></td><td><button class="btn ghost sm icon" data-k="del" aria-label="Quitar tramo">${I.trash}</button></td></tr>`).join('');
  $$('#tramos tr').forEach(tr => { const t = E.tramos[+tr.dataset.i];
    bindNum(tr.querySelector('[data-k=desde]'), t.desde, v => { t.desde = v; save(); }, 0);
    const h = tr.querySelector('[data-k=hasta]'); h.dataset.blank0=''; bindNum(h, t.hasta, v => { t.hasta = v; save(); }, 0);
    bindNum(tr.querySelector('[data-k=tasa]'), t.tasa, v => { t.tasa = v; save(); });
    tr.querySelector('[data-k=del]').onclick = () => { E.tramos.splice(+tr.dataset.i, 1); save(); renderConfig(); }; });
  $('#vendedores').innerHTML = S.vendedores.map(v => `<tr data-id="${v.id}"><td><input class="input" data-k="n" value="${esc(v.n)}" aria-label="Nombre" style="min-width:130px"></td><td><input class="input num" data-k="meta" inputmode="decimal" aria-label="Meta" style="min-width:110px"></td><td><input class="input" data-k="tel" value="${esc(v.tel||'')}" inputmode="tel" placeholder="Opcional" aria-label="WhatsApp" style="min-width:110px"></td><td><button class="btn ghost sm icon" data-k="del" aria-label="Quitar">${I.trash}</button></td></tr>`).join('');
  $$('#vendedores tr').forEach(tr => { const v = S.vendedores.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-k=n]').oninput = e => { v.n = e.target.value; save(); renderVendSelects(); };
    tr.querySelector('[data-k=tel]').oninput = e => { v.tel = e.target.value; save(); };
    const m = tr.querySelector('[data-k=meta]'); m.dataset.blank0=''; bindNum(m, v.meta, x => { v.meta = x; save(); }, 0);
    tr.querySelector('[data-k=del]').onclick = async () => {
      if (S.ventas.some(x => x.vid === v.id) && !(await confirmar(`${v.n} tiene ventas registradas. Si lo quitas, esas ventas quedarán sin vendedor.`, 'Quitar vendedor'))) return;
      S.vendedores = S.vendedores.filter(x => x !== v); save(); renderConfig(); renderVendSelects(); }; });
}
$$('#tipo button').forEach(b => b.onclick = () => { S.esquema.tipo = b.dataset.v; save(); renderConfig(); });
$$('#base button').forEach(b => b.onclick = () => { S.esquema.base = b.dataset.v; save(); renderConfig(); });
$$('#modo-tramo button').forEach(b => b.onclick = () => { S.esquema.modoTramo = b.dataset.v; save(); renderConfig(); });
bindNum($('#tasa'), S.esquema.tasa, v => { S.esquema.tasa = v; save(); });
$('#bono').dataset.blank0 = ''; bindNum($('#bono'), S.esquema.bono, v => { S.esquema.bono = v; save(); }, 0);
$('#add-tramo').onclick = () => { const last = S.esquema.tramos[S.esquema.tramos.length-1]; S.esquema.tramos.push({desde:last?(last.hasta||last.desde):0, hasta:0, tasa:last?last.tasa+1:3}); if (last && !last.hasta) last.hasta = last.desde; save(); renderConfig(); };
$('#add-vend').onclick = () => { S.vendedores.push({id:uid(), n:'', meta:0, tel:''}); save(); renderConfig(); renderVendSelects(); const ins = $$('#vendedores tr:last-child input'); ins[0] && ins[0].focus(); };

function renderAll(){ renderVendSelects(); renderVentas(); renderResumen(); renderLiq(); }
tabs(id => { if (id !== 'config') renderAll(); else renderConfig(); });
renderAll(); renderConfig();
})();

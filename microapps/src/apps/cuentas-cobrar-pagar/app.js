(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, fechaCorta, fechaLarga, csv, whatsapp, negocio, imprimirDoc} = MA;

const cur = () => negocio().moneda || 'COP';
const addDays = (iso, d) => { const [y,m,dd] = iso.split('-').map(Number); const x = new Date(y, m-1, dd + d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
const dias = (a, b) => { const [y1,m1,d1] = a.split('-').map(Number), [y2,m2,d2] = b.split('-').map(Number); return Math.round((Date.UTC(y2,m2-1,d2) - Date.UTC(y1,m1-1,d1)) / 864e5); };

let DOCS = store.get('docs', null), TER = store.get('terceros', {});
if (!DOCS){
  const h = today();
  const d = (lado, t, doc, fOff, plazo, monto, conc, abonos=[]) => ({id:uid(), lado, ter:t, doc, fecha:addDays(h,fOff), vence:addDays(h,fOff+plazo), monto, conc, abonos:abonos.map(a => ({id:uid(), fecha:addDays(h,a[0]), monto:a[1], medio:'Transferencia', nota:''}))});
  DOCS = [
    d('cxc','Tienda El Sol','FV-0101',-75,30,3200000,'Mercancía surtida',[[-50,1000000]]),
    d('cxc','Droguería Central','FV-0108',-40,30,1850000,'Pedido mensual'),
    d('cxc','Panadería Trigal','FV-0115',-20,30,960000,'Insumos',[[-5,400000]]),
    d('cxc','Tienda El Sol','FV-0122',-8,30,2450000,'Mercancía surtida'),
    d('cxc','Ferretería Norte','FV-0090',-120,30,1500000,'Herramientas'),
    d('cxp','Distribuidora Andina','FC-881',-35,30,4100000,'Compra de inventario',[[-10,2000000]]),
    d('cxp','Empaques del Valle','FC-2290',-12,15,780000,'Bolsas y cajas'),
    d('cxp','Arrendamientos Prado','ARR-OCT',-3,5,1200000,'Arriendo del local')
  ];
  TER = {'Tienda El Sol':{tel:'',doc:''}};
}
const saveDocs = () => store.set('docs', DOCS), saveTer = () => store.set('terceros', TER);
saveDocs();

const abonado = d => d.abonos.reduce((a,x) => a + x.monto, 0);
const saldo = d => Math.max(0, d.monto - abonado(d));
const mora = d => saldo(d) > 0 && d.vence ? dias(d.vence, today()) : 0; // positivo = días vencido
function estado(d){ if (saldo(d) <= 0.004) return 'pag'; return mora(d) > 0 ? 'venc' : 'pend'; }
const L = {cxc:{n:'Por cobrar', ter:'Cliente', nuevo:'Nueva cuenta por cobrar', abono:'Registrar pago recibido', kpi:'Total por cobrar'},
           cxp:{n:'Por pagar', ter:'Proveedor', nuevo:'Nueva cuenta por pagar', abono:'Registrar pago hecho', kpi:'Total por pagar'}};
let lado = 'cxc';

/* ---------- Lista ---------- */
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)';
$('#q').addEventListener('input', renderLista); $('#f-estado').addEventListener('change', renderLista);
function renderLista(){
  const c = cur(), ds = DOCS.filter(d => d.lado === lado);
  $('#btn-nuevo').innerHTML = I.plus + L[lado].nuevo;
  const pend = ds.filter(d => estado(d) !== 'pag');
  const tot = pend.reduce((a,d) => a + saldo(d), 0);
  const venc = pend.filter(d => estado(d) === 'venc'), tv = venc.reduce((a,d) => a + saldo(d), 0);
  const prox = pend.filter(d => estado(d) === 'pend' && d.vence && dias(today(), d.vence) <= 7);
  const morPond = tot ? pend.reduce((a,d) => a + Math.max(0, mora(d)) * saldo(d), 0) / tot : 0;
  $('#kpis').innerHTML = `<div class="kpi accent"><span>${L[lado].kpi}</span><strong>${money(tot,c)}</strong><small>${pend.length} documentos abiertos</small></div>
    <div class="kpi"><span>Vencido</span><strong class="${tv?'neg':''}">${money(tv,c)}</strong><small>${tot?pct(tv/tot*100,0)+' del total':'Sin saldo'}</small></div>
    <div class="kpi"><span>Vence en 7 días</span><strong class="${prox.length?'warn':''}">${money(prox.reduce((a,d)=>a+saldo(d),0),c)}</strong><small>${prox.length} documentos</small></div>
    <div class="kpi"><span>Mora promedio</span><strong>${fmt(Math.round(morPond),0)} días</strong><small>Ponderada por saldo</small></div>`;
  const Q = $('#q').value.trim().toLowerCase(), F = $('#f-estado').value;
  const list = ds.filter(d => (!F || (F === 'pend' ? estado(d) !== 'pag' : estado(d) === F)) && (!Q || (d.ter+' '+d.doc+' '+(d.conc||'')).toLowerCase().includes(Q)))
    .sort((a,b) => (a.vence||'').localeCompare(b.vence||''));
  if (!ds.length){ $('#lista').innerHTML = `<div class="empty"><strong>No hay cuentas ${lado==='cxc'?'por cobrar':'por pagar'}</strong>Registra la primera factura o documento.</div>`; return; }
  if (!list.length){ $('#lista').innerHTML = `<div class="empty"><strong>Nada en este filtro</strong>Cambia el estado o la búsqueda.</div>`; return; }
  $('#lista').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>${L[lado].ter}</th><th>Documento</th><th>Vence</th><th class="r">Valor</th><th class="r">Abonado</th><th class="r">Saldo</th><th>Estado</th><th class="no-print"></th></tr></thead><tbody>
    ${list.map(d => { const e = estado(d), m = mora(d);
      return `<tr><td><b>${esc(d.ter)}</b>${d.conc?`<div class="small muted">${esc(d.conc)}</div>`:''}</td><td>${esc(d.doc||'')}<div class="small muted">${fechaCorta(d.fecha)}</div></td>
      <td>${d.vence?fechaCorta(d.vence):''}<div class="small ${e==='venc'?'neg':'muted'}">${e==='pag'?'':e==='venc'?m+' días de mora':m===0?'Vence hoy':'Faltan '+(-m)+' días'}</div></td>
      <td class="r">${money(d.monto,c)}</td><td class="r">${abonado(d)?money(abonado(d),c):'<span class="muted">0</span>'}</td><td class="r"><b>${money(saldo(d),c)}</b></td>
      <td>${e==='pag'?'<span class="pill ok">Pagada</span>':e==='venc'?'<span class="pill bad">Vencida</span>':'<span class="pill mid">Al día</span>'}</td>
      <td class="r no-print" style="white-space:nowrap">${e!=='pag'?`<button class="btn sm" data-ab="${d.id}">Abonar</button>`:''}
        ${lado==='cxc'&&e!=='pag'?`<button class="btn ghost sm icon" data-wa="${d.id}" aria-label="Recordatorio por WhatsApp">${I.wa}</button>`:''}
        <button class="btn ghost sm icon" data-ed="${d.id}" aria-label="Ver o editar">${I.edit}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  const byId = id => DOCS.find(x => x.id === id);
  $$('#lista [data-ab]').forEach(b => b.onclick = () => abonar(byId(b.dataset.ab)));
  $$('#lista [data-wa]').forEach(b => b.onclick = () => recordar(byId(b.dataset.wa)));
  $$('#lista [data-ed]').forEach(b => b.onclick = () => editar(byId(b.dataset.ed)));
}
function terceros(ld){ return [...new Set(DOCS.filter(d => !ld || d.lado === ld).map(d => d.ter))].sort(); }

function editar(d){
  const nuevo = !d; d = d || {id:uid(), lado, ter:'', doc:'', fecha:today(), vence:addDays(today(), 30), monto:0, conc:'', abonos:[]};
  let monto = d.monto; const t = TER[d.ter] || {};
  dialog({title: nuevo ? L[d.lado].nuevo : (d.doc || 'Documento') + ', ' + d.ter, wide:!nuevo, body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>${L[d.lado].ter}</span><input class="input" id="e-ter" value="${esc(d.ter)}" list="dl-ter"><datalist id="dl-ter">${terceros(d.lado).map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="field"><span>WhatsApp</span><input class="input" id="e-tel" value="${esc(t.tel||'')}" inputmode="tel" placeholder="Opcional"></label>
    <label class="field"><span>Documento (factura, cuenta)</span><input class="input" id="e-doc" value="${esc(d.doc)}"></label>
    <label class="field"><span>Fecha</span><input class="input" type="date" id="e-fecha" value="${d.fecha}"></label>
    <label class="field"><span>Vence</span><input class="input" type="date" id="e-vence" value="${d.vence||''}"></label>
    <label class="field"><span>Valor</span><input class="input num" id="e-monto" inputmode="decimal"></label>
    <label class="field"><span>Concepto</span><input class="input" id="e-conc" value="${esc(d.conc||'')}"></label>
  </div>
  ${!nuevo?`<h3 style="margin:18px 0 8px">Abonos</h3>${d.abonos.length?`<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Medio</th><th>Nota</th><th class="r">Valor</th><th></th></tr></thead><tbody>
    ${d.abonos.map(a => `<tr><td>${fechaCorta(a.fecha)}</td><td>${esc(a.medio||'')}</td><td>${esc(a.nota||'')}</td><td class="r">${money(a.monto,cur())}</td><td><button class="btn ghost sm icon" data-delab="${a.id}" aria-label="Eliminar abono">${I.trash}</button></td></tr>`).join('')}
    </tbody></table></div>`:'<p class="muted small">Sin abonos registrados.</p>'}<p style="margin-top:10px">Saldo: <b>${money(saldo(d),cur())}</b></p>`:''}`,
    actions:[
      ...(nuevo?[]:[{label:'Eliminar', cls:'ghost danger', onClick:async ()=>{ if (!(await confirmar('¿Eliminar este documento y sus abonos?'))) return false; DOCS = DOCS.filter(x => x.id !== d.id); saveDocs(); renderAll(); toast('Documento eliminado'); }}]),
      {label:'Cancelar', cls:'ghost'},
      {label: nuevo?'Guardar':'Guardar cambios', cls:'primary', onClick:(dl)=>{
        const ter = $('#e-ter',dl).value.trim(); if (!ter){ toast('Escribe el nombre del '+L[d.lado].ter.toLowerCase()+'.', true); return false; }
        if (!(monto > 0)){ toast('Escribe el valor.', true); return false; }
        Object.assign(d, {ter, doc:$('#e-doc',dl).value.trim(), fecha:$('#e-fecha',dl).value||today(), vence:$('#e-vence',dl).value, monto, conc:$('#e-conc',dl).value.trim()});
        const tel = $('#e-tel',dl).value.trim(); TER[ter] = Object.assign(TER[ter]||{}, {tel}); saveTer();
        if (nuevo) DOCS.push(d); saveDocs(); renderAll(); toast(nuevo?'Documento guardado':'Cambios guardados'); }}],
    onOpen: dl => { bindNum($('#e-monto',dl), d.monto, v => monto = v);
      $('#e-ter',dl).addEventListener('change', e => { const tt = TER[e.target.value.trim()]; if (tt && tt.tel) $('#e-tel',dl).value = tt.tel; });
      $$('[data-delab]', dl).forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este abono?'))) return; d.abonos = d.abonos.filter(a => a.id !== b.dataset.delab); saveDocs(); renderAll(); dl.querySelector('[data-x]').click(); editar(d); });
      if (nuevo) $('#e-ter',dl).focus(); }});
}
$('#btn-nuevo').onclick = () => editar();

function abonar(d){
  let v = saldo(d);
  dialog({title: L[d.lado].abono, body:`<p class="muted small" style="margin-bottom:12px">${esc(d.ter)}, ${esc(d.doc||'')}. Saldo actual: <b>${money(saldo(d),cur())}</b></p>
    <div class="fields"><label class="field"><span>Valor del pago</span><input class="input num" id="a-v" inputmode="decimal"></label>
    <label class="field"><span>Fecha</span><input class="input" type="date" id="a-f" value="${today()}"></label>
    <label class="field"><span>Medio</span><select class="input" id="a-m"><option>Transferencia</option><option>Efectivo</option><option>Nequi</option><option>Daviplata</option><option>Pago móvil</option><option>Zelle</option><option>Tarjeta</option><option>Cheque</option></select></label>
    <label class="field"><span>Nota</span><input class="input" id="a-n" placeholder="Opcional"></label></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Registrar pago', cls:'primary', onClick:(dl)=>{
      if (!(v > 0)){ toast('Escribe el valor del pago.', true); return false; }
      if (v > saldo(d) + 0.004){ toast('El pago supera el saldo de '+money(saldo(d),cur())+'.', true); return false; }
      d.abonos.push({id:uid(), fecha:$('#a-f',dl).value||today(), monto:v, medio:$('#a-m',dl).value, nota:$('#a-n',dl).value.trim()});
      saveDocs(); renderAll(); toast(saldo(d) <= 0.004 ? 'Documento pagado por completo' : 'Abono registrado. Saldo: '+money(saldo(d),cur())); }}],
    onOpen: dl => { bindNum($('#a-v',dl), v, x => v = x); $('#a-v',dl).focus(); }});
}
function recordar(d){
  const n = negocio(), m = mora(d), c = cur();
  const txt = `Hola ${d.ter}, te saludamos${n.nombre?' de *'+n.nombre+'*':''}. Te recordamos el saldo pendiente de la factura *${d.doc||''}* por *${money(saldo(d),c)}*, ${m>0?'vencida hace '+m+' días':m===0?'que vence hoy':'que vence el '+fechaLarga(d.vence)}.\n\nSi ya realizaste el pago, por favor envíanos el soporte. ¡Gracias!`;
  whatsapp(txt, (TER[d.ter]||{}).tel);
}
$('#btn-csv').onclick = () => { const c = cur();
  csv((lado==='cxc'?'cuentas-por-cobrar-':'cuentas-por-pagar-')+today(), [[L[lado].ter,'Documento','Concepto','Fecha','Vence','Días de mora','Valor','Abonado','Saldo','Estado','Moneda'],
    ...DOCS.filter(d => d.lado === lado).map(d => [d.ter, d.doc, d.conc||'', d.fecha, d.vence||'', Math.max(0,mora(d)), fmt(d.monto), fmt(abonado(d)), fmt(saldo(d)), {pag:'Pagada',venc:'Vencida',pend:'Al día'}[estado(d)], c])]); };

/* ---------- Antigüedad ---------- */
let edadLado = 'cxc';
const BUCKETS = [['Al día', m => m <= 0],['1 a 30', m => m >= 1 && m <= 30],['31 a 60', m => m >= 31 && m <= 60],['61 a 90', m => m >= 61 && m <= 90],['Más de 90', m => m > 90]];
$('#edad-print').innerHTML = I.print + 'Imprimir informe';
$$('#edad-lado button').forEach(b => b.onclick = () => { edadLado = b.dataset.v; renderEdad(); });
function edadData(){
  const filas = {}; DOCS.filter(d => d.lado === edadLado && estado(d) !== 'pag').forEach(d => {
    const f = filas[d.ter] = filas[d.ter] || [0,0,0,0,0]; const i = BUCKETS.findIndex(b => b[1](mora(d))); f[i] += saldo(d); });
  const rows = Object.entries(filas).map(([t,v]) => ({t, v, tot:v.reduce((a,x)=>a+x,0)})).sort((a,b) => b.tot - a.tot);
  const tots = BUCKETS.map((_,i) => rows.reduce((a,r) => a + r.v[i], 0)); return {rows, tots, total:tots.reduce((a,x)=>a+x,0)};
}
function edadTabla(E, c){
  return `<table class="t"><thead><tr><th>${L[edadLado].ter}</th>${BUCKETS.map(b => `<th class="r">${b[0]}</th>`).join('')}<th class="r">Total</th></tr></thead><tbody>
    ${E.rows.map(r => `<tr><td><b>${esc(r.t)}</b></td>${r.v.map((x,i) => `<td class="r ${x&&i>=2?'neg':''}">${x?money(x,c):'<span class="muted">-</span>'}</td>`).join('')}<td class="r"><b>${money(r.tot,c)}</b></td></tr>`).join('')}
    </tbody><tfoot><tr><td>Total</td>${E.tots.map(x => `<td class="r">${money(x,c)}</td>`).join('')}<td class="r">${money(E.total,c)}</td></tr>
    <tr><td>Participación</td>${E.tots.map(x => `<td class="r">${E.total?pct(x/E.total*100,0):''}</td>`).join('')}<td class="r">100%</td></tr></tfoot></table>`;
}
function renderEdad(){
  $$('#edad-lado button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === edadLado));
  $('#edad-tit').textContent = edadLado === 'cxc' ? 'Antigüedad de la cartera por cobrar' : 'Antigüedad de las cuentas por pagar';
  const E = edadData(), c = cur();
  $('#edad-kpis').innerHTML = BUCKETS.map((b,i) => `<div class="kpi ${i===0?'accent':''}"><span>${i===0?'Al día':b[0]+' días'}</span><strong class="${i>=2&&E.tots[i]?'neg':''}">${money(E.tots[i],c)}</strong><small>${E.total?pct(E.tots[i]/E.total*100,0)+' del saldo':''}</small></div>`).join('');
  $('#edad-tabla').innerHTML = E.rows.length ? `<div class="table-wrap">${edadTabla(E,c)}</div>` : `<div class="empty"><strong>Sin saldos pendientes</strong>Todo está pagado.</div>`;
}
$('#edad-print').onclick = () => { const E = edadData(), c = cur();
  imprimirDoc(edadLado==='cxc'?'Antigüedad de cartera':'Antigüedad de cuentas por pagar', `<div class="kp">${BUCKETS.map((b,i)=>`<div><span>${i===0?'Al día':b[0]+' días'}</span><b>${money(E.tots[i],c)}</b></div>`).join('')}</div>${edadTabla(E,c)}`, 'Saldos al '+fechaLarga(today())); };

/* ---------- Estados de cuenta ---------- */
$('#t-q').addEventListener('input', renderTer);
function renderTer(){
  const c = cur(), Q = $('#t-q').value.trim().toLowerCase();
  const ts = terceros().filter(t => !Q || t.toLowerCase().includes(Q));
  if (!ts.length){ $('#terceros').innerHTML = `<div class="empty"><strong>Sin clientes ni proveedores</strong>Aparecen aquí al registrar documentos.</div>`; return; }
  $('#terceros').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Nombre</th><th class="r">Nos debe</th><th class="r">Le debemos</th><th class="r">Vencido</th><th></th></tr></thead><tbody>
    ${ts.map(t => { const ds = DOCS.filter(d => d.ter === t); const cxc = ds.filter(d=>d.lado==='cxc').reduce((a,d)=>a+saldo(d),0), cxp = ds.filter(d=>d.lado==='cxp').reduce((a,d)=>a+saldo(d),0);
      const v = ds.filter(d => estado(d)==='venc').reduce((a,d)=>a+saldo(d),0);
      return `<tr><td><b>${esc(t)}</b><div class="small muted">${ds.length} documentos</div></td><td class="r">${cxc?money(cxc,c):'<span class="muted">-</span>'}</td><td class="r">${cxp?money(cxp,c):'<span class="muted">-</span>'}</td><td class="r ${v?'neg':''}">${v?money(v,c):'<span class="muted">-</span>'}</td>
      <td class="r"><button class="btn sm" data-ec="${esc(t)}">Estado de cuenta</button></td></tr>`; }).join('')}</tbody></table></div>`;
  $$('#terceros [data-ec]').forEach(b => b.onclick = () => estadoCuenta(b.dataset.ec));
}
function ecHTML(t, c){
  const ds = DOCS.filter(d => d.ter === t).sort((a,b) => a.fecha.localeCompare(b.fecha));
  const bloque = ld => { const x = ds.filter(d => d.lado === ld); if (!x.length) return '';
    const tot = x.reduce((a,d)=>a+saldo(d),0);
    return `<h2>${ld==='cxc'?'Saldo a nuestro favor':'Saldo a su favor'}</h2><table><thead><tr><th>Documento</th><th>Fecha</th><th>Vence</th><th class="r">Valor</th><th class="r">Abonos</th><th class="r">Saldo</th><th>Estado</th></tr></thead><tbody>
      ${x.map(d => `<tr><td>${esc(d.doc||'')}${d.conc?'<br><small>'+esc(d.conc)+'</small>':''}</td><td>${fechaCorta(d.fecha)}</td><td>${d.vence?fechaCorta(d.vence):''}</td><td class="r">${money(d.monto,c)}</td><td class="r">${money(abonado(d),c)}</td><td class="r"><b>${money(saldo(d),c)}</b></td><td>${estado(d)==='pag'?'Pagada':estado(d)==='venc'?'<span class="neg">Vencida '+mora(d)+' d</span>':'Al día'}</td></tr>`).join('')}
      </tbody><tfoot><tr><td colspan="5">Total pendiente</td><td class="r">${money(tot,c)}</td><td></td></tr></tfoot></table>`; };
  return bloque('cxc') + bloque('cxp');
}
function estadoCuenta(t){
  const c = cur(), cxc = DOCS.filter(d => d.ter === t && d.lado === 'cxc' && estado(d) !== 'pag');
  dialog({title:'Estado de cuenta de '+t, wide:true, body:`<div class="ec">${ecHTML(t, c).replace(/<h2>/g,'<h3 style="margin:14px 0 6px">').replace(/<\/h2>/g,'</h3>').replace(/<table>/g,'<div class="table-wrap"><table class="t">').replace(/<\/table>/g,'</table></div>')}</div>`,
    actions:[...(cxc.length?[{label:'Enviar por WhatsApp', onClick:()=>{ const n = negocio();
        const txt = `Hola ${t}, te compartimos tu estado de cuenta${n.nombre?' con *'+n.nombre+'*':''} al ${fechaLarga(today())}:\n\n` + cxc.map(d => `• ${d.doc||'Documento'}: ${money(saldo(d),c)}${estado(d)==='venc'?' (vencida hace '+mora(d)+' días)':' (vence '+fechaCorta(d.vence)+')'}`).join('\n') + `\n\n*Total pendiente: ${money(cxc.reduce((a,d)=>a+saldo(d),0),c)}*\n\nGracias por tu atención.`;
        whatsapp(txt, (TER[t]||{}).tel); return false; }}]:[]),
      {label:'Imprimir', cls:'primary', onClick:()=>{ imprimirDoc('Estado de cuenta', `<p><b>${esc(t)}</b></p>` + ecHTML(t, c), 'Cortado al '+fechaLarga(today())); return false; }}]});
}

function renderAll(){ renderLista(); renderEdad(); renderTer(); }
tabs(id => { if (id === 'cxc' || id === 'cxp'){ lado = id; $('[data-panel=lado]').hidden = false; renderLista(); } if (id === 'edad') renderEdad(); if (id === 'terceros') renderTer(); });
renderAll();
document.addEventListener('ma:negocio', renderAll);
})();

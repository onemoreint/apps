(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, fechaCorta, fechaLarga, csv, whatsapp, negocio, MONEDAS} = MA;

const TIPOS = {
  cot:{n:'Cotización', t:'COTIZACIÓN', pre:'COT-', vence:'Válida hasta', cli:'Cliente', est:['Borrador','Enviada','Aceptada','Rechazada']},
  fac:{n:'Factura', t:'FACTURA DE VENTA', pre:'FV-', vence:'Vence', cli:'Cliente', est:['Pendiente','Pagada','Anulada']},
  cc:{n:'Cuenta de cobro', t:'CUENTA DE COBRO', pre:'CC-', vence:'Fecha límite de pago', cli:'Debe a nombre de', est:['Pendiente','Pagada','Anulada']},
  rc:{n:'Recibo de caja', t:'RECIBO DE CAJA', pre:'RC-', vence:'', cli:'Recibimos de', est:['Pagado','Anulado']},
  rem:{n:'Remisión', t:'REMISIÓN', pre:'REM-', vence:'Fecha de entrega', cli:'Entregar a', est:['Pendiente','Entregada','Anulada']}
};
const DEF_CFG = {
  num:{cot:1, fac:1, cc:1, rc:1, rem:1}, pre:{cot:'COT-', fac:'FV-', cc:'CC-', rc:'RC-', rem:'REM-'},
  iva:19, dias:15, usaIva:true, pagos:'',
  legal:'Este documento no reemplaza la factura electrónica cuando la ley la exige.'
};
let CFG = Object.assign({}, DEF_CFG, store.get('cfg', {}));
CFG.num = Object.assign({}, DEF_CFG.num, CFG.num); CFG.pre = Object.assign({}, DEF_CFG.pre, CFG.pre);
let DOCS = store.get('docs', []);
let CLI = store.get('clientes', []);
let PROD = store.get('productos', [
  {id:uid(), d:'Diseño de logotipo', p:450000, iva:19},
  {id:uid(), d:'Página web informativa', p:1800000, iva:19},
  {id:uid(), d:'Gestión de redes sociales (mes)', p:900000, iva:19}
]);
const saveCfg = () => store.set('cfg', CFG), saveDocs = () => store.set('docs', DOCS), saveCli = () => store.set('clientes', CLI), saveProd = () => store.set('productos', PROD);

const addDays = (iso, d) => { const [y,m,dd] = iso.split('-').map(Number); const x = new Date(y, m-1, dd + d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
const numDoc = t => CFG.pre[t] + String(CFG.num[t]).padStart(4, '0');
const cur = () => negocio().moneda || 'COP';

function nuevoDoc(tipo='cot'){
  return {id:null, tipo, num:numDoc(tipo), fecha:today(), vence:TIPOS[tipo].vence?addDays(today(), +CFG.dias||0):'', cli:{n:'',doc:'',tel:'',email:'',dir:''},
    items:[{d:'', c:1, p:0, ds:0, iva:CFG.usaIva?CFG.iva:0}], notas:'', cond:'', estado:TIPOS[tipo].est[0]};
}
let D = store.get('borrador', null) || nuevoDoc();
const saveD = () => store.set('borrador', D);

/* ---------- Totales ---------- */
function totales(doc){
  let sub=0, desc=0, iva=0; const porTasa = {};
  doc.items.forEach(it => { const b = (+it.c||0)*(+it.p||0), ds = b*(+it.ds||0)/100, base = b-ds, iv = CFG.usaIva ? base*(+it.iva||0)/100 : 0;
    sub += b; desc += ds; iva += iv; if (iv) porTasa[it.iva] = (porTasa[it.iva]||0) + iv; });
  return {sub, desc, base:sub-desc, iva, porTasa, total:sub-desc+iva};
}

/* ---------- Número a letras ---------- */
const U = ['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
const DEC = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const CEN = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
function cientos(n){ if (n===0) return ''; if (n===100) return 'cien'; const c = Math.floor(n/100), r = n%100;
  let s = CEN[c]; if (r){ s += (s?' ':'') + (r < 30 ? U[r] : DEC[Math.floor(r/10)] + (r%10 ? ' y ' + U[r%10] : '')); } return s; }
function miles(n){ const m = Math.floor(n/1000), r = n%1000; let s = '';
  if (m) s = (m === 1 ? 'mil' : cientos(m).replace(/veintiuno$/,'veintiún').replace(/uno$/,'un') + ' mil');
  if (r) s += (s?' ':'') + cientos(r); return s; }
function letras(v){
  const n = Math.floor(Math.abs(v)); if (n === 0) return 'cero';
  const mill = Math.floor(n/1e6), r = n % 1e6; let s = '';
  if (mill){ s = mill === 1 ? 'un millón' : miles(mill).replace(/veintiuno$/,'veintiún').replace(/uno$/,'un') + ' millones'; }
  if (r) s += (s?' ':'') + miles(r);
  return s;
}
function enLetras(v, c){
  const nombres = {COP:['peso','pesos'], USD:['dólar','dólares'], VES:['bolívar','bolívares'], EUR:['euro','euros'], MXN:['peso','pesos'], PEN:['sol','soles'], CLP:['peso','pesos'], ARS:['peso','pesos'], DOP:['peso','pesos'], GTQ:['quetzal','quetzales'], BOB:['boliviano','bolivianos']};
  const nm = nombres[c] || ['unidad','unidades']; const ent = Math.floor(v + 1e-9), cent = Math.round((v - ent) * 100);
  let s = letras(ent); s = s.replace(/veintiuno$/,'veintiún').replace(/uno$/,'un');
  const millonesDe = /(millón|millones)$/.test(s) ? ' de' : '';
  s = s.charAt(0).toUpperCase() + s.slice(1) + millonesDe + ' ' + (ent === 1 ? nm[0] : nm[1]);
  if ((MONEDAS[c]||{d:2}).d > 0 && cent > 0) s += ' con ' + String(cent).padStart(2,'0') + '/100';
  return s;
}

/* ---------- Editor ---------- */
$('#add-item').innerHTML = I.plus + 'Agregar línea';
$('#btn-ver').innerHTML = I.print + 'Ver e imprimir';
$('#btn-wa').innerHTML = I.wa + 'WhatsApp';
$('#tipo').innerHTML = Object.entries(TIPOS).map(([k,v]) => `<button type="button" data-v="${k}">${v.n}</button>`).join('');
$$('#tipo button').forEach(b => b.onclick = () => {
  if (D.tipo === b.dataset.v) return;
  const autoNum = !D.id && D.num === numDoc(D.tipo);
  D.tipo = b.dataset.v; if (autoNum) D.num = numDoc(D.tipo);
  if (!TIPOS[D.tipo].est.includes(D.estado)) D.estado = TIPOS[D.tipo].est[0];
  if (TIPOS[D.tipo].vence && !D.vence) D.vence = addDays(D.fecha, +CFG.dias||0);
  saveD(); renderEditor(); });

const bindTxt = (sel, get, set) => { const el = $(sel); el.oninput = () => { set(el.value); saveD(); }; };
bindTxt('#d-num', null, v => D.num = v);
$('#d-fecha').onchange = e => { D.fecha = e.target.value || today(); saveD(); };
$('#d-vence').onchange = e => { D.vence = e.target.value; saveD(); };
bindTxt('#d-notas', null, v => D.notas = v);
bindTxt('#d-cond', null, v => D.cond = v);
['n','doc','tel','email','dir'].forEach(k => bindTxt('#c-'+k, null, v => { D.cli[k] = v; if (k === 'n') autoCliente(v); }));
function autoCliente(v){ const c = CLI.find(x => x.n.toLowerCase() === v.trim().toLowerCase()); if (!c) return;
  Object.assign(D.cli, {n:c.n, doc:c.doc||'', tel:c.tel||'', email:c.email||'', dir:c.dir||''}); ['doc','tel','email','dir'].forEach(k => $('#c-'+k).value = D.cli[k]); saveD(); }

function renderEditor(){
  const T = TIPOS[D.tipo];
  $$('#tipo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === D.tipo));
  $('#ed-title').textContent = (D.id ? 'Editando ' : 'Nueva ') + T.n.toLowerCase();
  $('#ed-sub').textContent = D.id ? `${D.num}, guardada. Los cambios se aplican al guardar.` : 'Completa los datos y guarda el documento.';
  $('#d-num').value = D.num; $('#d-fecha').value = D.fecha; $('#d-vence').value = D.vence || '';
  $('#l-vence').textContent = T.vence || 'Fecha de vencimiento'; $('#d-vence').closest('.field').hidden = !T.vence;
  $('#l-cli').textContent = T.cli;
  ['n','doc','tel','email','dir'].forEach(k => $('#c-'+k).value = D.cli[k] || '');
  $('#d-notas').value = D.notas || ''; $('#d-cond').value = D.cond || '';
  $('#dl-cli').innerHTML = CLI.map(c => `<option value="${esc(c.n)}">`).join('');
  $('#dl-prod').innerHTML = PROD.map(p => `<option value="${esc(p.d)}">`).join('');
  renderItems();
}
function renderItems(){
  $$('.col-iva').forEach(e => e.hidden = !CFG.usaIva);
  $('#items').innerHTML = D.items.map((it,i) => `<tr data-i="${i}">
    <td><input class="input" data-k="d" value="${esc(it.d)}" list="dl-prod" aria-label="Descripción" placeholder="Producto o servicio"></td>
    <td><input class="input num" data-k="c" inputmode="decimal" aria-label="Cantidad"></td>
    <td><input class="input num" data-k="p" inputmode="decimal" aria-label="Precio unitario"></td>
    <td><input class="input num" data-k="ds" inputmode="decimal" aria-label="Descuento %"></td>
    <td ${CFG.usaIva?'':'hidden'}><input class="input num" data-k="iva" inputmode="decimal" aria-label="IVA %"></td>
    <td class="r" data-tot style="white-space:nowrap"></td>
    <td><button class="btn ghost sm icon" data-del aria-label="Quitar línea">${I.trash}</button></td></tr>`).join('');
  $$('#items tr').forEach(tr => { const it = D.items[+tr.dataset.i]; const upd = () => { const b=(+it.c||0)*(+it.p||0); tr.querySelector('[data-tot]').textContent = money(b - b*(+it.ds||0)/100); renderTotales(); saveD(); };
    const dIn = tr.querySelector('[data-k=d]');
    dIn.oninput = () => { it.d = dIn.value; const p = PROD.find(x => x.d === dIn.value); if (p){ it.p = p.p; it.iva = p.iva ?? CFG.iva; tr.querySelector('[data-k=p]').value = fmt(it.p); const iv = tr.querySelector('[data-k=iva]'); if (iv) iv.value = fmt(it.iva); } upd(); };
    bindNum(tr.querySelector('[data-k=c]'), it.c, v => { it.c = v; upd(); });
    bindNum(tr.querySelector('[data-k=p]'), it.p, v => { it.p = v; upd(); });
    bindNum(tr.querySelector('[data-k=ds]'), it.ds, v => { it.ds = v; upd(); });
    bindNum(tr.querySelector('[data-k=iva]'), it.iva, v => { it.iva = v; upd(); });
    tr.querySelector('[data-del]').onclick = () => { D.items.splice(+tr.dataset.i, 1); if (!D.items.length) D.items.push({d:'',c:1,p:0,ds:0,iva:CFG.usaIva?CFG.iva:0}); saveD(); renderItems(); };
    upd(); });
  renderTotales();
}
$('#add-item').onclick = () => { D.items.push({d:'', c:1, p:0, ds:0, iva:CFG.usaIva?CFG.iva:0}); saveD(); renderItems(); const r = $$('#items tr'); r[r.length-1].querySelector('input').focus(); };

function renderTotales(){
  const t = totales(D), c = cur();
  $('#totales').innerHTML = `<div class="ticket-top"><h3>${TIPOS[D.tipo].n}</h3><span>${esc(D.num)}</span></div>
    <div class="ticket-hero"><span>Total</span><strong>${money(t.total, c)}</strong><small>${enLetras(t.total, c)}</small></div>
    <div class="ticket-lines">
      <div class="ticket-line"><span>Subtotal</span><b>${money(t.sub, c)}</b></div>
      ${t.desc?`<div class="ticket-line"><span>Descuentos</span><b class="neg">-${money(t.desc, c)}</b></div><div class="ticket-line"><span>Base</span><b>${money(t.base, c)}</b></div>`:''}
      ${Object.entries(t.porTasa).map(([k,v]) => `<div class="ticket-line"><span>IVA ${fmt(+k)}%</span><b>${money(v, c)}</b></div>`).join('')}
      <div class="ticket-line total"><span>Total a pagar</span><b>${money(t.total, c)}</b></div>
    </div>
    <label class="field" style="margin-top:14px"><span>Estado</span><select class="input" id="d-estado">${TIPOS[D.tipo].est.map(e => `<option ${e===D.estado?'selected':''}>${e}</option>`).join('')}</select></label>`;
  $('#d-estado').onchange = e => { D.estado = e.target.value; saveD(); };
}

function validar(){
  if (!D.cli.n.trim()){ toast('Escribe el nombre del cliente.', true); $('#c-n').focus(); return false; }
  if (!D.items.some(it => it.d.trim() && it.c * it.p > 0)){ toast('Agrega al menos una línea con descripción, cantidad y precio.', true); return false; }
  if (!D.num.trim()){ toast('El documento necesita un número.', true); return false; }
  if (DOCS.some(x => x.num === D.num.trim() && x.id !== D.id)){ toast('Ya existe un documento con el número '+D.num+'.', true); return false; }
  return true;
}
function guardar(silencioso){
  if (!validar()) return false;
  D.num = D.num.trim(); D.items = D.items.filter(it => it.d.trim() || it.p);
  const nuevo = !D.id;
  if (nuevo){ D.id = uid(); D.creado = new Date().toISOString(); DOCS.unshift(JSON.parse(JSON.stringify(D)));
    if (D.num === numDoc(D.tipo)) CFG.num[D.tipo]++; else { const m = D.num.match(/(\d+)$/); if (m && D.num.startsWith(CFG.pre[D.tipo]) && +m[1] >= CFG.num[D.tipo]) CFG.num[D.tipo] = +m[1] + 1; }
    saveCfg(); }
  else { const i = DOCS.findIndex(x => x.id === D.id); DOCS[i] = JSON.parse(JSON.stringify(D)); }
  saveDocs(); saveD();
  // guarda o actualiza el cliente
  const c = CLI.find(x => x.n.toLowerCase() === D.cli.n.trim().toLowerCase());
  if (c) Object.assign(c, D.cli); else CLI.push(Object.assign({id:uid()}, D.cli)); saveCli();
  // agrega productos nuevos al catálogo
  D.items.forEach(it => { if (it.d.trim() && it.p > 0 && !PROD.some(p => p.d.toLowerCase() === it.d.trim().toLowerCase())) PROD.push({id:uid(), d:it.d.trim(), p:it.p, iva:it.iva}); }); saveProd();
  if (!silencioso) toast(TIPOS[D.tipo].n + ' ' + D.num + ' guardada');
  renderEditor();
  return true;
}
$('#btn-guardar').onclick = () => guardar();
$('#btn-limpiar').onclick = async () => {
  if (!D.id && (D.cli.n || D.items.some(it => it.d)) && !(await confirmar('Hay datos sin guardar en este documento. ¿Descartarlos y empezar uno nuevo?', 'Descartar', true))) return;
  D = nuevoDoc(D.tipo); saveD(); renderEditor(); };

/* ---------- Documento imprimible ---------- */
function docHTML(doc){
  const T = TIPOS[doc.tipo], n = negocio(), t = totales(doc), c = cur();
  const info = [n.doc && (n.doc), n.dir && n.dir + (n.ciudad?', '+n.ciudad:''), n.tel && 'Tel. '+n.tel, n.email].filter(Boolean).map(esc).join('<br>');
  const showIva = CFG.usaIva && doc.items.some(it => +it.iva);
  return `<div class="doc ${/Anulad/.test(doc.estado)?'doc-anulado':''}">
    <div class="doc-h">
      <div class="doc-biz">${n.logo?`<img src="${n.logo}" alt="">`:''}<div><b>${esc(n.nombre || 'Nombre de tu negocio')}</b><small>${info || 'Completa los datos en el menú, opción «Datos del negocio».'}</small></div></div>
      <div class="doc-type"><h2>${T.t}</h2><div class="n">N.º ${esc(doc.num)}</div><div>Fecha: ${fechaLarga(doc.fecha)}</div>${T.vence && doc.vence ? `<div>${T.vence}: ${fechaLarga(doc.vence)}</div>` : ''}</div>
    </div>
    <div class="doc-boxes">
      <div class="doc-box"><h4>${T.cli}</h4><b>${esc(doc.cli.n)}</b>${doc.cli.doc?`<div>${esc(doc.cli.doc)}</div>`:''}${doc.cli.dir?`<div>${esc(doc.cli.dir)}</div>`:''}${[doc.cli.tel, doc.cli.email].filter(Boolean).length?`<div>${[doc.cli.tel, doc.cli.email].filter(Boolean).map(esc).join(', ')}</div>`:''}</div>
      <div class="doc-box"><h4>Resumen</h4><div>Total: <b>${money(t.total, c)}</b></div><div>Estado: ${esc(doc.estado)}</div><div>Moneda: ${c}</div></div>
    </div>
    <table><thead><tr><th style="width:36px">#</th><th>Descripción</th><th class="r">Cant.</th><th class="r">Precio unit.</th>${doc.items.some(it=>+it.ds)?'<th class="r">Desc.</th>':''}${showIva?'<th class="r">IVA</th>':''}<th class="r">Total</th></tr></thead>
    <tbody>${doc.items.map((it,i) => { const b = it.c*it.p, ds = b*(+it.ds||0)/100;
      return `<tr><td>${i+1}</td><td>${esc(it.d)}</td><td class="r">${fmt(it.c)}</td><td class="r">${money(it.p, c)}</td>${doc.items.some(x=>+x.ds)?`<td class="r">${it.ds?fmt(it.ds)+'%':''}</td>`:''}${showIva?`<td class="r">${fmt(+it.iva||0)}%</td>`:''}<td class="r">${money(b-ds, c)}</td></tr>`; }).join('')}</tbody></table>
    <div class="doc-tot">
      <div class="doc-letras"><b>Son:</b> ${enLetras(t.total, c)}.</div>
      <table><tbody><tr><td>Subtotal</td><td class="r">${money(t.sub, c)}</td></tr>
        ${t.desc?`<tr><td>Descuentos</td><td class="r">-${money(t.desc, c)}</td></tr>`:''}
        ${Object.entries(t.porTasa).map(([k,v]) => `<tr><td>IVA ${fmt(+k)}%</td><td class="r">${money(v, c)}</td></tr>`).join('')}
        <tr class="big"><td>Total</td><td class="r">${money(t.total, c)}</td></tr></tbody></table>
    </div>
    <div class="doc-notes">
      ${doc.notas?`<div><b>Notas</b>${esc(doc.notas).replace(/\n/g,'<br>')}</div>`:''}
      ${doc.cond?`<div><b>Condiciones</b>${esc(doc.cond).replace(/\n/g,'<br>')}</div>`:''}
      ${CFG.pagos && doc.tipo !== 'rc' ? `<div><b>Datos para pagos</b>${esc(CFG.pagos).replace(/\n/g,'<br>')}</div>` : ''}
    </div>
    <div class="doc-firmas"><div>${doc.tipo==='rc'?'Recibido por':'Elaborado por'}</div><div>${doc.tipo==='cot'?'Aceptado por el cliente':doc.tipo==='rc'?'Entregado por':'Recibido por el cliente'}</div></div>
    ${CFG.legal?`<div class="doc-legal">${esc(CFG.legal)}</div>`:''}
    <div class="doc-credit">Documento generado con Cotizador y Facturador de José Lugo. WhatsApp +57 312 638 7467</div>
  </div>`;
}
function imprimir(doc){
  $('#doc-print').innerHTML = docHTML(doc);
  document.body.classList.add('printing-doc');
  const off = () => { document.body.classList.remove('printing-doc'); window.removeEventListener('afterprint', off); };
  window.addEventListener('afterprint', off);
  setTimeout(() => { window.print(); setTimeout(off, 1500); }, 60);
}
function ver(doc){
  dialog({title: TIPOS[doc.tipo].n + ' ' + doc.num, wide:true, body:`<div class="doc-wrap">${docHTML(doc)}</div>`,
    actions:[{label:'Enviar por WhatsApp', onClick:()=>{ enviar(doc); return false; }},{label:'Imprimir o guardar PDF', cls:'primary', onClick:()=>{ imprimir(doc); }}]});
}
function textoWA(doc){
  const T = TIPOS[doc.tipo], t = totales(doc), c = cur(), n = negocio();
  return `Hola ${doc.cli.n.split(' ')[0]}, te comparto la ${T.n.toLowerCase()} *${doc.num}*${n.nombre?' de *'+n.nombre+'*':''}.\n\n`
    + doc.items.map(it => `• ${it.d} x${fmt(it.c)}: ${money(it.c*it.p*(1-(+it.ds||0)/100), c)}`).join('\n')
    + `\n\n${t.iva?'IVA: '+money(t.iva, c)+'\n':''}*Total: ${money(t.total, c)}*`
    + (T.vence && doc.vence ? `\n${T.vence}: ${fechaCorta(doc.vence)}` : '')
    + (CFG.pagos && doc.tipo !== 'rc' ? `\n\n${CFG.pagos}` : '') + `\n\nQuedo atento.`;
}
function enviar(doc){ whatsapp(textoWA(doc), doc.cli.tel); }
$('#btn-ver').onclick = () => { if (!validar()) return; ver(D); };
$('#btn-wa').onclick = () => { if (!validar()) return; enviar(D); };

/* ---------- Historial ---------- */
$('#h-csv').innerHTML = I.csv + 'Exportar (CSV)';
$('#h-tipo').innerHTML = '<option value="">Todos los tipos</option>' + Object.entries(TIPOS).map(([k,v]) => `<option value="${k}">${v.n}</option>`).join('');
$('#h-estado').innerHTML = '<option value="">Todos los estados</option>' + [...new Set(Object.values(TIPOS).flatMap(t => t.est))].map(e => `<option>${e}</option>`).join('');
['#h-q','#h-tipo','#h-estado'].forEach(s => $(s).addEventListener('input', renderHist));
function hFiltrados(){ const q = $('#h-q').value.trim().toLowerCase(), tp = $('#h-tipo').value, es = $('#h-estado').value;
  return DOCS.filter(d => (!tp || d.tipo === tp) && (!es || d.estado === es) && (!q || (d.num+' '+d.cli.n).toLowerCase().includes(q))); }
function renderHist(){
  const c = cur(), mk = monthKey();
  const fact = DOCS.filter(d => ['fac','cc'].includes(d.tipo) && d.fecha.slice(0,7) === mk && !/Anulad/.test(d.estado)).reduce((a,d) => a + totales(d).total, 0);
  const pend = DOCS.filter(d => ['fac','cc'].includes(d.tipo) && d.estado === 'Pendiente');
  const venc = pend.filter(d => d.vence && d.vence < today());
  const cots = DOCS.filter(d => d.tipo === 'cot' && ['Borrador','Enviada'].includes(d.estado));
  $('#kpis').innerHTML = `<div class="kpi"><span>Facturado este mes</span><strong>${money(fact, c)}</strong><small>Facturas y cuentas de cobro</small></div>
    <div class="kpi accent"><span>Por cobrar</span><strong>${money(pend.reduce((a,d) => a + totales(d).total, 0), c)}</strong><small>${pend.length} pendientes</small></div>
    <div class="kpi"><span>Vencidas</span><strong class="${venc.length?'neg':''}">${money(venc.reduce((a,d) => a + totales(d).total, 0), c)}</strong><small>${venc.length} documentos</small></div>
    <div class="kpi"><span>Cotizaciones abiertas</span><strong>${money(cots.reduce((a,d) => a + totales(d).total, 0), c)}</strong><small>${cots.length} por cerrar</small></div>`;
  const L = hFiltrados();
  if (!DOCS.length){ $('#historial').innerHTML = `<div class="empty"><strong>Aún no hay documentos</strong>Crea tu primera cotización o factura en la pestaña «Documento».</div>`; return; }
  if (!L.length){ $('#historial').innerHTML = `<div class="empty"><strong>Sin resultados</strong>Cambia la búsqueda o los filtros.</div>`; return; }
  const cls = e => /Pagad|Aceptada|Entregada/.test(e) ? 'ok' : /Anulad|Rechazada/.test(e) ? 'bad' : e === 'Borrador' ? '' : 'mid';
  $('#historial').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Número</th><th>Cliente</th><th>Fecha</th><th class="r">Total</th><th>Estado</th><th></th></tr></thead><tbody>
    ${L.map(d => { const vencida = d.estado === 'Pendiente' && d.vence && d.vence < today();
      return `<tr><td><b>${esc(d.num)}</b><div class="small muted">${TIPOS[d.tipo].n}</div></td><td>${esc(d.cli.n)}</td>
      <td>${fechaCorta(d.fecha)}${d.vence&&TIPOS[d.tipo].vence?`<div class="small ${vencida?'neg':'muted'}">${vencida?'Venció':'Vence'} ${fechaCorta(d.vence)}</div>`:''}</td>
      <td class="r"><b>${money(totales(d).total, c)}</b></td>
      <td><select class="input" data-est="${d.id}" style="min-height:32px;padding:4px 8px;width:auto">${TIPOS[d.tipo].est.map(e => `<option ${e===d.estado?'selected':''}>${e}</option>`).join('')}</select></td>
      <td class="r" style="white-space:nowrap">
        <button class="btn ghost sm icon" data-ver="${d.id}" aria-label="Ver">${I.print}</button>
        <button class="btn ghost sm icon" data-wa="${d.id}" aria-label="Enviar por WhatsApp">${I.wa}</button>
        <button class="btn ghost sm icon" data-ed="${d.id}" aria-label="Editar">${I.edit}</button>
        <button class="btn ghost sm" data-more="${d.id}">Más</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  const byId = id => DOCS.find(x => x.id === id);
  $$('[data-est]').forEach(s => s.onchange = () => { const d = byId(s.dataset.est); d.estado = s.value; if (D.id === d.id) { D.estado = s.value; saveD(); } saveDocs(); renderHist(); toast('Estado actualizado: '+s.value); });
  $$('[data-ver]').forEach(b => b.onclick = () => ver(byId(b.dataset.ver)));
  $$('[data-wa]').forEach(b => b.onclick = () => enviar(byId(b.dataset.wa)));
  $$('[data-ed]').forEach(b => b.onclick = () => abrir(byId(b.dataset.ed)));
  $$('[data-more]').forEach(b => b.onclick = () => masAcciones(byId(b.dataset.more)));
}
function abrir(d){ D = JSON.parse(JSON.stringify(d)); saveD(); selTab('nuevo'); renderEditor(); window.scrollTo(0,0); }
function masAcciones(d){
  const acts = [{label:'Duplicar', onClick:()=>{ const x = JSON.parse(JSON.stringify(d)); x.id = null; x.num = numDoc(x.tipo); x.fecha = today(); x.vence = TIPOS[x.tipo].vence ? addDays(today(), +CFG.dias||0) : ''; x.estado = TIPOS[x.tipo].est[0]; D = x; saveD(); selTab('nuevo'); renderEditor(); toast('Copia lista para editar'); }}];
  if (d.tipo === 'cot') acts.push({label:'Convertir en factura', onClick:()=>{ const x = JSON.parse(JSON.stringify(d)); x.id = null; x.tipo = 'fac'; x.num = numDoc('fac'); x.fecha = today(); x.vence = addDays(today(), +CFG.dias||0); x.estado = 'Pendiente'; x.notas = (x.notas?x.notas+'\n':'') + 'Según cotización ' + d.num + '.';
    d.estado = 'Aceptada'; saveDocs(); D = x; saveD(); selTab('nuevo'); renderEditor(); toast('Factura creada desde la cotización. Revisa y guarda.'); }});
  if (['fac','cc'].includes(d.tipo) && d.estado === 'Pendiente') acts.push({label:'Registrar pago (crear recibo)', onClick:()=>{ const x = JSON.parse(JSON.stringify(d)); x.id = null; x.tipo = 'rc'; x.num = numDoc('rc'); x.fecha = today(); x.vence = ''; x.estado = 'Pagado';
    x.items = [{d:'Pago de ' + TIPOS[d.tipo].n.toLowerCase() + ' ' + d.num, c:1, p:totales(d).total, ds:0, iva:0}]; x.notas = ''; d.estado = 'Pagada'; saveDocs(); D = x; saveD(); selTab('nuevo'); renderEditor(); toast('Recibo listo. Revisa y guarda.'); }});
  acts.push({label:'Eliminar', cls:'danger', onClick:async ()=>{ if (!(await confirmar('¿Eliminar '+TIPOS[d.tipo].n.toLowerCase()+' '+d.num+'? Esta acción no se puede deshacer.'))) return; DOCS = DOCS.filter(x => x.id !== d.id); saveDocs(); if (D.id === d.id){ D = nuevoDoc(D.tipo); saveD(); renderEditor(); } renderHist(); toast('Documento eliminado'); }});
  dialog({title: TIPOS[d.tipo].n + ' ' + d.num, body:`<p class="muted">${esc(d.cli.n)}, ${money(totales(d).total, cur())}. ¿Qué quieres hacer?</p>`, actions:acts});
}
$('#h-csv').onclick = () => { const c = cur();
  csv('documentos-'+today(), [['Número','Tipo','Fecha','Vence','Cliente','Documento cliente','Subtotal','Descuentos','IVA','Total','Moneda','Estado'],
    ...hFiltrados().map(d => { const t = totales(d); return [d.num, TIPOS[d.tipo].n, d.fecha, d.vence||'', d.cli.n, d.cli.doc||'', fmt(t.sub), fmt(t.desc), fmt(t.iva), fmt(t.total), c, d.estado]; })]); };

/* ---------- Clientes y productos ---------- */
function renderCli(){
  if (!CLI.length){ $('#clientes-l').innerHTML = `<div class="empty"><strong>Sin clientes</strong>Se agregan solos cuando guardas un documento.</div>`; return; }
  $('#clientes-l').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Cliente</th><th>Contacto</th><th class="r">Facturado</th><th></th></tr></thead><tbody>
    ${[...CLI].sort((a,b)=>a.n.localeCompare(b.n)).map(c => { const tot = DOCS.filter(d => d.cli.n === c.n && ['fac','cc'].includes(d.tipo) && !/Anulad/.test(d.estado)).reduce((a,d)=>a+totales(d).total,0);
      return `<tr><td><b>${esc(c.n)}</b><div class="small muted">${esc(c.doc||'')}</div></td><td class="small">${esc(c.tel||'')}<br>${esc(c.email||'')}</td><td class="r">${money(tot, cur())}</td>
      <td class="r" style="white-space:nowrap"><button class="btn ghost sm" data-doc="${c.id}">Nuevo documento</button><button class="btn ghost sm icon" data-ed="${c.id}" aria-label="Editar">${I.edit}</button><button class="btn ghost sm icon" data-del="${c.id}" aria-label="Eliminar">${I.trash}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('#clientes-l [data-doc]').forEach(b => b.onclick = () => { const c = CLI.find(x => x.id === b.dataset.doc); D = nuevoDoc(D.tipo); D.cli = {n:c.n, doc:c.doc||'', tel:c.tel||'', email:c.email||'', dir:c.dir||''}; saveD(); selTab('nuevo'); renderEditor(); });
  $$('#clientes-l [data-ed]').forEach(b => b.onclick = () => editCli(CLI.find(x => x.id === b.dataset.ed)));
  $$('#clientes-l [data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este cliente? Sus documentos se conservan.'))) return; CLI = CLI.filter(x => x.id !== b.dataset.del); saveCli(); renderCli(); });
}
function editCli(c){
  const nuevo = !c; c = c || {id:uid(), n:'', doc:'', tel:'', email:'', dir:''};
  dialog({title: nuevo?'Nuevo cliente':'Editar cliente', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Nombre o razón social</span><input class="input" id="x-n" value="${esc(c.n)}"></label>
    <label class="field"><span>NIT / Cédula / RIF</span><input class="input" id="x-doc" value="${esc(c.doc)}"></label>
    <label class="field"><span>Teléfono</span><input class="input" id="x-tel" value="${esc(c.tel)}"></label>
    <label class="field"><span>Correo</span><input class="input" id="x-email" value="${esc(c.email)}"></label>
    <label class="field"><span>Dirección</span><input class="input" id="x-dir" value="${esc(c.dir)}"></label></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Guardar cliente', cls:'primary', onClick:(d)=>{ const n = $('#x-n',d).value.trim(); if (!n){ toast('Escribe el nombre.', true); return false; }
      Object.assign(c, {n, doc:$('#x-doc',d).value.trim(), tel:$('#x-tel',d).value.trim(), email:$('#x-email',d).value.trim(), dir:$('#x-dir',d).value.trim()});
      if (nuevo) CLI.push(c); saveCli(); renderCli(); toast('Cliente guardado'); }}]});
}
$('#add-cli').onclick = () => editCli();
function renderProd(){
  if (!PROD.length){ $('#prods-l').innerHTML = `<div class="empty"><strong>Catálogo vacío</strong>Los productos se agregan solos al guardar documentos.</div>`; return; }
  $('#prods-l').innerHTML = `<div class="table-wrap"><table class="t t-edit"><thead><tr><th>Descripción</th><th class="r">Precio</th><th class="r col-iva">IVA %</th><th></th></tr></thead><tbody>
    ${PROD.map(p => `<tr data-id="${p.id}"><td><input class="input" data-k="d" value="${esc(p.d)}" aria-label="Descripción" style="min-width:150px"></td><td><input class="input num" data-k="p" inputmode="decimal" aria-label="Precio" style="min-width:100px"></td><td class="col-iva"><input class="input num" data-k="iva" inputmode="decimal" aria-label="IVA" style="max-width:70px"></td><td><button class="btn ghost sm icon" data-del aria-label="Eliminar">${I.trash}</button></td></tr>`).join('')}
  </tbody></table></div>`;
  $$('#prods-l tr[data-id]').forEach(tr => { const p = PROD.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-k=d]').oninput = e => { p.d = e.target.value; saveProd(); };
    bindNum(tr.querySelector('[data-k=p]'), p.p, v => { p.p = v; saveProd(); });
    bindNum(tr.querySelector('[data-k=iva]'), p.iva, v => { p.iva = v; saveProd(); });
    tr.querySelector('[data-del]').onclick = () => { PROD = PROD.filter(x => x !== p); saveProd(); renderProd(); }; });
  $$('.col-iva').forEach(e => e.hidden = !CFG.usaIva);
}
$('#add-prod').onclick = () => { PROD.unshift({id:uid(), d:'', p:0, iva:CFG.iva}); saveProd(); renderProd(); $('#prods-l input').focus(); };

/* ---------- Ajustes ---------- */
function renderAjustes(){
  $('#numeracion').innerHTML = Object.entries(TIPOS).map(([k,v]) => `<tr><td>${v.n}</td><td><input class="input" data-pre="${k}" value="${esc(CFG.pre[k])}" style="max-width:110px" aria-label="Prefijo ${v.n}"></td><td><input class="input num" data-num="${k}" inputmode="numeric" style="max-width:120px;margin-left:auto" aria-label="Siguiente número ${v.n}"></td></tr>`).join('');
  $$('[data-pre]').forEach(i => i.oninput = () => { const k = i.dataset.pre; const auto = !D.id && D.tipo === k && D.num === numDoc(k); CFG.pre[k] = i.value; if (auto){ D.num = numDoc(k); saveD(); } saveCfg(); });
  $$('[data-num]').forEach(i => bindNum(i, CFG.num[i.dataset.num], v => { const k = i.dataset.num; const auto = !D.id && D.tipo === k && D.num === numDoc(k); CFG.num[k] = Math.max(1, Math.floor(v)); if (auto){ D.num = numDoc(k); saveD(); } saveCfg(); }, 0));
  $('#usa-iva').checked = CFG.usaIva;
  $('#t-pagos').value = CFG.pagos; $('#t-legal').value = CFG.legal;
}
bindNum($('#iva-def'), CFG.iva, v => { CFG.iva = v; saveCfg(); });
bindNum($('#dias-def'), CFG.dias, v => { CFG.dias = v; saveCfg(); }, 0);
$('#usa-iva').onchange = e => { CFG.usaIva = e.target.checked; saveCfg(); renderItems(); };
$('#t-pagos').oninput = e => { CFG.pagos = e.target.value; saveCfg(); };
$('#t-legal').oninput = e => { CFG.legal = e.target.value; saveCfg(); };

const selTab = tabs(id => { if (id === 'docs') renderHist(); if (id === 'clientes'){ renderCli(); renderProd(); } if (id === 'ajustes') renderAjustes(); if (id === 'nuevo') renderEditor(); });
renderEditor(); renderHist(); renderCli(); renderProd(); renderAjustes();
document.addEventListener('ma:negocio', () => { renderTotales(); renderHist(); });
})();

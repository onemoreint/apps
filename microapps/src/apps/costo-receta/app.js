(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, csv, negocio, imprimirDoc} = MA;

const UN = {g:{t:'m', f:1, n:'g'}, kg:{t:'m', f:1000, n:'kg'}, lb:{t:'m', f:453.592, n:'lb'}, oz:{t:'m', f:28.3495, n:'oz'},
            ml:{t:'v', f:1, n:'ml'}, L:{t:'v', f:1000, n:'L'}, und:{t:'u', f:1, n:'und'}};
const compat = u => Object.keys(UN).filter(k => UN[k].t === UN[u].t);
const cur = () => negocio().moneda || 'COP';
const m$ = v => money(v, cur());

let S = store.get('estado', null);
if (!S){
  const I_ = (n, cat, und, cant, precio, merma) => ({id:uid(), n, cat, und, cant, precio, merma});
  const ins = [I_('Carne molida de res','Carnes','kg',1,32000,5), I_('Pan brioche','Panadería','und',6,9000,0), I_('Queso cheddar tajado','Lácteos','g',400,14500,0),
    I_('Tomate','Verduras','kg',1,4800,12), I_('Lechuga crespa','Verduras','und',1,3500,25), I_('Cebolla morada','Verduras','kg',1,4200,10),
    I_('Papa para freír','Verduras','kg',1,3600,18), I_('Aceite vegetal','Abarrotes','L',3,27000,0), I_('Salsas de la casa','Abarrotes','ml',1000,12000,0),
    I_('Harina de maíz precocida','Abarrotes','kg',1,4200,0), I_('Queso costeño','Lácteos','kg',1,24000,0), I_('Mantequilla','Lácteos','g',250,6800,0),
    I_('Limón Tahití','Frutas','kg',1,3800,45), I_('Azúcar','Abarrotes','kg',1,4500,0), I_('Vaso desechable con tapa','Empaques','und',50,17500,0)];
  const f = n => ins.find(x => x.n === n).id;
  S = {ins, cfg:{fc:32, ind:5, imp:8, red:100}, sel:null, rec:[
    {id:uid(), n:'Hamburguesa clásica con papas', cat:'Hamburguesas', porc:4, precio:26000, ventas:420, prep:'Formar carnes de 150 g, sellar 3 minutos por lado. Tostar el pan, armar con queso, tomate, lechuga y cebolla. Papas en bastón fritas a 175 °C.',
      items:[{iid:f('Carne molida de res'), cant:600, und:'g'},{iid:f('Pan brioche'), cant:4, und:'und'},{iid:f('Queso cheddar tajado'), cant:120, und:'g'},{iid:f('Tomate'), cant:200, und:'g'},
             {iid:f('Lechuga crespa'), cant:0.5, und:'und'},{iid:f('Cebolla morada'), cant:100, und:'g'},{iid:f('Papa para freír'), cant:800, und:'g'},{iid:f('Aceite vegetal'), cant:150, und:'ml'},{iid:f('Salsas de la casa'), cant:120, und:'ml'}]},
    {id:uid(), n:'Arepa de queso', cat:'Arepas', porc:10, precio:7000, ventas:900, prep:'Amasar la harina con agua tibia y sal, rellenar con queso, asar en plancha con mantequilla.',
      items:[{iid:f('Harina de maíz precocida'), cant:1, und:'kg'},{iid:f('Queso costeño'), cant:600, und:'g'},{iid:f('Mantequilla'), cant:100, und:'g'}]},
    {id:uid(), n:'Limonada natural 16 oz', cat:'Bebidas', porc:8, precio:6500, ventas:650, prep:'Exprimir los limones, licuar con agua, hielo y azúcar. Servir en vaso de 16 oz.',
      items:[{iid:f('Limón Tahití'), cant:1, und:'kg'},{iid:f('Azúcar'), cant:400, und:'g'},{iid:f('Vaso desechable con tapa'), cant:8, und:'und'}]}
  ]};
  S.sel = S.rec[0].id;
}
const save = () => store.set('estado', S);
const ins = id => S.ins.find(x => x.id === id);
const rec = () => S.rec.find(r => r.id === S.sel) || S.rec[0];

/* ---------- Motor ---------- */
const costoBase = i => { const u = UN[i.und] || UN.und; const base = (+i.cant||0) * u.f; return base > 0 ? (+i.precio||0) / base / (1 - Math.min(95, +i.merma||0) / 100) : 0; }; // por g, ml o und utilizable
const costoItem = it => { const i = ins(it.iid); if (!i) return 0; const u = UN[it.und] || UN[i.und]; if (u.t !== UN[i.und].t) return 0; return (+it.cant||0) * u.f * costoBase(i); };
const ceilTo = (v, s) => s > 0 ? Math.ceil(Math.round(v / s * 1e6) / 1e6) * s : v;
function calc(r){
  const c = S.cfg, ing = r.items.reduce((a,it) => a + costoItem(it), 0), ind = ing * (+c.ind||0) / 100, total = ing + ind;
  const porc = Math.max(1, +r.porc||1), cp = total / porc;
  const sinImp = c.fc > 0 ? cp / (c.fc / 100) : 0, sug = ceilTo(sinImp * (1 + (+c.imp||0) / 100), +c.red||0);
  const precioNeto = r.precio > 0 ? r.precio / (1 + (+c.imp||0) / 100) : 0;
  const fcAct = precioNeto > 0 ? cp / precioNeto * 100 : null, margen = precioNeto > 0 ? precioNeto - cp : null;
  return {ing, ind, total, porc, cp, sinImp, sug, precioNeto, fcAct, margen};
}

/* ---------- Recetas ---------- */
$('#btn-nueva').innerHTML = I.plus + 'Nueva receta'; $('#add-item').innerHTML = I.plus + 'Agregar ingrediente'; $('#btn-ficha').innerHTML = I.print + 'Imprimir ficha técnica';
$('#btn-nueva').onclick = () => { const r = {id:uid(), n:'Nueva receta', cat:'', porc:1, precio:0, ventas:0, prep:'', items:[]}; S.rec.push(r); S.sel = r.id; save(); renderRec(); $('#r-n').select(); };
$('#btn-dup').onclick = () => { const r = JSON.parse(JSON.stringify(rec())); r.id = uid(); r.n += ' (copia)'; S.rec.push(r); S.sel = r.id; save(); renderRec(); toast('Receta duplicada'); };
$('#btn-del').onclick = async () => { const r = rec(); if (!r) return; if (!(await confirmar('¿Eliminar la receta «'+r.n+'»?'))) return; S.rec = S.rec.filter(x => x !== r); S.sel = S.rec[0] && S.rec[0].id; save(); renderRec(); };
$('#sel-rec').onchange = e => { S.sel = e.target.value; save(); renderRec(); };
$('#r-n').oninput = e => { rec().n = e.target.value; save(); renderSel(); renderTicket(); };
$('#r-cat').oninput = e => { rec().cat = e.target.value; save(); };
$('#r-prep').oninput = e => { rec().prep = e.target.value; save(); };
let bRec = {};
function bindR(sel, k, d){ const el = $(sel); if (!bRec[sel]){ bRec[sel] = 1; if (k === 'precio') el.dataset.blank0 = ''; bindNum(el, rec()[k], v => { rec()[k] = v; save(); renderItems(); }, d); } el.value = rec()[k] ? fmt(rec()[k], d) : ''; }
function renderSel(){ $('#sel-rec').innerHTML = S.rec.map(r => `<option value="${r.id}" ${r.id===S.sel?'selected':''}>${esc(r.n||'Sin nombre')}</option>`).join(''); }
function renderRec(){
  renderSel(); const r = rec();
  const has = !!r; ['#btn-dup','#btn-del','#btn-ficha'].forEach(s => $(s).disabled = !has);
  if (!r){ $('#items').innerHTML = ''; $('#ticket').innerHTML = `<div class="empty" style="border:0"><strong>Sin recetas</strong>Crea la primera con «Nueva receta».</div>`; return; }
  S.sel = r.id; $('#r-n').value = r.n; $('#r-cat').value = r.cat||''; $('#r-prep').value = r.prep||'';
  $('#dl-cat').innerHTML = [...new Set(S.rec.map(x => x.cat).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('');
  bindR('#r-porc', 'porc', 0); bindR('#r-precio', 'precio', 2);
  renderItems();
}
function renderItems(){
  const r = rec(); if (!r) return; const C = calc(r);
  const opts = sel => [...S.ins].sort((a,b) => a.n.localeCompare(b.n)).map(i => `<option value="${i.id}" ${i.id===sel?'selected':''}>${esc(i.n)}</option>`).join('');
  $('#items').innerHTML = r.items.length ? r.items.map((it,k) => { const i = ins(it.iid), v = costoItem(it);
    return `<tr data-k="${k}"><td><select class="input" data-f="iid" aria-label="Insumo">${i?'':'<option value="">Elige un insumo</option>'}${opts(it.iid)}</select></td>
      <td><input class="input num" data-f="cant" inputmode="decimal" aria-label="Cantidad"></td>
      <td><select class="input" data-f="und" aria-label="Unidad">${(i?compat(i.und):Object.keys(UN)).map(u => `<option ${u===it.und?'selected':''}>${u}</option>`).join('')}</select></td>
      <td class="r" style="white-space:nowrap">${m$(v)}</td><td class="r muted small">${C.ing?pct(v/C.ing*100,0):''}</td>
      <td><button class="btn ghost sm icon" data-del aria-label="Quitar ingrediente">${I.trash}</button></td></tr>`; }).join('')
    : `<tr><td colspan="6"><div class="empty" style="border:0"><strong>Sin ingredientes</strong>Agrega los insumos que lleva la receta.</div></td></tr>`;
  $$('#items tr[data-k]').forEach(tr => { const it = r.items[+tr.dataset.k];
    tr.querySelector('[data-f=iid]').onchange = e => { it.iid = e.target.value; const i = ins(it.iid); if (i && !compat(i.und).includes(it.und)) it.und = UN[i.und].t === 'u' ? 'und' : UN[i.und].t === 'v' ? 'ml' : 'g'; save(); renderItems(); };
    bindNum(tr.querySelector('[data-f=cant]'), it.cant, v => { it.cant = v; save(); upd(); }, 3);
    tr.querySelector('[data-f=und]').onchange = e => { it.und = e.target.value; save(); renderItems(); };
    tr.querySelector('[data-del]').onclick = () => { r.items.splice(+tr.dataset.k, 1); save(); renderItems(); };
    const upd = () => { const v = costoItem(it), C2 = calc(r); tr.children[3].textContent = m$(v); $$('#items tr[data-k]').forEach(t2 => { const i2 = r.items[+t2.dataset.k]; t2.children[4].textContent = C2.ing ? pct(costoItem(i2)/C2.ing*100,0) : ''; }); renderTicket(); }; });
  renderTicket();
}
$('#add-item').onclick = () => { const r = rec(); if (!r) return; const i = S.ins[0]; r.items.push({iid:i?i.id:'', cant:0, und:i?(UN[i.und].t==='u'?'und':UN[i.und].t==='v'?'ml':'g'):'g'}); save(); renderItems(); const rows = $$('#items tr[data-k]'); rows[rows.length-1].querySelector('select').focus(); };
$('#add-ins').onclick = () => editarIns(null, nuevo => { const r = rec(); if (r){ r.items.push({iid:nuevo.id, cant:0, und:UN[nuevo.und].t==='u'?'und':UN[nuevo.und].t==='v'?'ml':'g'}); save(); renderItems(); } });
function renderTicket(){
  const r = rec(); if (!r) return; const C = calc(r), c = S.cfg;
  $('#ticket').innerHTML = `<div class="ticket-top"><h3>${esc(r.n||'Receta')}</h3><span>${fmt(C.porc)} porciones</span></div>
    <div class="ticket-hero"><span>Costo por porción</span><strong>${m$(C.cp)}</strong><small>Costo total de la receta: ${m$(C.total)}</small></div>
    <div class="ticket-lines">
      <div class="ticket-line"><span>Ingredientes</span><b>${m$(C.ing)}</b></div>
      <div class="ticket-line"><span>Indirectos (${fmt(c.ind)}%)</span><b>${m$(C.ind)}</b></div>
      <div class="ticket-line total"><span>Precio sugerido${c.imp?' con impuesto':''}</span><b>${m$(C.sug)}</b></div>
      <div class="ticket-line"><span>Para un costo de alimentos del ${fmt(c.fc)}%</span><b class="muted">${m$(C.sinImp)} sin impuesto</b></div>
      ${r.precio>0?`<div class="ticket-line total"><span>Tu precio actual</span><b>${m$(r.precio)}</b></div>
      <div class="ticket-line"><span>Costo de alimentos real</span><b class="${C.fcAct>c.fc+3?'neg':C.fcAct<=c.fc?'pos':'warn'}">${pct(C.fcAct)}</b></div>
      <div class="ticket-line"><span>Ganancia bruta por porción</span><b class="${C.margen<0?'neg':''}">${m$(C.margen)}</b></div>`:''}
    </div>${r.precio>0&&C.fcAct>c.fc+3?`<p class="small neg" style="margin-top:10px">El precio actual deja un costo de alimentos alto. Considera subirlo a ${m$(C.sug)} o ajustar porciones.</p>`:''}`;
}
$('#btn-ficha').onclick = () => { const r = rec(), C = calc(r);
  imprimirDoc('Ficha técnica', `<h2 style="margin-top:0">${esc(r.n)}</h2><p>${esc(r.cat||'')}${r.cat?'. ':''}Rinde ${fmt(C.porc)} porciones.</p>
    <table><thead><tr><th>Insumo</th><th class="r">Cantidad</th><th class="r">Costo</th></tr></thead><tbody>${r.items.map(it => { const i = ins(it.iid); return `<tr><td>${esc(i?i.n:'')}</td><td class="r">${fmt(it.cant,3)} ${it.und}</td><td class="r">${m$(costoItem(it))}</td></tr>`; }).join('')}
    <tr><td>Costos indirectos (${fmt(S.cfg.ind)}%)</td><td></td><td class="r">${m$(C.ind)}</td></tr></tbody><tfoot><tr><td>Costo total</td><td></td><td class="r">${m$(C.total)}</td></tr></tfoot></table>
    <div class="kp"><div><span>Costo por porción</span><b>${m$(C.cp)}</b></div><div><span>Precio sugerido</span><b>${m$(C.sug)}</b></div>${r.precio>0?`<div><span>Precio actual</span><b>${m$(r.precio)}</b></div><div><span>Costo de alimentos</span><b>${pct(C.fcAct)}</b></div>`:''}</div>
    ${r.prep?`<h2>Preparación</h2><p>${esc(r.prep).replace(/\n/g,'<br>')}</p>`:''}`, 'Costeo de receta'); };

/* ---------- Insumos ---------- */
$('#btn-ins').innerHTML = I.plus + 'Nuevo insumo';
$('#btn-ins').onclick = () => editarIns();
$('#q-ins').addEventListener('input', renderIns);
const usos = id => S.rec.filter(r => r.items.some(it => it.iid === id)).length;
function renderIns(){
  const q = $('#q-ins').value.trim().toLowerCase();
  const L = [...S.ins].filter(i => !q || (i.n+' '+(i.cat||'')).toLowerCase().includes(q)).sort((a,b) => (a.cat||'').localeCompare(b.cat||'') || a.n.localeCompare(b.n));
  if (!S.ins.length){ $('#insumos').innerHTML = `<div class="empty"><strong>Sin insumos</strong>Registra lo que compras: carne, verduras, empaques.</div>`; return; }
  $('#insumos').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Insumo</th><th class="r">Compra</th><th class="r">Precio</th><th class="r">Merma</th><th class="r">Costo utilizable</th><th class="r">Recetas</th><th></th></tr></thead><tbody>
    ${L.map(i => { const u = UN[i.und], cb = costoBase(i), lbl = u.t === 'm' ? m$(cb*1000)+' por kg' : u.t === 'v' ? m$(cb*1000)+' por L' : m$(cb)+' por und';
      return `<tr><td><b>${esc(i.n)}</b><div class="small muted">${esc(i.cat||'')}</div></td><td class="r">${fmt(i.cant,3)} ${i.und}</td><td class="r">${m$(i.precio)}</td><td class="r">${i.merma?pct(i.merma,0):'<span class="muted">0</span>'}</td>
      <td class="r"><b>${lbl}</b></td><td class="r">${usos(i.id)}</td><td class="r"><button class="btn ghost sm icon" data-ed="${i.id}" aria-label="Editar">${I.edit}</button></td></tr>`; }).join('')}</tbody></table></div>`;
  $$('#insumos [data-ed]').forEach(b => b.onclick = () => editarIns(ins(b.dataset.ed)));
}
function editarIns(i, after){
  const nuevo = !i; i = i || {id:uid(), n:'', cat:'', und:'kg', cant:1, precio:0, merma:0}; const tmp = {cant:i.cant, precio:i.precio, merma:i.merma};
  dialog({title: nuevo?'Nuevo insumo':'Editar insumo', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Nombre</span><input class="input" id="i-n" value="${esc(i.n)}" placeholder="Ej: Pechuga de pollo"></label>
    <label class="field"><span>Categoría</span><input class="input" id="i-cat" value="${esc(i.cat||'')}" list="dl-icat"><datalist id="dl-icat">${[...new Set(S.ins.map(x=>x.cat).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist></label>
    <label class="field"><span>Se compra por</span><select class="input" id="i-und">${Object.keys(UN).map(u => `<option ${u===i.und?'selected':''}>${u}</option>`).join('')}</select></label>
    <label class="field"><span>Cantidad comprada</span><input class="input num" id="i-cant" inputmode="decimal"></label>
    <label class="field"><span>Precio pagado</span><input class="input num" id="i-precio" inputmode="decimal"></label>
    <label class="field"><span>Merma o desperdicio</span><div class="input-group"><input class="input num" id="i-merma" inputmode="decimal"><span class="addon">%</span></div><small class="hint">Cáscaras, huesos, grasa, lo que se bota.</small></label>
  </div><p class="small" style="margin-top:12px" id="i-prev"></p>`,
    actions:[
      ...(nuevo?[]:[{label:'Eliminar', cls:'ghost danger', onClick:async ()=>{ const n = usos(i.id); if (!(await confirmar(n?`«${i.n}» se usa en ${n} recetas; se quitará de ellas.`:'¿Eliminar este insumo?'))) return false;
        S.ins = S.ins.filter(x => x !== i); S.rec.forEach(r => r.items = r.items.filter(it => it.iid !== i.id)); save(); renderAll(); }}]),
      {label:'Cancelar', cls:'ghost'},
      {label: nuevo?'Crear insumo':'Guardar cambios', cls:'primary', onClick:(d)=>{ const n = $('#i-n',d).value.trim(); if (!n){ toast('Escribe el nombre.', true); return false; }
        if (!(tmp.cant > 0) || !(tmp.precio >= 0)){ toast('Escribe la cantidad comprada y el precio.', true); return false; }
        const und = $('#i-und',d).value; const cambioTipo = !nuevo && UN[und].t !== UN[i.und].t;
        Object.assign(i, {n, cat:$('#i-cat',d).value.trim(), und, cant:tmp.cant, precio:tmp.precio, merma:Math.min(95, tmp.merma||0)});
        if (cambioTipo) S.rec.forEach(r => r.items.forEach(it => { if (it.iid === i.id) it.und = UN[und].t==='u'?'und':UN[und].t==='v'?'ml':'g'; }));
        if (nuevo) S.ins.push(i); save(); renderAll(); toast(nuevo?'Insumo creado':'Insumo actualizado; las recetas se recalcularon'); if (after) after(i); }}],
    onOpen: d => { const prev = () => { const q = Object.assign({}, i, tmp, {und:$('#i-und',d).value}); const u = UN[q.und], cb = costoBase(q);
        $('#i-prev',d).innerHTML = q.cant > 0 ? `Costo utilizable: <b>${u.t==='m'?m$(cb*1000)+' por kg, '+m$(cb)+' por g':u.t==='v'?m$(cb*1000)+' por litro, '+m$(cb)+' por ml':m$(cb)+' por unidad'}</b>` : ''; };
      bindNum($('#i-cant',d), i.cant, v => { tmp.cant = v; prev(); }, 3); bindNum($('#i-precio',d), i.precio, v => { tmp.precio = v; prev(); }); bindNum($('#i-merma',d), i.merma, v => { tmp.merma = v; prev(); });
      $('#i-und',d).onchange = prev; prev(); $('#i-n',d).focus(); }});
}

/* ---------- Análisis del menú ---------- */
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
function analisis(){
  const L = S.rec.map(r => ({r, C:calc(r), v:+r.ventas||0}));
  const conP = L.filter(x => x.r.precio > 0), totV = conP.reduce((a,x) => a + x.v, 0);
  const mgProm = totV ? conP.reduce((a,x) => a + x.C.margen * x.v, 0) / totV : 0, umbralPop = conP.length ? 0.7 / conP.length : 0;
  L.forEach(x => { if (!(x.r.precio > 0) || !totV){ x.clase = null; return; } const pop = x.v / totV >= umbralPop, gan = x.C.margen >= mgProm;
    x.clase = pop && gan ? ['Estrella','ok','Mantenlo visible y cuida su calidad.'] : pop ? ['Caballo de batalla','mid','Se vende mucho pero deja poco: sube el precio o baja el costo.'] : gan ? ['Rompecabezas','acc','Deja buena ganancia pero se vende poco: promociónalo.'] : ['Perro','bad','Se vende poco y deja poco: replantéalo o sácalo de la carta.']; });
  return {L, totV, mgProm, ingresos: conP.reduce((a,x) => a + x.C.precioNeto * x.v, 0), costo: conP.reduce((a,x) => a + x.C.cp * x.v, 0)};
}
function renderMenu(){
  const A = analisis();
  $('#menu-kpis').innerHTML = `<div class="kpi"><span>Ventas al mes (sin impuesto)</span><strong>${m$(A.ingresos)}</strong><small>${fmt(A.totV,0)} unidades</small></div>
    <div class="kpi accent"><span>Costo de alimentos del menú</span><strong>${A.ingresos?pct(A.costo/A.ingresos*100):'-'}</strong><small>Objetivo ${fmt(S.cfg.fc)}%</small></div>
    <div class="kpi"><span>Ganancia bruta al mes</span><strong>${m$(A.ingresos - A.costo)}</strong></div><div class="kpi"><span>Ganancia promedio por plato</span><strong>${m$(A.mgProm)}</strong></div>`;
  if (!S.rec.length){ $('#menu').innerHTML = `<div class="empty"><strong>Sin recetas</strong>Crea recetas para analizar tu menú.</div>`; return; }
  $('#menu').innerHTML = `<div class="table-wrap"><table class="t t-edit"><thead><tr><th>Plato</th><th class="r">Costo porción</th><th class="r">Precio</th><th class="r">Costo de alimentos</th><th class="r">Ganancia</th><th class="r" style="width:110px">Ventas al mes</th><th>Clasificación</th></tr></thead><tbody>
    ${A.L.map(x => `<tr data-id="${x.r.id}"><td><b>${esc(x.r.n)}</b><div class="small muted">${esc(x.r.cat||'')}</div></td><td class="r">${m$(x.C.cp)}</td><td class="r">${x.r.precio?m$(x.r.precio):'<span class="muted">Sin precio</span>'}</td>
      <td class="r">${x.C.fcAct===null?'':`<span class="pill ${x.C.fcAct>S.cfg.fc+3?'bad':x.C.fcAct<=S.cfg.fc?'ok':'mid'}">${pct(x.C.fcAct)}</span>`}</td><td class="r">${x.C.margen===null?'':m$(x.C.margen)}</td>
      <td><input class="input num" data-v inputmode="numeric" aria-label="Ventas al mes"></td>
      <td>${x.clase?`<span class="pill ${x.clase[1]}">${x.clase[0]}</span>`:'<span class="muted small">Falta precio o ventas</span>'}</td></tr>`).join('')}</tbody></table></div>`;
  $$('#menu tr[data-id]').forEach(tr => { const r = S.rec.find(x => x.id === tr.dataset.id); const inp = tr.querySelector('[data-v]'); inp.dataset.blank0 = '';
    bindNum(inp, r.ventas, v => { r.ventas = v; save(); }, 0); inp.addEventListener('change', renderMenu); });
  $('#menu-leyenda').innerHTML = `<p><b>Estrella:</b> se vende mucho y deja buena ganancia. <b>Caballo de batalla:</b> se vende mucho pero deja poco. <b>Rompecabezas:</b> deja buena ganancia pero se vende poco. <b>Perro:</b> se vende poco y deja poco.</p>
    <p>Popular: vende al menos el 70% del promedio por plato. Buena ganancia: igual o mayor que la ganancia promedio ponderada (${m$(A.mgProm)}).</p>`;
}
$('#btn-print').onclick = () => { const A = analisis();
  imprimirDoc('Análisis del menú', `<table><thead><tr><th>Plato</th><th class="r">Costo</th><th class="r">Precio</th><th class="r">Costo alimentos</th><th class="r">Ganancia</th><th class="r">Ventas</th><th>Clasificación</th><th>Acción sugerida</th></tr></thead><tbody>
    ${A.L.map(x => `<tr><td>${esc(x.r.n)}</td><td class="r">${m$(x.C.cp)}</td><td class="r">${m$(x.r.precio||0)}</td><td class="r">${x.C.fcAct===null?'':pct(x.C.fcAct)}</td><td class="r">${x.C.margen===null?'':m$(x.C.margen)}</td><td class="r">${fmt(x.v,0)}</td><td>${x.clase?x.clase[0]:''}</td><td><small>${x.clase?x.clase[2]:''}</small></td></tr>`).join('')}</tbody></table>`, 'Costo objetivo '+fmt(S.cfg.fc)+'%'); };
$('#btn-csv').onclick = () => { const A = analisis();
  csv('analisis-menu', [['Plato','Categoría','Porciones','Costo receta','Costo porción','Precio sugerido','Precio actual','Costo de alimentos %','Ganancia por porción','Ventas al mes','Clasificación'],
    ...A.L.map(x => [x.r.n, x.r.cat||'', x.C.porc, fmt(x.C.total), fmt(x.C.cp), fmt(x.C.sug), fmt(x.r.precio||0), x.C.fcAct===null?'':fmt(x.C.fcAct,1), x.C.margen===null?'':fmt(x.C.margen), x.v, x.clase?x.clase[0]:''])]); };

/* ---------- Configuración ---------- */
bindNum($('#c-fc'), S.cfg.fc, v => { S.cfg.fc = v; save(); });
bindNum($('#c-ind'), S.cfg.ind, v => { S.cfg.ind = v; save(); });
bindNum($('#c-imp'), S.cfg.imp, v => { S.cfg.imp = v; save(); });
$('#c-red').value = String(S.cfg.red); $('#c-red').onchange = e => { S.cfg.red = +e.target.value; save(); };

function renderAll(){ renderRec(); renderIns(); renderMenu(); }
tabs(id => { if (id === 'rec') renderRec(); if (id === 'ins') renderIns(); if (id === 'menu') renderMenu(); });
renderAll(); save();
document.addEventListener('ma:negocio', renderAll);
})();

(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, fechaCorta, fechaLarga, MONEDAS, csv, copiar, whatsapp, negocio} = MA;

const REDONDEOS = [[0,'Ninguno'],[0.05,'0,05'],[0.1,'0,10'],[0.5,'0,50'],[1,'1'],[5,'5'],[10,'10'],[50,'50'],[100,'100'],[500,'500'],[1000,'1.000']];
const DEF = {
  base:'USD', baseRed:0, modo:'margen', fechaTasas:'',
  monedas:[{c:'COP', tasa:4000, red:100, on:true},{c:'VES', tasa:200, red:1, on:true}],
  productos:[
    {id:uid(), cod:'P001', n:'Camiseta básica', cat:'Ropa', costo:4.2, margen:40, manual:0},
    {id:uid(), cod:'P002', n:'Gorra bordada', cat:'Accesorios', costo:3.1, margen:45, manual:0},
    {id:uid(), cod:'P003', n:'Jean clásico', cat:'Ropa', costo:11.5, margen:35, manual:0},
    {id:uid(), cod:'P004', n:'Bolso de cuero', cat:'Accesorios', costo:18, margen:0, manual:39.9}
  ]
};
let S = Object.assign({}, DEF, store.get('estado', {}));
const save = () => store.set('estado', S);

const ceilTo = (v, step) => step > 0 ? Math.ceil(round6(v / step)) * step : v;
const round6 = v => Math.round(v * 1e6) / 1e6;
function precioBase(p){
  if (p.manual > 0) return p.manual;
  const c = +p.costo || 0, m = +p.margen || 0;
  if (S.modo === 'margen') return m >= 100 ? 0 : c / (1 - m/100);
  return c * (1 + m/100);
}
const pBaseRed = p => ceilTo(precioBase(p), S.baseRed);
const enMoneda = (vBase, mon) => ceilTo(vBase * mon.tasa, mon.red);
const margenReal = p => { const pr = pBaseRed(p); return pr > 0 ? (pr - p.costo) / pr * 100 : 0; };
const activas = () => S.monedas.filter(m => m.on && m.tasa > 0);
const redOpts = sel => REDONDEOS.map(([v,l]) => `<option value="${v}" ${+sel===v?'selected':''}>${l}</option>`).join('');

/* ---------- Botones ---------- */
$('#btn-nuevo').innerHTML = I.plus + 'Nuevo producto';
$('#btn-wa').innerHTML = I.wa + 'Compartir';
$('#btn-csv').innerHTML = I.csv + 'Exportar a Excel (CSV)';
$('#btn-import').innerHTML = I.up + 'Importar CSV';
$('#btn-print').innerHTML = I.print + 'Imprimir lista';

/* ---------- Lista ---------- */
function categorias(){ return [...new Set(S.productos.map(p => p.cat).filter(Boolean))].sort(); }
function renderFiltro(){
  const sel = $('#filtro-cat'), v = sel.value;
  sel.innerHTML = `<option value="">Todas las categorías</option>` + categorias().map(c => `<option ${c===v?'selected':''}>${esc(c)}</option>`).join('');
}
function filtrados(){
  const q = $('#buscar').value.trim().toLowerCase(), c = $('#filtro-cat').value;
  return S.productos.filter(p => (!c || p.cat === c) && (!q || (p.n+' '+p.cod).toLowerCase().includes(q)))
    .sort((a,b) => (a.cat||'').localeCompare(b.cat||'') || a.n.localeCompare(b.n));
}
function renderLista(){
  const mons = activas(), list = filtrados();
  const hoy = S.fechaTasas === today();
  $('#kpis').innerHTML = `<div class="kpi"><span>Productos</span><strong>${S.productos.length}</strong><small>${categorias().length} categorías</small></div>`
    + mons.map(m => `<div class="kpi"><span>Tasa ${m.c}</span><strong>${fmt(m.tasa,4)}</strong><small>por 1 ${S.base}</small></div>`).join('')
    + `<div class="kpi ${hoy?'':'accent'}"><span>Tasas</span><strong style="font-size:1.05rem;margin-top:6px">${S.fechaTasas?(hoy?'Actualizadas hoy':'Del '+fechaCorta(S.fechaTasas)):'Sin actualizar'}</strong><small>${hoy?'Listas para vender':'<a href="#" id="ir-tasas">Revisar tasas</a>'}</small></div>`;
  const ir = $('#ir-tasas'); if (ir) ir.onclick = e => { e.preventDefault(); selTab('tasas'); };
  $('#print-cap').innerHTML = `<b>Lista de precios</b>. Válida al ${fechaLarga(today())}. Tasas: ${mons.map(m => `1 ${S.base} = ${fmt(m.tasa,4)} ${m.c}`).join(', ')}.`;
  if (!S.productos.length){ $('#tabla').innerHTML = `<div class="empty"><strong>Tu lista está vacía</strong>Agrega tu primer producto con su costo y margen.<br><button class="btn primary" id="e-nuevo">${I.plus}Nuevo producto</button></div>`; $('#e-nuevo').onclick = () => editar(); return; }
  if (!list.length){ $('#tabla').innerHTML = `<div class="empty"><strong>Sin resultados</strong>Ningún producto coincide con la búsqueda.</div>`; return; }
  $('#tabla').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr>
    <th>Producto</th><th class="no-print">Categoría</th><th class="r no-print">Costo</th><th class="r no-print">Margen</th>
    <th class="r">Precio ${S.base}</th>${mons.map(m => `<th class="r">Precio ${m.c}</th>`).join('')}<th class="no-print"></th></tr></thead><tbody>
    ${list.map(p => { const mr = margenReal(p), pb = pBaseRed(p);
      return `<tr><td><b>${esc(p.n)}</b>${p.cod?`<div class="small muted">${esc(p.cod)}</div>`:''}</td>
      <td class="no-print">${p.cat?`<span class="pill">${esc(p.cat)}</span>`:''}</td>
      <td class="r no-print">${money(p.costo,S.base)}</td>
      <td class="r no-print"><span class="pill ${mr<15?'bad':mr<30?'mid':'ok'}">${pct(mr)}</span></td>
      <td class="r"><b>${money(pb,S.base)}</b></td>
      ${mons.map(m => `<td class="r">${money(enMoneda(pb,m),m.c)}</td>`).join('')}
      <td class="r no-print" style="white-space:nowrap"><button class="btn ghost sm icon" data-ed="${p.id}" aria-label="Editar ${esc(p.n)}">${I.edit}</button><button class="btn ghost sm icon" data-del="${p.id}" aria-label="Eliminar ${esc(p.n)}">${I.trash}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('[data-ed]').forEach(b => b.onclick = () => editar(S.productos.find(p => p.id === b.dataset.ed)));
  $$('[data-del]').forEach(b => b.onclick = async () => { const p = S.productos.find(x => x.id === b.dataset.del);
    if (!(await confirmar('¿Eliminar «'+p.n+'» de la lista?'))) return; S.productos = S.productos.filter(x => x !== p); save(); renderAll(); toast('Producto eliminado'); });
}
$('#buscar').addEventListener('input', renderLista);
$('#filtro-cat').addEventListener('change', renderLista);

function editar(p){
  const nuevo = !p; p = p || {id:uid(), cod:'', n:'', cat:'', costo:0, margen:S.modo==='margen'?35:50, manual:0};
  const cats = categorias().map(c => `<option value="${esc(c)}">`).join('');
  var tmp = {costo:p.costo, margen:p.margen, manual:p.manual};
  dialog({title: nuevo?'Nuevo producto':'Editar producto', body:`
    <div class="fields">
      <label class="field" style="grid-column:1/-1"><span>Nombre</span><input class="input" id="f-n" value="${esc(p.n)}" placeholder="Ej: Camiseta básica"></label>
      <label class="field"><span>Código</span><input class="input" id="f-cod" value="${esc(p.cod)}"></label>
      <label class="field"><span>Categoría</span><input class="input" id="f-cat" value="${esc(p.cat)}" list="dl-cat"><datalist id="dl-cat">${cats}</datalist></label>
      <label class="field"><span>Costo (${S.base})</span><input class="input num" id="f-costo" inputmode="decimal"></label>
      <label class="field"><span>${S.modo==='margen'?'Margen sobre el precio':'Recargo sobre el costo'}</span><div class="input-group"><input class="input num" id="f-margen" inputmode="decimal"><span class="addon">%</span></div></label>
      <label class="field" style="grid-column:1/-1"><span>Precio fijo (${S.base})</span><input class="input num" id="f-manual" inputmode="decimal" placeholder="Opcional: reemplaza el cálculo por margen">
    </div>
    <div class="ticket" style="margin-top:18px"><div class="ticket-lines" style="border:0;padding:0" id="f-prev"></div></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label: nuevo?'Agregar producto':'Guardar cambios', cls:'primary', onClick:(dl)=>{
      const n = $('#f-n',dl).value.trim(); if (!n){ toast('Escribe el nombre del producto.', true); $('#f-n',dl).focus(); return false; }
      Object.assign(p, {n, cod:$('#f-cod',dl).value.trim(), cat:$('#f-cat',dl).value.trim(), costo:tmp.costo, margen:tmp.margen, manual:tmp.manual});
      if (nuevo) S.productos.push(p); save(); renderAll(); toast(nuevo?'Producto agregado':'Cambios guardados');
    }}], onOpen: dl => {
      const prev = () => { const q = Object.assign({}, p, tmp); const pb = pBaseRed(q); const mr = pb>0?(pb-q.costo)/pb*100:0;
        $('#f-prev',dl).innerHTML = `<div class="ticket-line"><span>Precio en ${S.base}</span><b>${money(pb,S.base)}</b></div>`
          + activas().map(m => `<div class="ticket-line"><span>Precio en ${m.c}</span><b>${money(enMoneda(pb,m),m.c)}</b></div>`).join('')
          + `<div class="ticket-line total"><span>Ganancia por unidad</span><b class="${mr<0?'neg':'pos'}">${money(pb-q.costo,S.base)} (${pct(mr)})</b></div>`; };
      bindNum($('#f-costo',dl), p.costo, v => { tmp.costo = v; prev(); });
      bindNum($('#f-margen',dl), p.margen, v => { tmp.margen = v; prev(); });
      $('#f-manual',dl).dataset.blank0=''; bindNum($('#f-manual',dl), p.manual, v => { tmp.manual = v; prev(); });
      prev(); $('#f-n',dl).focus();
    }});
}
$('#btn-nuevo').onclick = () => editar();

$('#btn-ajuste').onclick = () => {
  dialog({title:'Ajustar precios', body:`<p class="muted small" style="margin-bottom:12px">Útil cuando suben tus proveedores. Se aplica a los productos que ves en la lista (respeta la búsqueda y la categoría).</p>
    <div class="fields"><label class="field"><span>Qué ajustar</span><select class="input" id="aj-que"><option value="costo">Costos</option><option value="margen">Margen o recargo (puntos)</option></select></label>
    <label class="field"><span>Cambio</span><div class="input-group"><input class="input num" id="aj-v" inputmode="decimal" value="5"><span class="addon" id="aj-u">%</span></div><small class="hint">Usa números negativos para bajar.</small></label></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Aplicar ajuste', cls:'primary', onClick:(d)=>{
      const que = $('#aj-que',d).value, v = num($('#aj-v',d).value), list = filtrados();
      list.forEach(p => { if (que === 'costo'){ p.costo = Math.round(p.costo * (1 + v/100) * 10000) / 10000; if (p.manual>0) p.manual = Math.round(p.manual*(1+v/100)*100)/100; } else p.margen = Math.max(0, p.margen + v); });
      save(); renderAll(); toast('Ajuste aplicado a '+list.length+' productos');
    }}], onOpen: d => { $('#aj-que',d).onchange = e => $('#aj-u',d).textContent = e.target.value==='costo'?'%':'pts'; }});
};

$('#btn-wa').onclick = () => {
  const mons = [{c:S.base, tasa:1, red:S.baseRed}, ...activas()];
  dialog({title:'Compartir lista por WhatsApp', body:`<p class="muted small" style="margin-bottom:10px">Elige en qué monedas mostrar los precios.</p>
    <div class="row" id="wa-mons">${mons.map((m,i) => `<label class="check"><input type="checkbox" value="${m.c}" ${i<2?'checked':''}>${m.c}</label>`).join('')}</div>
    <textarea class="input" id="wa-txt" style="margin-top:12px;min-height:220px;font-size:.85rem"></textarea>`,
    actions:[{label:'Copiar texto', cls:'', onClick:(d)=>{ copiar($('#wa-txt',d).value); return false; }},{label:'Abrir WhatsApp', cls:'primary', onClick:(d)=>{ whatsapp($('#wa-txt',d).value); }}],
    onOpen: d => {
      const gen = () => { const sel = $$('#wa-mons input:checked', d).map(i => i.value); const ms = mons.filter(m => sel.includes(m.c)); const n = negocio();
        let txt = `*Lista de precios${n.nombre?' — '+n.nombre:''}*\n_${fechaLarga(today())}_\n`; let cat = null;
        filtrados().forEach(p => { if (p.cat !== cat){ cat = p.cat; txt += `\n*${cat||'Otros'}*\n`; } const pb = pBaseRed(p);
          txt += `• ${p.n}: ${ms.map(m => money(m.c===S.base?pb:enMoneda(pb,m), m.c)).join(' / ')}\n`; });
        $('#wa-txt',d).value = txt.trim(); };
      $$('#wa-mons input', d).forEach(i => i.onchange = gen); gen(); }});
};

$('#btn-csv').onclick = () => {
  const mons = activas();
  csv('lista-precios-'+today(), [['Código','Producto','Categoría','Costo '+S.base, S.modo==='margen'?'Margen %':'Recargo %','Precio fijo','Precio '+S.base, ...mons.map(m => 'Precio '+m.c)],
    ...filtrados().map(p => { const pb = pBaseRed(p); return [p.cod, p.n, p.cat, fmt(p.costo,4), fmt(p.margen,2), p.manual?fmt(p.manual,4):'', fmt(pb,2), ...mons.map(m => fmt(enMoneda(pb,m),2))]; })]);
};
$('#btn-import').onclick = () => {
  dialog({title:'Importar productos desde CSV', body:`<p class="small">El archivo debe tener columnas en este orden, separadas por punto y coma o coma:</p>
    <p class="small" style="margin:8px 0;padding:8px 10px;background:var(--canvas);border-radius:8px"><b>Código; Producto; Categoría; Costo; Margen %</b></p>
    <p class="small muted">La primera fila puede ser de títulos. Los productos con el mismo código se actualizan.</p>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Elegir archivo', cls:'primary', onClick:()=>{
      const inp = document.createElement('input'); inp.type='file'; inp.accept='.csv,text/csv,.txt';
      inp.onchange = () => { const rd = new FileReader(); rd.onload = () => {
        const lines = String(rd.result).replace(/^﻿/,'').split(/\r?\n/).filter(l => l.trim());
        const sep = (lines[0]||'').split(';').length > 1 ? ';' : ',';
        let n = 0, upd = 0;
        lines.forEach((l, i) => { const c = l.split(sep).map(x => x.replace(/^"|"$/g,'').trim());
          if (c.length < 4 || (i===0 && isNaN(num(c[3])))) return; if (i===0 && !/\d/.test(c[3])) return;
          const ex = c[0] && S.productos.find(p => p.cod === c[0]);
          const o = {cod:c[0], n:c[1]||c[0], cat:c[2]||'', costo:num(c[3]), margen:c[4]!==undefined?num(c[4]):35};
          if (ex){ Object.assign(ex, o); upd++; } else { S.productos.push(Object.assign({id:uid(), manual:0}, o)); n++; } });
        save(); renderAll(); toast(`${n} productos nuevos, ${upd} actualizados`); };
        rd.readAsText(inp.files[0]); };
      inp.click(); }}]});
};
$('#btn-print').onclick = () => window.print();

/* ---------- Monedas y tasas ---------- */
function renderTasas(){
  $('#base').innerHTML = Object.entries(MONEDAS).map(([k,v]) => `<option value="${k}" ${k===S.base?'selected':''}>${k} (${v.n})</option>`).join('');
  $('#base-red').innerHTML = redOpts(S.baseRed);
  $$('#modo-margen button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.modo));
  $('#modo-hint').textContent = S.modo === 'margen'
    ? 'Con costo 60 y margen 40%, el precio es 100: el 40% del precio es ganancia.'
    : 'Con costo 60 y recargo 40%, el precio es 84: se suma el 40% al costo.';
  const box = $('#monedas');
  if (!S.monedas.length) box.innerHTML = `<div class="empty"><strong>Solo usas tu moneda base</strong>Agrega otra moneda para ver precios convertidos.</div>`;
  else {
    box.innerHTML = `<div class="table-wrap"><table class="t t-edit"><thead><tr><th>Moneda</th><th class="r">1 ${S.base} =</th><th>Redondear a</th><th class="c">Mostrar</th><th></th></tr></thead><tbody>
      ${S.monedas.map((m,i) => `<tr data-i="${i}"><td><b>${m.c}</b><div class="small muted">${esc((MONEDAS[m.c]||{}).n||'')}</div></td>
        <td><input class="input num" data-k="tasa" inputmode="decimal" style="min-width:100px" aria-label="Tasa ${m.c}"></td>
        <td><select class="input" data-k="red" aria-label="Redondeo ${m.c}">${redOpts(m.red)}</select></td>
        <td class="c"><input type="checkbox" data-k="on" ${m.on?'checked':''} aria-label="Mostrar ${m.c}" style="accent-color:var(--accent);width:18px;height:18px"></td>
        <td><button class="btn ghost sm icon" data-k="del" aria-label="Quitar ${m.c}">${I.trash}</button></td></tr>`).join('')}
    </tbody></table></div>`;
    $$('#monedas tr[data-i]').forEach(tr => { const m = S.monedas[+tr.dataset.i];
      bindNum(tr.querySelector('[data-k=tasa]'), m.tasa, v => { m.tasa = v; save(); }, 4);
      tr.querySelector('[data-k=tasa]').addEventListener('change', () => { S.fechaTasas = today(); save(); renderTasas(); });
      tr.querySelector('[data-k=red]').onchange = e => { m.red = +e.target.value; save(); };
      tr.querySelector('[data-k=on]').onchange = e => { m.on = e.target.checked; save(); };
      tr.querySelector('[data-k=del]').onclick = () => { S.monedas = S.monedas.filter(x => x !== m); save(); renderTasas(); }; });
  }
  const usadas = [S.base, ...S.monedas.map(m => m.c)];
  $('#add-mon').innerHTML = Object.entries(MONEDAS).filter(([k]) => !usadas.includes(k)).map(([k,v]) => `<option value="${k}">${k} (${v.n})</option>`).join('');
  $('#btn-hoy').textContent = S.fechaTasas === today() ? 'Tasas actualizadas hoy' : 'Marcar tasas como actualizadas hoy';
}
$('#base').onchange = async e => {
  const nb = e.target.value;
  if (S.productos.length && !(await confirmar(`Tus costos seguirán con los mismos números pero se leerán en ${nb}. Si quieres convertirlos, ajusta los costos después.`, 'Cambiar moneda base', false))){ e.target.value = S.base; return; }
  S.monedas = S.monedas.filter(m => m.c !== nb); S.base = nb; save(); renderTasas();
};
$('#base-red').onchange = e => { S.baseRed = +e.target.value; save(); };
$$('#modo-margen button').forEach(b => b.onclick = () => { S.modo = b.dataset.v; save(); renderTasas(); });
$('#btn-add-mon').onclick = () => { const c = $('#add-mon').value; if (!c) return; S.monedas.push({c, tasa:1, red:(MONEDAS[c]||{}).d===0?100:0.1, on:true}); save(); renderTasas(); toast('Escribe la tasa de '+c); };
$('#btn-hoy').onclick = () => { S.fechaTasas = today(); save(); renderTasas(); toast('Tasas marcadas como actualizadas hoy'); };

/* ---------- Convertidor ---------- */
let conv = store.get('conv', {v:100, m:'USD'});
function renderConv(){
  const all = [{c:S.base, tasa:1, red:0}, ...S.monedas.filter(m => m.tasa > 0)];
  const sel = $('#conv-m'); const cur = all.some(m => m.c === conv.m) ? conv.m : S.base;
  sel.innerHTML = all.map(m => `<option ${m.c===cur?'selected':''}>${m.c}</option>`).join('');
  const from = all.find(m => m.c === cur); const enBase = conv.v / from.tasa;
  $('#conv-res').innerHTML = `<div class="ticket-top"><h3>Equivale a</h3><span>${S.fechaTasas?'Tasas del '+fechaCorta(S.fechaTasas):'Tasas sin fecha'}</span></div>
    <div class="ticket-hero"><span>${money(conv.v, cur)}</span><strong>${money(enBase, S.base)}</strong><small>en ${S.base}, tu moneda base</small></div>
    <div class="ticket-lines">${all.filter(m => m.c !== S.base && m.c !== cur).map(m => `<div class="ticket-line"><span>${esc((MONEDAS[m.c]||{}).n||m.c)}</span><b>${money(enBase*m.tasa, m.c)}</b></div>`).join('') || '<p class="muted small">Agrega más monedas en «Monedas y tasas».</p>'}</div>`;
}
bindNum($('#conv-v'), conv.v, v => { conv.v = v; store.set('conv', conv); renderConv(); });
$('#conv-m').onchange = e => { conv.m = e.target.value; store.set('conv', conv); renderConv(); };

function renderAll(){ renderFiltro(); renderLista(); renderTasas(); renderConv(); }
const selTab = tabs(id => { if (id === 'lista') { renderFiltro(); renderLista(); } if (id === 'conv') renderConv(); });
renderAll();
})();

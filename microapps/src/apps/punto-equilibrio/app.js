(function(){
const {$, esc, uid, num, money, moneyK, bindNum, fmt, pct, store, toast, confirmar, dialog, tabs, I, today, fechaCorta} = MA;

const DEF = {
  fijos: [{id:uid(), c:'Arriendo', v:1200000},{id:uid(), c:'Sueldos', v:2600000},{id:uid(), c:'Servicios públicos e internet', v:350000},{id:uid(), c:'Publicidad', v:200000}],
  precio: 18000, cv: 7500, meta: 1500000, esperadas: 600, dias: 26,
  productos: [{id:uid(), n:'Producto A', p:18000, cv:7500, u:400},{id:uid(), n:'Producto B', p:32000, cv:15000, u:150},{id:uid(), n:'Producto C', p:9000, cv:3200, u:300}]
};
let S = Object.assign({}, DEF, store.get('estado', {}));
let modo = 'calc';
const save = () => store.set('estado', S);

$('#add-fijo').innerHTML = I.plus + 'Agregar costo fijo';
$('#add-prod').innerHTML = I.plus + 'Agregar producto';
$('#guardar').innerHTML = 'Guardar escenario';
$('#imprimir').innerHTML = I.print + 'Imprimir';

const totalFijos = () => S.fijos.reduce((a,f) => a + (+f.v||0), 0);

/* ---------- Costos fijos ---------- */
function renderFijos(){
  const tb = $('#fijos');
  tb.innerHTML = S.fijos.map(f => `<tr data-id="${f.id}">
    <td><input class="input" data-k="c" value="${esc(f.c)}" aria-label="Concepto"></td>
    <td><input class="input num" data-k="v" inputmode="decimal" aria-label="Valor mensual"></td>
    <td><button class="btn ghost sm icon" data-del aria-label="Quitar ${esc(f.c)}">${I.trash}</button></td></tr>`).join('');
  tb.querySelectorAll('tr').forEach(tr => {
    const f = S.fijos.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-k=c]').addEventListener('input', e => { f.c = e.target.value; save(); });
    bindNum(tr.querySelector('[data-k=v]'), f.v, v => { f.v = v; save(); calc(); }, 0);
    tr.querySelector('[data-del]').onclick = () => { S.fijos = S.fijos.filter(x => x.id !== f.id); save(); renderFijos(); calc(); };
  });
  calc();
}
$('#add-fijo').onclick = () => { S.fijos.push({id:uid(), c:'', v:0}); save(); renderFijos(); const ins = $('#fijos').querySelectorAll('tr:last-child input'); ins[0] && ins[0].focus(); };

/* ---------- Un producto ---------- */
bindNum($('#precio'), S.precio, v => { S.precio = v; save(); calc(); });
bindNum($('#cv'), S.cv, v => { S.cv = v; save(); calc(); });
$('#meta').dataset.blank0 = ''; $('#esperadas').dataset.blank0 = '';
bindNum($('#meta'), S.meta, v => { S.meta = v; save(); calc(); });
bindNum($('#esperadas'), S.esperadas, v => { S.esperadas = v; save(); calc(); }, 0);
bindNum($('#dias'), S.dias, v => { S.dias = v; save(); calc(); }, 0);

/* ---------- Varios productos ---------- */
function renderProds(){
  const tb = $('#prods');
  tb.innerHTML = S.productos.map(p => `<tr data-id="${p.id}">
    <td><input class="input" data-k="n" value="${esc(p.n)}" aria-label="Producto" style="min-width:120px"></td>
    <td><input class="input num" data-k="p" inputmode="decimal" aria-label="Precio" style="min-width:90px"></td>
    <td><input class="input num" data-k="cv" inputmode="decimal" aria-label="Costo variable" style="min-width:90px"></td>
    <td><input class="input num" data-k="u" inputmode="decimal" aria-label="Unidades al mes" style="min-width:70px"></td>
    <td><button class="btn ghost sm icon" data-del aria-label="Quitar">${I.trash}</button></td></tr>`).join('');
  tb.querySelectorAll('tr').forEach(tr => {
    const p = S.productos.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-k=n]').addEventListener('input', e => { p.n = e.target.value; save(); calc(); });
    bindNum(tr.querySelector('[data-k=p]'), p.p, v => { p.p = v; save(); calc(); });
    bindNum(tr.querySelector('[data-k=cv]'), p.cv, v => { p.cv = v; save(); calc(); });
    bindNum(tr.querySelector('[data-k=u]'), p.u, v => { p.u = v; save(); calc(); }, 0);
    tr.querySelector('[data-del]').onclick = () => { S.productos = S.productos.filter(x => x.id !== p.id); save(); renderProds(); };
  });
  calc();
}
$('#add-prod').onclick = () => { S.productos.push({id:uid(), n:'Producto '+(S.productos.length+1), p:0, cv:0, u:0}); save(); renderProds(); };

/* ---------- Cálculo ---------- */
function resultado(){
  const CF = totalFijos();
  if (modo === 'multi'){
    const ps = S.productos.filter(p => p.u > 0);
    const U = ps.reduce((a,p) => a + p.u, 0);
    if (!U) return {CF, err:'Escribe las unidades que vendes al mes de al menos un producto.'};
    const mcw = ps.reduce((a,p) => a + (p.p - p.cv) * p.u / U, 0);
    const pw = ps.reduce((a,p) => a + p.p * p.u / U, 0);
    const cvw = pw - mcw;
    return {CF, P:pw, CV:cvw, MC:mcw, esperadas:U, meta:S.meta, multi:ps.map(p => ({...p, mix:p.u/U})), dias:S.dias};
  }
  return {CF, P:S.precio, CV:S.cv, MC:S.precio - S.cv, esperadas:S.esperadas, meta:S.meta, dias:S.dias};
}

function calc(){
  $('#fijos-total').textContent = money(totalFijos());
  const r = resultado();
  const t = $('#ticket');
  const head = `<div class="ticket-top"><h3>Punto de equilibrio</h3><span>${modo==='multi'?'Varios productos':'Un producto'}</span></div>`;
  if (r.err){ t.innerHTML = head + `<div class="empty" style="border:0">${esc(r.err)}</div>`; $('#chart').innerHTML=''; renderMulti(r); return; }
  if (!(r.P > 0)){ t.innerHTML = head + `<div class="empty" style="border:0"><strong>Falta el precio de venta</strong>Escribe cuánto cobras por unidad.</div>`; $('#chart').innerHTML=''; renderMulti(r); return; }
  if (r.MC <= 0){
    t.innerHTML = head + `<div class="ticket-hero"><span>Resultado</span><strong class="neg" style="color:var(--neg)">Sin equilibrio</strong>
      <small>Con este precio pierdes dinero en cada venta: el costo variable (${money(r.CV)}) es igual o mayor que el precio (${money(r.P)}). Sube el precio o baja el costo por unidad.</small></div>`;
    $('#chart').innerHTML=''; renderMulti(r); return;
  }
  const mcPct = r.MC / r.P * 100;
  const peU = r.CF / r.MC, peV = peU * r.P;
  const metaU = r.meta > 0 ? (r.CF + r.meta) / r.MC : 0;
  const dia = r.dias > 0 ? peU / r.dias : 0;
  let seg = '';
  if (r.esperadas > 0){
    const ventas = r.esperadas * r.P; const ms = (ventas - peV) / ventas * 100; const util = r.esperadas * r.MC - r.CF;
    seg = `<div class="ticket-line"><span>Ventas esperadas</span><b>${fmt(r.esperadas,0)} unid. = ${money(ventas)}</b></div>
      <div class="ticket-line"><span>Margen de seguridad</span><b class="${ms>=0?'pos':'neg'}">${pct(ms)}</b></div>
      <div class="ticket-line total"><span>${util>=0?'Utilidad estimada del mes':'Pérdida estimada del mes'}</span><b class="${util>=0?'pos':'neg'}">${money(util)}</b></div>`;
  }
  t.innerHTML = head + `<div class="ticket-hero"><span>Debes vender al mes</span><strong>${fmt(Math.ceil(peU),0)} unidades</strong>
      <small>Equivale a ${money(peV)} en ventas${dia?`, unas ${fmt(Math.ceil(dia),0)} unidades por día`:''}.</small></div>
    <div class="ticket-lines">
      <div class="ticket-line"><span>Costos fijos del mes</span><b>${money(r.CF)}</b></div>
      <div class="ticket-line"><span>${modo==='multi'?'Precio promedio':'Precio por unidad'}</span><b>${money(r.P)}</b></div>
      <div class="ticket-line"><span>Margen de contribución por unidad</span><b>${money(r.MC)}</b></div>
      <div class="ticket-line"><span>Margen de contribución</span><b>${pct(mcPct)}</b></div>
      ${metaU?`<div class="ticket-line"><span>Para ganar ${money(r.meta)}</span><b>${fmt(Math.ceil(metaU),0)} unid. = ${money(metaU*r.P)}</b></div>`:''}
      ${seg}
    </div>`;
  chart(r, peU);
  renderMulti(r, peU);
}

function renderMulti(r, peU){
  if (modo !== 'multi') return;
  const tb = $('#multi-tabla'), tf = $('#multi-foot');
  if (!r.multi || !peU){ tb.innerHTML = `<tr><td colspan="5" class="muted">Completa precios, costos y unidades para ver el detalle.</td></tr>`; tf.innerHTML=''; return; }
  let tu=0, tv=0;
  tb.innerHTML = r.multi.map(p => { const u = peU * p.mix, v = u * p.p; tu+=u; tv+=v;
    return `<tr><td>${esc(p.n)}</td><td class="r">${pct(p.mix*100)}</td><td class="r ${p.p-p.cv<0?'neg':''}">${money(p.p-p.cv)}</td><td class="r"><b>${fmt(Math.ceil(u),0)}</b></td><td class="r">${money(v)}</td></tr>`; }).join('');
  tf.innerHTML = `<tr><td>Total</td><td class="r">100%</td><td></td><td class="r">${fmt(Math.ceil(tu),0)}</td><td class="r">${money(tv)}</td></tr>`;
}

/* ---------- Gráfico ---------- */
function chart(r, peU){
  const W=600, H=300, L=62, R=16, T=18, B=42;
  const xmax = Math.max(peU*2, (r.esperadas||0)*1.15, 10);
  const ymax = Math.max(r.P*xmax, r.CF + r.CV*xmax) * 1.05;
  const X = u => L + u/xmax*(W-L-R), Y = v => H-B - v/ymax*(H-T-B);
  const ticks = 4; let grid='';
  for (let i=0;i<=ticks;i++){ const v=ymax*i/ticks, y=Y(v);
    grid += `<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="var(--line)"/><text x="${L-8}" y="${y+4}" text-anchor="end" font-size="12.5" fill="var(--ink-3)">${moneyK(v)}</text>`; }
  for (let i=0;i<=4;i++){ const u=xmax*i/4; grid += `<text x="${X(u)}" y="${H-B+18}" text-anchor="middle" font-size="12.5" fill="var(--ink-3)">${fmt(u,0)}</text>`; }
  const px=X(peU), py=Y(peU*r.P);
  const loss = `M${X(0)},${Y(0)} L${px},${py} L${X(0)},${Y(r.CF)} Z`;
  const prof = `M${px},${py} L${X(xmax)},${Y(r.P*xmax)} L${X(xmax)},${Y(r.CF+r.CV*xmax)} Z`;
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico: el punto de equilibrio está en ${fmt(Math.ceil(peU),0)} unidades" style="display:block;overflow:visible">
    ${grid}
    <path d="${loss}" fill="var(--neg)" opacity=".09"/><path d="${prof}" fill="var(--pos)" opacity=".1"/>
    <line x1="${X(0)}" y1="${Y(r.CF)}" x2="${X(xmax)}" y2="${Y(r.CF)}" stroke="var(--ink-3)" stroke-dasharray="4 4"/>
    <line x1="${X(0)}" y1="${Y(r.CF)}" x2="${X(xmax)}" y2="${Y(r.CF+r.CV*xmax)}" stroke="var(--neg)" stroke-width="2.5"/>
    <line x1="${X(0)}" y1="${Y(0)}" x2="${X(xmax)}" y2="${Y(r.P*xmax)}" stroke="var(--accent)" stroke-width="2.5"/>
    <line x1="${px}" y1="${py}" x2="${px}" y2="${H-B}" stroke="var(--ink-2)" stroke-dasharray="3 3"/>
    <circle cx="${px}" cy="${py}" r="6" fill="var(--paper)" stroke="var(--ink)" stroke-width="2.5"/>
    <text x="${px+10}" y="${py-10}" font-size="12" font-weight="700" fill="var(--ink)">${fmt(Math.ceil(peU),0)} unid.</text>
    <text x="${W-R}" y="${H-6}" text-anchor="end" font-size="12.5" fill="var(--ink-3)">Unidades vendidas al mes</text>
  </svg>
  <div class="row small" style="gap:16px;margin-top:6px">
    <span class="row" style="gap:6px"><i style="width:14px;height:3px;background:var(--accent);display:inline-block"></i>Ingresos</span>
    <span class="row" style="gap:6px"><i style="width:14px;height:3px;background:var(--neg);display:inline-block"></i>Costos totales</span>
    <span class="row" style="gap:6px"><i style="width:14px;border-top:2px dashed var(--ink-3);display:inline-block"></i>Costos fijos</span>
  </div>`;
}

/* ---------- Escenarios ---------- */
let ESC = store.get('escenarios', []);
function renderEsc(){
  const box = $('#esc-lista');
  if (!ESC.length){ box.innerHTML = `<div class="empty"><strong>Aún no tienes escenarios</strong>Ajusta los números y toca «Guardar escenario» para compararlos después.</div>`; return; }
  box.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Escenario</th><th class="r">Costos fijos</th><th class="r">Precio</th><th class="r">Equilibrio</th><th></th></tr></thead><tbody>
    ${ESC.map(e => `<tr><td><b>${esc(e.nombre)}</b><div class="small muted">${fechaCorta(e.fecha)}, ${e.modo==='multi'?'Varios productos':'Un producto'}</div></td>
      <td class="r">${money(e.cf)}</td><td class="r">${money(e.p)}</td><td class="r"><b>${e.peU?fmt(Math.ceil(e.peU),0)+' unid.':'Sin equilibrio'}</b><div class="small muted">${e.peU?money(e.peU*e.p):''}</div></td>
      <td class="r" style="white-space:nowrap"><button class="btn sm" data-open="${e.id}">Abrir</button> <button class="btn ghost sm icon" data-del="${e.id}" aria-label="Eliminar">${I.trash}</button></td></tr>`).join('')}
  </tbody></table></div>`;
  box.querySelectorAll('[data-open]').forEach(b => b.onclick = () => { const e = ESC.find(x => x.id === b.dataset.open);
    S = JSON.parse(JSON.stringify(e.estado)); save(); renderAll(); selTab(e.modo); toast('Escenario «'+e.nombre+'» cargado'); });
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este escenario?'))) return;
    ESC = ESC.filter(x => x.id !== b.dataset.del); store.set('escenarios', ESC); renderEsc(); });
}
$('#guardar').onclick = () => {
  const r = resultado(); if (r.err || !(r.MC>0) && !(r.P>0)) { toast('Completa los datos antes de guardar.', true); return; }
  dialog({title:'Guardar escenario', body:`<label class="field"><span>Nombre del escenario</span><input class="input" id="esc-n" value="${modo==='multi'?'Mezcla de productos':'Precio '+money(r.P)}"></label>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Guardar', cls:'primary', onClick:(d)=>{
      const peU = r.MC>0 ? r.CF/r.MC : 0;
      ESC.unshift({id:uid(), nombre:$('#esc-n',d).value.trim()||'Escenario', fecha:today(), modo, cf:r.CF, p:r.P, peU, estado:JSON.parse(JSON.stringify(S))});
      store.set('escenarios', ESC); renderEsc(); toast('Escenario guardado');
    }}], onOpen:d=>$('#esc-n',d).select()});
};
$('#imprimir').onclick = () => window.print();

function renderAll(){ renderFijos(); renderProds(); bindReload(); renderEsc(); }
function bindReload(){ ['precio','cv','meta','esperadas','dias'].forEach(k => { const el=$('#'+k); const v=S[k]; el.value = (v||v===0) && !(v===0 && el.dataset.blank0!==undefined) ? fmt(v, k==='esperadas'||k==='dias'?0:2) : ''; }); }

const selTab = tabs(id => { if (id === 'calc' || id === 'multi'){ modo = id; } calc(); });
renderAll();
document.addEventListener('ma:negocio', calc);
})();

(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, monthKey, mesNombre, fechaCorta, csv, negocio} = MA;

const cur = () => negocio().moneda || 'COP';
let CFG = Object.assign({metodo:'prom'}, store.get('cfg', {}));
let P = store.get('productos', null), M = store.get('movs', null);
if (!P){ // ejemplo
  const a = uid(), b = uid(), c = uid(), mk = monthKey();
  P = [{id:a, cod:'ARZ-01', n:'Arroz 1 kg', und:'Unidad', cat:'Granos', min:40, precio:4800},
       {id:b, cod:'ACT-02', n:'Aceite 1 L', und:'Unidad', cat:'Aceites', min:20, precio:11900},
       {id:c, cod:'AZU-03', n:'Azúcar 1 kg', und:'Unidad', cat:'Granos', min:30, precio:4500}];
  let s = 0; const mv = (f, pid, tipo, cant, cu, pv, ref) => ({id:uid(), seq:s++, fecha:mk+'-'+f, pid, tipo, cant, cu:cu||0, pv:pv||0, ref});
  M = [mv('01',a,'in',100,3500,0,'Compra FC-881 Distribuidora Andina'), mv('01',b,'in',50,8900,0,'Compra FC-881 Distribuidora Andina'), mv('01',c,'in',60,3200,0,'Compra FC-882'),
       mv('05',a,'out',45,0,4800,'Ventas semana 1'), mv('06',b,'out',22,0,11900,'Ventas semana 1'), mv('08',a,'in',80,3700,0,'Compra FC-905'),
       mv('12',a,'out',70,0,4800,'Ventas semana 2'), mv('13',c,'out',38,0,4500,'Ventas semana 2'), mv('14',b,'out',20,0,11900,'Ventas semana 2'), mv('15',c,'aj',-2,0,0,'Conteo físico: bolsas rotas')];
}
const saveP = () => store.set('productos', P), saveM = () => store.set('movs', M), saveCfg = () => store.set('cfg', CFG);
saveP(); saveM();
const prod = id => P.find(p => p.id === id);
const nextSeq = () => M.reduce((a,m) => Math.max(a, m.seq||0), 0) + 1;

/* ---------- Motor de valoración ---------- */
function kardex(pid, metodo = CFG.metodo){
  const ms = M.filter(m => m.pid === pid).sort((a,b) => a.fecha.localeCompare(b.fecha) || (a.seq - b.seq));
  let q = 0, v = 0, capas = [], lastCu = 0; const rows = [];
  ms.forEach(m => {
    const r = {m, ent:null, sal:null};
    const entrada = m.tipo === 'in' || (m.tipo === 'aj' && m.cant > 0);
    const cant = Math.abs(m.cant);
    if (entrada){
      const cu = m.tipo === 'in' ? m.cu : (q > 0 ? v / q : lastCu);
      q += cant; v += cant * cu; lastCu = cu || lastCu; capas.push({q:cant, cu});
      r.ent = {q:cant, cu, t:cant*cu};
    } else {
      let costo = 0;
      if (metodo === 'peps'){
        let falta = cant;
        while (falta > 1e-9 && capas.length){ const c = capas[0]; const tom = Math.min(c.q, falta); costo += tom * c.cu; c.q -= tom; falta -= tom; if (c.q <= 1e-9) capas.shift(); }
        if (falta > 1e-9) costo += falta * lastCu;
      } else {
        const cpu = q > 0 ? v / q : lastCu; costo = cant * cpu;
        // mantener capas coherentes por si se cambia de método
        let falta = cant; while (falta > 1e-9 && capas.length){ const c = capas[0]; const tom = Math.min(c.q, falta); c.q -= tom; falta -= tom; if (c.q <= 1e-9) capas.shift(); }
      }
      q -= cant; v -= costo; if (Math.abs(q) < 1e-9){ q = 0; v = 0; }
      r.sal = {q:cant, cu: cant ? costo/cant : 0, t:costo};
    }
    r.saldo = {q, cu: q > 0 ? v/q : 0, t:v};
    rows.push(r);
  });
  return {rows, q, v, cpu: q > 0 ? v/q : lastCu};
}
function estado(p, k){ return k.q <= 0 ? 'agotado' : (p.min > 0 && k.q <= p.min) ? 'bajo' : 'ok'; }

/* ---------- Inventario ---------- */
$('#btn-nuevo').innerHTML = I.plus + 'Nuevo producto';
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)';
$('#q').addEventListener('input', renderInv); $('#f-estado').addEventListener('change', renderInv);
function renderInv(){
  const c = cur(), Q = $('#q').value.trim().toLowerCase(), F = $('#f-estado').value;
  const data = P.map(p => { const k = kardex(p.id); return {p, k, e:estado(p,k)}; });
  const total = data.reduce((a,x) => a + x.k.v, 0);
  const bajos = data.filter(x => x.e === 'bajo').length, agot = data.filter(x => x.e === 'agotado').length;
  const mk = monthKey();
  const ventasMes = M.filter(m => m.tipo === 'out' && m.fecha.slice(0,7) === mk && m.pv > 0);
  $('#kpis').innerHTML = `<div class="kpi accent"><span>Valor del inventario</span><strong>${money(total,c)}</strong><small>A costo, método ${CFG.metodo==='peps'?'PEPS':'promedio'}</small></div>
    <div class="kpi"><span>Productos</span><strong>${P.length}</strong><small>${data.reduce((a,x)=>a+Math.max(0,x.k.q),0).toLocaleString('es-CO')} unidades en total</small></div>
    <div class="kpi"><span>Bajo el mínimo</span><strong class="${bajos?'warn':''}">${bajos}</strong><small>Para reordenar</small></div>
    <div class="kpi"><span>Agotados</span><strong class="${agot?'neg':''}">${agot}</strong><small>${ventasMes.length} ventas con precio este mes</small></div>`;
  const list = data.filter(x => (!F || x.e === F) && (!Q || (x.p.n+' '+x.p.cod+' '+(x.p.cat||'')).toLowerCase().includes(Q))).sort((a,b) => a.p.n.localeCompare(b.p.n));
  if (!P.length){ $('#inventario').innerHTML = `<div class="empty"><strong>Tu inventario está vacío</strong>Crea tu primer producto y registra su entrada.</div>`; return; }
  if (!list.length){ $('#inventario').innerHTML = `<div class="empty"><strong>Sin resultados</strong>Ningún producto coincide.</div>`; return; }
  $('#inventario').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Producto</th><th class="r">Existencias</th><th class="r">Mínimo</th><th class="r">Costo unit.</th><th class="r">Valor</th><th class="r">Precio venta</th><th>Estado</th><th class="no-print"></th></tr></thead><tbody>
    ${list.map(({p,k,e}) => { const mg = p.precio > 0 && k.cpu > 0 ? (p.precio - k.cpu)/p.precio*100 : null;
      return `<tr><td><b>${esc(p.n)}</b><div class="small muted">${esc([p.cod, p.cat].filter(Boolean).join(', '))}</div></td>
      <td class="r"><b>${fmt(k.q)}</b> <span class="small muted">${esc(p.und||'')}</span></td><td class="r">${p.min?fmt(p.min):'<span class="muted">-</span>'}</td>
      <td class="r">${money(k.cpu,c)}</td><td class="r">${money(k.v,c)}</td>
      <td class="r">${p.precio?money(p.precio,c)+(mg!==null?`<div class="small ${mg<0?'neg':'muted'}">Margen ${pct(mg)}</div>`:''):'<span class="muted">-</span>'}</td>
      <td>${e==='agotado'?'<span class="pill bad">Agotado</span>':e==='bajo'?'<span class="pill mid">Reordenar</span>':'<span class="pill ok">Disponible</span>'}</td>
      <td class="r no-print" style="white-space:nowrap"><button class="btn ghost sm" data-in="${p.id}">Entrada</button><button class="btn ghost sm" data-out="${p.id}">Salida</button><button class="btn ghost sm icon" data-k="${p.id}" aria-label="Ver kardex">${I.csv}</button><button class="btn ghost sm icon" data-ed="${p.id}" aria-label="Editar">${I.edit}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('#inventario [data-in]').forEach(b => b.onclick = () => irMov('in', b.dataset.in));
  $$('#inventario [data-out]').forEach(b => b.onclick = () => irMov('out', b.dataset.out));
  $$('#inventario [data-k]').forEach(b => b.onclick = () => { $('#k-prod').value = b.dataset.k; selTab('kardex'); });
  $$('#inventario [data-ed]').forEach(b => b.onclick = () => editar(prod(b.dataset.ed)));
}
function editar(p){
  const nuevo = !p; p = p || {id:uid(), cod:'', n:'', und:'Unidad', cat:'', min:0, precio:0};
  let tmp = {min:p.min, precio:p.precio, ini:0, cuIni:0};
  const cats = [...new Set(P.map(x => x.cat).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join('');
  dialog({title: nuevo?'Nuevo producto':'Editar producto', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Nombre</span><input class="input" id="p-n" value="${esc(p.n)}"></label>
    <label class="field"><span>Código</span><input class="input" id="p-cod" value="${esc(p.cod)}"></label>
    <label class="field"><span>Categoría</span><input class="input" id="p-cat" value="${esc(p.cat)}" list="dl-c"><datalist id="dl-c">${cats}</datalist></label>
    <label class="field"><span>Unidad de medida</span><input class="input" id="p-und" value="${esc(p.und)}" list="dl-u"><datalist id="dl-u"><option value="Unidad"><option value="Kg"><option value="Litro"><option value="Metro"><option value="Caja"><option value="Paquete"></datalist></label>
    <label class="field"><span>Existencia mínima</span><input class="input num" id="p-min" inputmode="decimal"></label>
    <label class="field"><span>Precio de venta</span><input class="input num" id="p-precio" inputmode="decimal"></label>
    ${nuevo?`<label class="field"><span>Existencia inicial</span><input class="input num" id="p-ini" inputmode="decimal" placeholder="Opcional"></label>
    <label class="field"><span>Costo unitario inicial</span><input class="input num" id="p-cu" inputmode="decimal"></label>`:''}
  </div>`, actions:[
    ...(nuevo?[]:[{label:'Eliminar', cls:'ghost danger', onClick:async ()=>{ const n = M.filter(m => m.pid === p.id).length;
      if (!(await confirmar(`¿Eliminar «${p.n}»${n?` y sus ${n} movimientos`:''}? No se puede deshacer.`))) return false;
      P = P.filter(x => x.id !== p.id); M = M.filter(m => m.pid !== p.id); saveP(); saveM(); renderAll(); toast('Producto eliminado'); }}]),
    {label:'Cancelar', cls:'ghost'},
    {label: nuevo?'Crear producto':'Guardar cambios', cls:'primary', onClick:(d)=>{
      const n = $('#p-n',d).value.trim(); if (!n){ toast('Escribe el nombre.', true); return false; }
      const cod = $('#p-cod',d).value.trim(); if (cod && P.some(x => x.cod === cod && x.id !== p.id)){ toast('Ya existe un producto con el código '+cod+'.', true); return false; }
      Object.assign(p, {n, cod, cat:$('#p-cat',d).value.trim(), und:$('#p-und',d).value.trim(), min:tmp.min, precio:tmp.precio});
      if (nuevo){ P.push(p); if (tmp.ini > 0) M.push({id:uid(), seq:nextSeq(), fecha:today(), pid:p.id, tipo:'in', cant:tmp.ini, cu:tmp.cuIni, pv:0, ref:'Inventario inicial'}); saveM(); }
      saveP(); renderAll(); toast(nuevo?'Producto creado':'Cambios guardados'); }}],
    onOpen: d => { bindNum($('#p-min',d), p.min, v => tmp.min = v); bindNum($('#p-precio',d), p.precio, v => tmp.precio = v);
      if (nuevo){ $('#p-ini',d).dataset.blank0=''; bindNum($('#p-ini',d), 0, v => tmp.ini = v); bindNum($('#p-cu',d), 0, v => tmp.cuIni = v); } $('#p-n',d).focus(); }});
}
$('#btn-nuevo').onclick = () => editar();
$('#btn-csv').onclick = () => { const c = cur();
  csv('inventario-'+today(), [['Código','Producto','Categoría','Unidad','Existencias','Mínimo','Costo unitario','Valor','Precio de venta','Estado'],
    ...P.map(p => { const k = kardex(p.id), e = estado(p,k); return [p.cod, p.n, p.cat, p.und, fmt(k.q), fmt(p.min), fmt(k.cpu), fmt(k.v), fmt(p.precio), e==='ok'?'Disponible':e==='bajo'?'Reordenar':'Agotado']; })]); };

/* ---------- Movimientos ---------- */
let mt = 'in', mCant = 0, mCu = 0, mPv = 0, movMes = monthKey();
$('#m-fecha').value = today(); $('#mov-mes').value = movMes;
$('#mov-mes').onchange = e => { movMes = e.target.value || monthKey(); renderMovs(); };
$('#m-pv').dataset.blank0 = '';
bindNum($('#m-cant'), '', v => { mCant = v; hint(); });
bindNum($('#m-cu'), '', v => mCu = v);
bindNum($('#m-pv'), '', v => mPv = v);
$$('#m-tipo button').forEach(b => b.onclick = () => { mt = b.dataset.v; renderForm(); });
$('#m-prod').onchange = () => { const p = prod($('#m-prod').value); if (p && mt === 'out' && p.precio){ mPv = p.precio; $('#m-pv').value = fmt(p.precio); }
  if (p && mt === 'in'){ const k = kardex(p.id); if (k.cpu){ mCu = k.cpu; $('#m-cu').value = fmt(Math.round(k.cpu*100)/100); } } hint(); };
function irMov(t, pid){ mt = t; selTab('mov'); renderForm(); $('#m-prod').value = pid; $('#m-prod').onchange(); $('#m-cant').focus(); }
function renderForm(){
  $$('#m-tipo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === mt));
  const sel = $('#m-prod').value;
  $('#m-prod').innerHTML = P.length ? [...P].sort((a,b)=>a.n.localeCompare(b.n)).map(p => `<option value="${p.id}">${esc(p.n)}${p.cod?' ('+esc(p.cod)+')':''}</option>`).join('') : '<option value="">Crea un producto primero</option>';
  if (sel && prod(sel)) $('#m-prod').value = sel;
  $('#w-cu').hidden = mt !== 'in'; $('#w-pv').hidden = mt !== 'out';
  $('#l-cant').textContent = mt === 'aj' ? 'Cantidad (+ suma, - resta)' : 'Cantidad';
  $('#m-btn').textContent = mt === 'in' ? 'Registrar entrada' : mt === 'out' ? 'Registrar salida' : 'Registrar ajuste';
  hint();
}
function hint(){ const p = prod($('#m-prod').value); if (!p){ $('#m-hint').textContent = ''; return; } const k = kardex(p.id);
  $('#m-hint').textContent = `Existencia actual: ${fmt(k.q)} ${p.und||''}. Costo unitario: ${money(k.cpu, cur())}.` + (mt==='out' && mCant > k.q ? ' La salida supera la existencia.' : ''); }
$('#f-mov').onsubmit = async e => {
  e.preventDefault(); const p = prod($('#m-prod').value);
  if (!p){ toast('Crea un producto primero.', true); return; }
  if (!mCant || (mt !== 'aj' && mCant < 0)){ toast('Escribe la cantidad.', true); $('#m-cant').focus(); return; }
  if (mt === 'in' && !(mCu > 0)){ toast('Escribe el costo unitario de la entrada.', true); $('#m-cu').focus(); return; }
  const k = kardex(p.id);
  if (mt === 'out' && mCant > k.q && !(await confirmar(`Solo hay ${fmt(k.q)} unidades de «${p.n}». ¿Registrar la salida de todas formas? El inventario quedará en negativo.`, 'Registrar igual', false))) return;
  M.push({id:uid(), seq:nextSeq(), fecha:$('#m-fecha').value || today(), pid:p.id, tipo:mt, cant:mCant, cu:mt==='in'?mCu:0, pv:mt==='out'?mPv:0, ref:$('#m-ref').value.trim()});
  saveM(); toast(mt==='in'?'Entrada registrada':mt==='out'?'Salida registrada':'Ajuste registrado');
  mCant = 0; $('#m-cant').value = ''; $('#m-ref').value = ''; renderMovs(); hint(); renderInv();
  const k2 = kardex(p.id); if (p.min > 0 && k2.q <= p.min && mt !== 'in') toast(`«${p.n}» quedó en ${fmt(k2.q)}: es hora de reordenar.`);
};
function renderMovs(){
  const c = cur(); const ms = M.filter(m => m.fecha.slice(0,7) === movMes).sort((a,b) => b.fecha.localeCompare(a.fecha) || b.seq - a.seq);
  $('#mov-cap').textContent = mesNombre(movMes) + ', ' + ms.length + ' movimientos';
  if (!ms.length){ $('#movs').innerHTML = `<div class="empty"><strong>Sin movimientos este mes</strong>Registra una compra, venta o ajuste.</div>`; return; }
  $('#movs').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Fecha</th><th>Producto</th><th class="r">Cant.</th><th class="r">Valor</th><th></th></tr></thead><tbody>
    ${ms.map(m => { const p = prod(m.pid) || {n:'(eliminado)'}; const lab = m.tipo==='in'?'Entrada':m.tipo==='out'?'Salida':'Ajuste';
      const val = m.tipo==='in' ? m.cant*m.cu : m.tipo==='out' && m.pv ? m.cant*m.pv : 0;
      return `<tr><td>${fechaCorta(m.fecha)}</td><td><b>${esc(p.n)}</b><div class="small muted">${lab}${m.ref?', '+esc(m.ref):''}</div></td>
      <td class="r"><b class="${m.tipo==='in'||(m.tipo==='aj'&&m.cant>0)?'pos':'neg'}">${m.tipo==='in'||(m.tipo==='aj'&&m.cant>0)?'+':'-'}${fmt(Math.abs(m.cant))}</b></td>
      <td class="r">${val?money(val,c):''}${m.tipo==='out'&&m.pv?'<div class="small muted">venta</div>':m.tipo==='in'?'<div class="small muted">costo</div>':''}</td>
      <td class="r"><button class="btn ghost sm icon" data-del="${m.id}" aria-label="Eliminar movimiento">${I.trash}</button></td></tr>`; }).join('')}
  </tbody></table></div>`;
  $$('#movs [data-del]').forEach(b => b.onclick = async () => { if (!(await confirmar('¿Eliminar este movimiento? El kardex se recalcula.'))) return; M = M.filter(m => m.id !== b.dataset.del); saveM(); renderMovs(); renderInv(); hint(); });
}

/* ---------- Kardex ---------- */
$('#k-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#k-print').innerHTML = I.print + 'Imprimir kardex';
['#k-prod','#k-desde','#k-hasta'].forEach(s => $(s).addEventListener('change', renderKardex));
$('#k-print').onclick = () => window.print();
function kRows(){ const pid = $('#k-prod').value; if (!pid) return null; const K = kardex(pid); const d = $('#k-desde').value, h = $('#k-hasta').value;
  return {K, rows: K.rows.filter(r => (!d || r.m.fecha >= d) && (!h || r.m.fecha <= h))}; }
function renderKardex(){
  const sel = $('#k-prod').value;
  $('#k-prod').innerHTML = [...P].sort((a,b)=>a.n.localeCompare(b.n)).map(p => `<option value="${p.id}">${esc(p.n)}${p.cod?' ('+esc(p.cod)+')':''}</option>`).join('');
  if (sel && prod(sel)) $('#k-prod').value = sel;
  const R = kRows(); const c = cur();
  if (!R){ $('#k-head').innerHTML = ''; $('#k-tabla').innerHTML = `<div class="empty"><strong>Sin productos</strong>Crea productos en «Inventario».</div>`; return; }
  const p = prod($('#k-prod').value);
  const ventas = R.rows.filter(r => r.m.tipo === 'out' && r.m.pv > 0);
  const ingreso = ventas.reduce((a,r) => a + r.m.pv * r.sal.q, 0), costoV = ventas.reduce((a,r) => a + r.sal.t, 0);
  $('#k-head').innerHTML = `<h2 style="margin-bottom:4px">Kardex de ${esc(p.n)}</h2><p class="muted small">${esc([p.cod, p.und, p.cat].filter(Boolean).join(', '))}. Método: ${CFG.metodo==='peps'?'PEPS':'promedio ponderado'}. Moneda: ${c}.</p>
    <div class="kpis" style="margin-top:12px"><div class="kpi"><span>Existencia</span><strong>${fmt(R.K.q)}</strong></div><div class="kpi"><span>Costo unitario</span><strong>${money(R.K.cpu,c)}</strong></div><div class="kpi accent"><span>Valor en inventario</span><strong>${money(R.K.v,c)}</strong></div>
    <div class="kpi"><span>Utilidad bruta en ventas</span><strong class="${ingreso-costoV<0?'neg':''}">${money(ingreso-costoV,c)}</strong><small>${ingreso?pct((ingreso-costoV)/ingreso*100)+' sobre '+money(ingreso,c):'Registra precios de venta en las salidas'}</small></div></div>`;
  if (!R.rows.length){ $('#k-tabla').innerHTML = `<div class="empty"><strong>Sin movimientos en el periodo</strong>Cambia las fechas o registra movimientos.</div>`; return; }
  const cell = x => x ? `<td class="r">${fmt(x.q)}</td><td class="r">${money(x.cu,c)}</td><td class="r">${money(x.t,c)}</td>` : '<td></td><td></td><td></td>';
  $('#k-tabla').innerHTML = `<div class="table-wrap"><table class="t" style="font-size:.85rem"><thead>
    <tr><th rowspan="2">Fecha</th><th rowspan="2">Detalle</th><th colspan="3" class="c" style="border-left:1px solid var(--line)">Entradas</th><th colspan="3" class="c" style="border-left:1px solid var(--line)">Salidas</th><th colspan="3" class="c" style="border-left:1px solid var(--line)">Saldo</th></tr>
    <tr>${'<th class="r" style="border-left:1px solid var(--line)">Cant.</th><th class="r">C. unit.</th><th class="r">Total</th>'.repeat(3)}</tr></thead><tbody>
    ${R.rows.map(r => `<tr><td>${fechaCorta(r.m.fecha)}</td><td>${r.m.tipo==='in'?'Entrada':r.m.tipo==='out'?'Salida':'Ajuste'}${r.m.ref?`<div class="small muted">${esc(r.m.ref)}</div>`:''}</td>${cell(r.ent)}${cell(r.sal)}<td class="r"><b class="${r.saldo.q<0?'neg':''}">${fmt(r.saldo.q)}</b></td><td class="r">${money(r.saldo.cu,c)}</td><td class="r"><b>${money(r.saldo.t,c)}</b></td></tr>`).join('')}
  </tbody></table></div>`;
}
$('#k-csv').onclick = () => { const R = kRows(); if (!R) return; const p = prod($('#k-prod').value);
  csv('kardex-'+(p.cod||p.n)+'-'+today(), [['Fecha','Detalle','Referencia','Entrada cant.','Entrada c. unit.','Entrada total','Salida cant.','Salida c. unit.','Salida total','Saldo cant.','Saldo c. unit.','Saldo total'],
    ...R.rows.map(r => [r.m.fecha, r.m.tipo==='in'?'Entrada':r.m.tipo==='out'?'Salida':'Ajuste', r.m.ref||'', ...(r.ent?[fmt(r.ent.q),fmt(r.ent.cu),fmt(r.ent.t)]:['','','']), ...(r.sal?[fmt(r.sal.q),fmt(r.sal.cu),fmt(r.sal.t)]:['','','']), fmt(r.saldo.q), fmt(r.saldo.cu), fmt(r.saldo.t)])]); };

/* ---------- Método ---------- */
$$('input[name=metodo]').forEach(r => { r.checked = r.value === CFG.metodo; r.onchange = () => { CFG.metodo = r.value; saveCfg(); renderAll(); toast('Método cambiado a '+(r.value==='peps'?'PEPS':'promedio ponderado')+'. Kardex recalculado.'); }; });

function renderAll(){ renderInv(); renderForm(); renderMovs(); renderKardex(); }
const selTab = tabs(id => { if (id === 'inv') renderInv(); if (id === 'mov'){ renderForm(); renderMovs(); } if (id === 'kardex') renderKardex(); });
renderAll();
document.addEventListener('ma:negocio', renderAll);
})();

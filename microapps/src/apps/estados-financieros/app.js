(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, tabs, I, csv, negocio, imprimirDoc} = MA;

const cur = () => negocio().moneda || 'COP';
const R = (n, a, b) => ({id:uid(), n, a, b});
const DEF = {
  pa:'2026', pb:'2025', tasa:35, autoUtil:true,
  er:{
    ing:[R('Ventas de mercancía', 186000000, 158000000), R('Servicios', 24000000, 19500000)],
    dev:[R('Devoluciones y descuentos', 3200000, 2900000)],
    cv:[R('Costo de la mercancía vendida', 112000000, 97000000)],
    gadm:[R('Sueldos y prestaciones', 31000000, 27500000), R('Arriendo', 14400000, 13200000), R('Servicios públicos', 4800000, 4300000), R('Depreciaciones', 3600000, 3600000)],
    gven:[R('Publicidad', 6200000, 4100000), R('Comisiones', 5900000, 5000000), R('Fletes y domicilios', 3100000, 2600000)],
    oing:[R('Intereses ganados', 450000, 300000)],
    gfin:[R('Intereses de créditos', 3900000, 4400000), R('Gastos bancarios', 1100000, 950000)]
  },
  bg:{
    ac:[R('Caja y bancos', 9800000, 7200000), R('Cuentas por cobrar', 14500000, 12800000), R('Inventarios', 27300000, 24100000)],
    anc:[R('Muebles y equipos', 18000000, 18000000), R('Vehículo', 42000000, 42000000), R('Depreciación acumulada', -15600000, -12000000)],
    pc:[R('Proveedores', 12900000, 11600000), R('Obligaciones laborales', 4100000, 3700000), R('Impuestos por pagar', 3800000, 2600000)],
    pnc:[R('Crédito bancario', 24000000, 32000000)],
    pat:[R('Capital', 30000000, 30000000), R('Utilidades acumuladas', 7387500, 4237500)]
  }
};
let S = store.get('estado', null) || JSON.parse(JSON.stringify(DEF));
const save = () => store.set('estado', S);
const sum = (rows, k) => rows.reduce((a,r) => a + (+r[k]||0), 0);

function er(k){ // k = 'a' | 'b'
  const E = S.er, ing = sum(E.ing,k) - sum(E.dev,k), cv = sum(E.cv,k), ub = ing - cv;
  const ga = sum(E.gadm,k), gv = sum(E.gven,k), uo = ub - ga - gv, oi = sum(E.oing,k), gf = sum(E.gfin,k), uai = uo + oi - gf;
  const imp = uai > 0 ? uai * (+S.tasa||0) / 100 : 0;
  return {bruto:sum(E.ing,k), ing, cv, ub, ga, gv, uo, oi, gf, uai, imp, un: uai - imp};
}
function bg(k){
  const B = S.bg, ac = sum(B.ac,k), anc = sum(B.anc,k), pc = sum(B.pc,k), pnc = sum(B.pnc,k);
  const util = S.autoUtil ? er(k).un : 0, pat = sum(B.pat,k) + util;
  const inv = B.ac.filter(r => /inventario/i.test(r.n)).reduce((a,r) => a + (+r[k]||0), 0);
  return {ac, anc, at:ac+anc, pc, pnc, pt:pc+pnc, util, pat, pyp:pc+pnc+pat, inv};
}

/* ---------- Encabezado ---------- */
$('#pa').value = S.pa; $('#pb').value = S.pb;
$('#pa').oninput = e => { S.pa = e.target.value; save(); renderAll(); };
$('#pb').oninput = e => { S.pb = e.target.value; save(); renderAll(); };
bindNum($('#tasa'), S.tasa, v => { S.tasa = v; save(); recalc(); });

/* ---------- Tablas editables ---------- */
function rowsHTML(grp, key){ return S[grp][key].map(r => `<tr data-g="${grp}" data-k="${key}" data-id="${r.id}"><td><input class="input" data-f="n" value="${esc(r.n)}" aria-label="Cuenta"></td>
  <td><input class="input num" data-f="a" inputmode="decimal" aria-label="${esc(S.pa)}"></td><td><input class="input num" data-f="b" inputmode="decimal" aria-label="${esc(S.pb)}"></td>
  <td class="r muted-c" data-v></td><td class="no-print"><button class="btn ghost sm icon" data-del aria-label="Quitar cuenta">${I.trash}</button></td></tr>`).join('')
  + `<tr class="add no-print"><td colspan="5"><button class="btn ghost sm" data-add="${grp}:${key}" type="button">${I.plus}Agregar cuenta</button></td></tr>`; }
const sec = t => `<tr class="sec"><td colspan="5">${t}</td></tr>`;
const sub = (t, id, cls='sub') => `<tr class="${cls}" data-sub="${id}"><td>${t}</td><td class="r" data-a></td><td class="r" data-b></td><td class="r" data-v></td><td class="no-print"></td></tr>`;
const head = (extra) => `<thead><tr><th>Cuenta</th><th class="r">${esc(S.pa||'Actual')}</th><th class="r">${esc(S.pb||'Anterior')}</th><th class="r">${extra}</th><th class="no-print"></th></tr></thead>`;

function renderER(){
  $('#er').innerHTML = head('% ventas') + `<tbody>${sec('Ingresos operacionales')}${rowsHTML('er','ing')}${sec('Menos: devoluciones y descuentos')}${rowsHTML('er','dev')}${sub('Ventas netas','ing')}
    ${sec('Costo de ventas')}${rowsHTML('er','cv')}${sub('Utilidad bruta','ub')}
    ${sec('Gastos de administración')}${rowsHTML('er','gadm')}${sec('Gastos de ventas')}${rowsHTML('er','gven')}${sub('Utilidad operacional','uo')}
    ${sec('Otros ingresos')}${rowsHTML('er','oing')}${sec('Gastos financieros y otros')}${rowsHTML('er','gfin')}${sub('Utilidad antes de impuestos','uai')}
    ${sub('Impuesto de renta','imp','')}${sub('Utilidad neta','un','big')}</tbody>`;
  bindRows('#er');
}
function renderBG(){
  $('#bg').innerHTML = head('% del total') + `<tbody>${sec('Activo corriente')}${rowsHTML('bg','ac')}${sub('Total activo corriente','ac')}
    ${sec('Activo no corriente')}${rowsHTML('bg','anc')}${sub('Total activo no corriente','anc')}${sub('Total activos','at','big')}
    ${sec('Pasivo corriente')}${rowsHTML('bg','pc')}${sub('Total pasivo corriente','pc')}${sec('Pasivo no corriente')}${rowsHTML('bg','pnc')}${sub('Total pasivo no corriente','pnc')}${sub('Total pasivos','pt','big')}
    ${sec('Patrimonio')}${rowsHTML('bg','pat')}${S.autoUtil?sub('Utilidad del ejercicio','util',''):''}${sub('Total patrimonio','pat')}${sub('Total pasivo más patrimonio','pyp','big')}</tbody>`;
  bindRows('#bg');
}
function bindRows(sel){
  $$(sel+' tr[data-id]').forEach(tr => { const rows = S[tr.dataset.g][tr.dataset.k]; const r = rows.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-f=n]').oninput = e => { r.n = e.target.value; save(); if (tr.dataset.g === 'bg') recalc(); };
    bindNum(tr.querySelector('[data-f=a]'), r.a, v => { r.a = v; save(); recalc(); }, 0);
    bindNum(tr.querySelector('[data-f=b]'), r.b, v => { r.b = v; save(); recalc(); }, 0);
    tr.querySelector('[data-del]').onclick = () => { rows.splice(rows.indexOf(r), 1); save(); tr.dataset.g === 'er' ? renderER() : renderBG(); recalc(); }; });
  $$(sel+' [data-add]').forEach(b => b.onclick = () => { const [g,k] = b.dataset.add.split(':'); S[g][k].push(R('', 0, 0)); save(); g === 'er' ? renderER() : renderBG(); recalc();
    const ins = $$(`${sel} tr[data-k="${k}"] [data-f=n]`); ins[ins.length-1].focus(); });
}
$('#auto-util').checked = S.autoUtil;
$('#auto-util').onchange = e => { S.autoUtil = e.target.checked; save(); renderBG(); recalc(); };

/* ---------- Recalcular ---------- */
function recalc(){
  const c = cur(), A = er('a'), B = er('b'), GA = bg('a'), GB = bg('b');
  const setSub = (sel, id, va, vb, vcol) => { const tr = $(`${sel} tr[data-sub="${id}"]`); if (!tr) return;
    tr.querySelector('[data-a]').innerHTML = `<span class="${va<0?'neg':''}">${money(va,c)}</span>`; tr.querySelector('[data-b]').innerHTML = `<span class="${vb<0?'neg':''}">${money(vb,c)}</span>`; tr.querySelector('[data-v]').textContent = vcol; };
  const pv = v => A.ing ? pct(v / A.ing * 100) : '';
  ['ing','ub','uo','uai','imp','un'].forEach(k => setSub('#er', k, A[k], B[k], pv(A[k])));
  $$('#er tr[data-id]').forEach(tr => { const r = S.er[tr.dataset.k].find(x => x.id === tr.dataset.id); tr.querySelector('[data-v]').textContent = A.ing && r ? pct((+r.a||0)/A.ing*100) : ''; });
  const pb = v => GA.at ? pct(v / GA.at * 100) : '';
  ['ac','anc','at','pc','pnc','pt','util','pat','pyp'].forEach(k => setSub('#bg', k, GA[k], GB[k], pb(GA[k])));
  $$('#bg tr[data-id]').forEach(tr => { const r = S.bg[tr.dataset.k].find(x => x.id === tr.dataset.id); tr.querySelector('[data-v]').textContent = GA.at && r ? pct((+r.a||0)/GA.at*100) : ''; });
  // tiquetes
  const vari = (a, b) => b ? `${a>=b?'+':''}${pct((a-b)/Math.abs(b)*100)} frente a ${esc(S.pb)}` : '';
  $('#er-ticket').innerHTML = `<div class="ticket-top"><h3>Resultado del periodo</h3><span>${esc(S.pa)}</span></div>
    <div class="ticket-hero"><span>${A.un>=0?'Utilidad neta':'Pérdida neta'}</span><strong class="${A.un<0?'neg':''}" ${A.un<0?'style="color:var(--neg)"':''}>${money(A.un,c)}</strong><small>${vari(A.un, B.un)}</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Ventas netas</span><b>${money(A.ing,c)}</b></div>
      <div class="ticket-line"><span>Margen bruto</span><b>${A.ing?pct(A.ub/A.ing*100):''}</b></div>
      <div class="ticket-line"><span>Margen operacional</span><b class="${A.uo<0?'neg':''}">${A.ing?pct(A.uo/A.ing*100):''}</b></div>
      <div class="ticket-line"><span>Margen neto</span><b class="${A.un<0?'neg':''}">${A.ing?pct(A.un/A.ing*100):''}</b></div>
      <div class="ticket-line total"><span>Crecimiento en ventas</span><b class="${A.ing<B.ing?'neg':'pos'}">${B.ing?pct((A.ing-B.ing)/B.ing*100):''}</b></div></div>`;
  const dif = GA.at - GA.pyp, cuadra = Math.abs(dif) < 1;
  $('#bg-ticket').innerHTML = `<div class="ticket-top"><h3>Ecuación contable</h3><span>${esc(S.pa)}</span></div>
    <div class="ticket-hero"><span>Total activos</span><strong>${money(GA.at,c)}</strong><small>${cuadra?'El balance cuadra: activo igual a pasivo más patrimonio.':'Diferencia de '+money(dif,c)+'. Revisa las cuentas o la utilidad del ejercicio.'}</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Pasivos</span><b>${money(GA.pt,c)}</b></div><div class="ticket-line"><span>Patrimonio</span><b>${money(GA.pat,c)}</b></div>
      <div class="ticket-line total"><span>Estado</span><b class="${cuadra?'pos':'neg'}">${cuadra?'Cuadra':'No cuadra'}</b></div>
      <div class="ticket-line"><span>Capital de trabajo</span><b class="${GA.ac-GA.pc<0?'neg':''}">${money(GA.ac-GA.pc,c)}</b></div></div>`;
  renderInd();
}

/* ---------- Indicadores ---------- */
function indicadores(k){
  const E = er(k), B = bg(k), d = (a, b) => b ? a / b : null;
  return [
    {g:'Liquidez', n:'Razón corriente', v:d(B.ac,B.pc), f:x => fmt(x,2)+' veces', s:x => x>=1.5?'ok':x>=1?'mid':'bad', t:'Por cada peso que debes a corto plazo, cuántos tienes en activos corrientes. Sano: 1,5 o más.'},
    {g:'Liquidez', n:'Prueba ácida', v:d(B.ac-B.inv,B.pc), f:x => fmt(x,2)+' veces', s:x => x>=1?'ok':x>=.7?'mid':'bad', t:'Lo mismo, sin contar inventarios. Mide si pagas sin depender de vender mercancía.'},
    {g:'Liquidez', n:'Capital de trabajo', v:B.ac-B.pc, f:x => money(x,cur()), s:x => x>0?'ok':'bad', t:'Dinero que queda para operar después de cubrir las deudas de corto plazo.'},
    {g:'Endeudamiento', n:'Nivel de endeudamiento', v:d(B.pt,B.at), f:x => pct(x*100), s:x => x<=.6?'ok':x<=.7?'mid':'bad', t:'Qué parte de los activos está financiada con deuda. Suele preferirse por debajo de 60%.'},
    {g:'Endeudamiento', n:'Apalancamiento', v:d(B.pt,B.pat), f:x => fmt(x,2)+' veces', s:x => x<=1.5?'ok':x<=2.5?'mid':'bad', t:'Cuánto deben los acreedores por cada peso de los dueños.'},
    {g:'Endeudamiento', n:'Concentración en el corto plazo', v:d(B.pc,B.pt), f:x => pct(x*100), s:x => x<=.6?'ok':x<=.8?'mid':'bad', t:'Qué parte de la deuda vence en menos de un año.'},
    {g:'Rentabilidad', n:'Margen bruto', v:d(E.ub,E.ing), f:x => pct(x*100), s:x => x>=.3?'ok':x>=.15?'mid':'bad', t:'Lo que queda de cada venta después del costo de la mercancía o servicio.'},
    {g:'Rentabilidad', n:'Margen operacional', v:d(E.uo,E.ing), f:x => pct(x*100), s:x => x>=.1?'ok':x>=0?'mid':'bad', t:'Lo que deja la operación después de gastos de administración y ventas.'},
    {g:'Rentabilidad', n:'Margen neto', v:d(E.un,E.ing), f:x => pct(x*100), s:x => x>=.05?'ok':x>=0?'mid':'bad', t:'Lo que queda para los dueños de cada peso vendido.'},
    {g:'Rentabilidad', n:'Rentabilidad del activo (ROA)', v:d(E.un,B.at), f:x => pct(x*100), s:x => x>=.05?'ok':x>=0?'mid':'bad', t:'Utilidad neta frente a todo lo que tiene el negocio.'},
    {g:'Rentabilidad', n:'Rentabilidad del patrimonio (ROE)', v:d(E.un,B.pat), f:x => pct(x*100), s:x => x>=.12?'ok':x>=0?'mid':'bad', t:'Lo que gana cada peso invertido por los dueños.'},
    {g:'Actividad', n:'Rotación de inventario', v:B.inv ? 365 / (E.cv / B.inv) : null, f:x => fmt(Math.round(x),0)+' días', s:x => x<=60?'ok':x<=120?'mid':'bad', t:'Días promedio que la mercancía se queda en bodega antes de venderse.'}
  ];
}
function renderInd(){
  const A = indicadores('a'), Bv = indicadores('b');
  const grupos = [...new Set(A.map(x => x.g))];
  $('#ind').innerHTML = grupos.map(g => `<h3 style="margin:6px 0 10px">${g}</h3><div class="ind-grid" style="margin-bottom:16px">${A.map((x,i) => x.g !== g ? '' : `<div class="ind ${x.v===null?'':x.s(x.v)}"><h4>${x.n}</h4><strong>${x.v===null?'Sin datos':x.f(x.v)}</strong>
    <div class="ant">${esc(S.pb)}: ${Bv[i].v===null?'sin datos':Bv[i].f(Bv[i].v)}</div><p>${x.t}</p></div>`).join('')}</div>`).join('');
}

/* ---------- Impresión y exportación ---------- */
const filaP = (n, a, b, cls='') => `<tr class="${cls}"><td>${esc(n)}</td><td class="r ${a<0?'neg':''}">${money(a,cur())}</td><td class="r ${b<0?'neg':''}">${money(b,cur())}</td></tr>`;
const cuentas = (g,k) => S[g][k].map(r => filaP('   '+r.n, +r.a||0, +r.b||0)).join('');
const thP = `<thead><tr><th>Cuenta</th><th class="r">${esc(S.pa)}</th><th class="r">${esc(S.pb)}</th></tr></thead>`;
$('#er-print').innerHTML = I.print + 'Imprimir estado de resultados'; $('#bg-print').innerHTML = I.print + 'Imprimir balance'; $('#ind-print').innerHTML = I.print + 'Imprimir indicadores';
$('#er-csv').innerHTML = I.csv + 'CSV';
$('#er-print').onclick = () => { const A = er('a'), B = er('b');
  imprimirDoc('Estado de resultados', `<table>${thP}<tbody>${cuentas('er','ing')}${cuentas('er','dev').replace(/<td class="r /g,'<td class="r ')}${filaP('Ventas netas',A.ing,B.ing,'tot')}${cuentas('er','cv')}${filaP('Utilidad bruta',A.ub,B.ub,'tot')}
    ${cuentas('er','gadm')}${cuentas('er','gven')}${filaP('Utilidad operacional',A.uo,B.uo,'tot')}${cuentas('er','oing')}${cuentas('er','gfin')}${filaP('Utilidad antes de impuestos',A.uai,B.uai,'tot')}
    ${filaP('Impuesto de renta ('+fmt(S.tasa)+'%)',A.imp,B.imp)}${filaP('Utilidad neta',A.un,B.un,'tot')}</tbody></table>`, 'Periodos '+S.pa+' y '+S.pb); };
$('#bg-print').onclick = () => { const A = bg('a'), B = bg('b');
  imprimirDoc('Balance general', `<table>${thP}<tbody>${cuentas('bg','ac')}${filaP('Total activo corriente',A.ac,B.ac,'tot')}${cuentas('bg','anc')}${filaP('Total activo no corriente',A.anc,B.anc,'tot')}${filaP('TOTAL ACTIVOS',A.at,B.at,'tot')}
    ${cuentas('bg','pc')}${filaP('Total pasivo corriente',A.pc,B.pc,'tot')}${cuentas('bg','pnc')}${filaP('Total pasivo no corriente',A.pnc,B.pnc,'tot')}${filaP('TOTAL PASIVOS',A.pt,B.pt,'tot')}
    ${cuentas('bg','pat')}${S.autoUtil?filaP('   Utilidad del ejercicio',A.util,B.util):''}${filaP('TOTAL PATRIMONIO',A.pat,B.pat,'tot')}${filaP('TOTAL PASIVO MÁS PATRIMONIO',A.pyp,B.pyp,'tot')}</tbody></table>
    <div class="sig"><div>Representante legal</div><div>Contador</div></div>`, 'Periodos '+S.pa+' y '+S.pb); };
$('#ind-print').onclick = () => { const A = indicadores('a'), B = indicadores('b');
  imprimirDoc('Indicadores financieros', `<table><thead><tr><th>Grupo</th><th>Indicador</th><th class="r">${esc(S.pa)}</th><th class="r">${esc(S.pb)}</th><th>Qué mide</th></tr></thead><tbody>
    ${A.map((x,i) => `<tr><td>${x.g}</td><td><b>${x.n}</b></td><td class="r">${x.v===null?'-':x.f(x.v)}</td><td class="r">${B[i].v===null?'-':B[i].f(B[i].v)}</td><td><small>${x.t}</small></td></tr>`).join('')}</tbody></table>`, 'Periodos '+S.pa+' y '+S.pb); };
$('#er-csv').onclick = () => { const rows = [['Grupo','Cuenta',S.pa,S.pb]];
  [['er','ing','Ingresos'],['er','dev','Devoluciones'],['er','cv','Costo de ventas'],['er','gadm','Gastos de administración'],['er','gven','Gastos de ventas'],['er','oing','Otros ingresos'],['er','gfin','Gastos financieros'],
   ['bg','ac','Activo corriente'],['bg','anc','Activo no corriente'],['bg','pc','Pasivo corriente'],['bg','pnc','Pasivo no corriente'],['bg','pat','Patrimonio']].forEach(([g,k,n]) => S[g][k].forEach(r => rows.push([n, r.n, fmt(r.a), fmt(r.b)])));
  csv('estados-financieros-'+S.pa, rows); };

function renderAll(){ renderER(); renderBG(); recalc(); }
tabs(id => { if (id === 'ind') renderInd(); });
renderAll();
document.addEventListener('ma:negocio', recalc);
})();

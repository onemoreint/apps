(function(){
const {$, $$, esc, uid, num, money, moneyK, fmt, pct, bindNum, store, toast, tabs, I, negocio, imprimirDoc} = MA;

const cur = () => negocio().moneda || 'COP';
const TIPOS = {af:'Activo fijo', ct:'Capital de trabajo', pre:'Gasto de apertura'};
const DEF = {
  nombre:'Cafetería de especialidad', desc:'Café de origen, panadería y bebidas frías para oficinistas y estudiantes del sector.',
  inv:[{id:uid(), n:'Máquina de espresso y molino', t:'af', v:18000000},{id:uid(), n:'Mobiliario y adecuaciones', t:'af', v:14000000},
       {id:uid(), n:'Neveras, horno y menaje', t:'af', v:9500000},{id:uid(), n:'Permisos, marca y registro', t:'pre', v:2500000},
       {id:uid(), n:'Publicidad de lanzamiento', t:'pre', v:3000000},{id:uid(), n:'Inventario inicial y caja (capital de trabajo)', t:'ct', v:8000000}],
  cr:{monto:25000000, tasa:24, plazo:4},
  s:{ventas:216000000, gv:8, cv:38, gf:98000000, inf:5, vida:5, tax:35, tio:20}
};
let S = store.get('estado', null) || JSON.parse(JSON.stringify(DEF));
S.cr = Object.assign({}, DEF.cr, S.cr); S.s = Object.assign({}, DEF.s, S.s);
const save = () => store.set('estado', S);
const N = 5;

/* ---------- Motor ---------- */
function credito(){
  const P = +S.cr.monto||0, i = (+S.cr.tasa||0)/100, n = Math.max(0, Math.round(+S.cr.plazo||0));
  const rows = []; if (!P || !n) return {rows, cuota:0};
  const cuota = i ? P * i / (1 - Math.pow(1+i, -n)) : P / n; let saldo = P;
  for (let t=1; t<=N; t++){ if (t > n || saldo <= 0.5){ rows.push({t, ini:0, int:0, cap:0, cuota:0, fin:0}); continue; }
    const int = saldo * i, cap = cuota - int; rows.push({t, ini:saldo, int, cap, cuota, fin:saldo - cap}); saldo -= cap; }
  return {rows, cuota};
}
function modelo(ov = {}){
  const s = Object.assign({}, S.s, ov);
  const inv = S.inv.reduce((a,x) => a + (+x.v||0), 0), af = S.inv.filter(x => x.t === 'af').reduce((a,x) => a + (+x.v||0), 0);
  const ct = S.inv.filter(x => x.t === 'ct').reduce((a,x) => a + (+x.v||0), 0), pre = inv - af - ct;
  const vida = Math.max(1, +s.vida||1), tax = (+s.tax||0)/100, cr = credito();
  const years = [];
  for (let t=1; t<=N; t++){
    const ventas = s.ventas * Math.pow(1 + s.gv/100, t-1), cv = ventas * s.cv/100, gf = s.gf * Math.pow(1 + s.inf/100, t-1);
    const dep = t <= vida ? af / vida : 0, amort = t === 1 ? pre : 0; // gastos de apertura se reconocen en el año 1
    const ebit = ventas - cv - gf - dep - amort, int = cr.rows[t-1] ? cr.rows[t-1].int : 0;
    const ebt = ebit - int, imp = Math.max(0, ebt) * tax, un = ebt - imp;
    const impOp = Math.max(0, ebit) * tax; // impuesto como si no hubiera deuda
    const residual = t === N ? ct + Math.max(0, af - af/vida*Math.min(N, vida)) : 0;
    const fcp = ebit - impOp + dep + amort + residual;                       // flujo del proyecto
    const fci = un + dep + amort - (cr.rows[t-1] ? cr.rows[t-1].cap : 0) + residual; // flujo del inversionista
    years.push({t, ventas, cv, gf, dep, amort, ebit, int, ebt, imp, un, residual, fcp, fci});
  }
  const fp = [-inv, ...years.map(y => y.fcp)], fi = [-(inv - (+S.cr.monto||0)), ...years.map(y => y.fci)];
  const tio = s.tio/100;
  return {inv, af, ct, pre, years, fp, fi, cr, tio, vpn:vpn(fp, tio), tir:tir(fp), vpnI:vpn(fi, tio), tirI:tir(fi),
    pay:payback(fp), payD:payback(fp.map((v,t) => v / Math.pow(1+tio, t))), bc: inv ? fp.slice(1).reduce((a,v,t) => a + v/Math.pow(1+tio,t+1), 0) / inv : 0,
    pe: s.cv < 100 ? s.gf / (1 - s.cv/100) : null};
}
function vpn(f, i){ return f.reduce((a,v,t) => a + v / Math.pow(1+i, t), 0); }
function tir(f){
  if (!(f[0] < 0) || !f.slice(1).some(v => v > 0)) return null;
  let lo = -0.99, hi = 10; const g = r => vpn(f, r);
  if (g(lo) * g(hi) > 0) return null;
  for (let k=0; k<200; k++){ const mid = (lo+hi)/2; if (g(lo) * g(mid) <= 0) hi = mid; else lo = mid; }
  return (lo+hi)/2;
}
function payback(f){ let acc = f[0]; for (let t=1; t<f.length; t++){ const prev = acc; acc += f[t]; if (acc >= 0) return t - 1 + (f[t] ? -prev / f[t] : 0); } return null; }
const anios = x => { if (x === null) return 'No se recupera en 5 años'; let a = Math.floor(x), m = Math.round((x - a) * 12); if (m === 12){ a++; m = 0; } return (a ? a + (a===1?' año':' años') : '') + (m ? (a?' y ':'') + m + (m===1?' mes':' meses') : '') || 'Inmediato'; };

/* ---------- Inversión ---------- */
$('#add-inv').innerHTML = I.plus + 'Agregar concepto';
$('#p-nombre').value = S.nombre; $('#p-desc').value = S.desc;
$('#p-nombre').oninput = e => { S.nombre = e.target.value; save(); };
$('#p-desc').oninput = e => { S.desc = e.target.value; save(); };
function renderInv(){
  $('#inv').innerHTML = S.inv.map(x => `<tr data-id="${x.id}"><td><input class="input" data-k="n" value="${esc(x.n)}" aria-label="Concepto" style="min-width:160px"></td>
    <td><select class="input" data-k="t" aria-label="Tipo">${Object.entries(TIPOS).map(([k,v]) => `<option value="${k}" ${k===x.t?'selected':''}>${v}</option>`).join('')}</select></td>
    <td><input class="input num" data-k="v" inputmode="decimal" aria-label="Valor" style="min-width:110px"></td><td><button class="btn ghost sm icon" data-del aria-label="Quitar">${I.trash}</button></td></tr>`).join('');
  $$('#inv tr').forEach(tr => { const x = S.inv.find(i => i.id === tr.dataset.id);
    tr.querySelector('[data-k=n]').oninput = e => { x.n = e.target.value; save(); };
    tr.querySelector('[data-k=t]').onchange = e => { x.t = e.target.value; save(); update(); };
    bindNum(tr.querySelector('[data-k=v]'), x.v, v => { x.v = v; save(); update(); }, 0);
    tr.querySelector('[data-del]').onclick = () => { S.inv = S.inv.filter(i => i !== x); save(); renderInv(); update(); }; });
}
$('#add-inv').onclick = () => { S.inv.push({id:uid(), n:'', t:'af', v:0}); save(); renderInv(); update(); const ins = $$('#inv tr:last-child input'); ins[0] && ins[0].focus(); };
bindNum($('#cr-monto'), S.cr.monto, v => { S.cr.monto = v; save(); update(); }, 0);
bindNum($('#cr-tasa'), S.cr.tasa, v => { S.cr.tasa = v; save(); update(); });
bindNum($('#cr-plazo'), S.cr.plazo, v => { S.cr.plazo = Math.min(N, Math.max(0, Math.round(v))); save(); update(); }, 0);

/* ---------- Supuestos ---------- */
[['ventas',0],['gv',2],['cv',2],['gf',0],['inf',2],['vida',0],['tax',2],['tio',2]].forEach(([k,d]) => bindNum($('#s-'+k), S.s[k], v => { S.s[k] = v; save(); update(); }, d));

/* ---------- Render ---------- */
function update(){
  const M = modelo(), c = cur();
  $('#inv-total').textContent = money(M.inv, c);
  const propio = M.inv - (+S.cr.monto||0);
  $('#inv-ticket').innerHTML = `<div class="ticket-top"><h3>Inversión inicial</h3><span>Año 0</span></div>
    <div class="ticket-hero"><span>Necesitas</span><strong>${money(M.inv,c)}</strong><small>${propio<0?'El crédito supera la inversión: revisa el monto.':'Aporte propio '+money(propio,c)+(M.inv?' ('+pct(propio/M.inv*100,0)+')':'')}</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Activos fijos</span><b>${money(M.af,c)}</b></div><div class="ticket-line"><span>Capital de trabajo</span><b>${money(M.ct,c)}</b></div>
      <div class="ticket-line"><span>Gastos de apertura</span><b>${money(M.pre,c)}</b></div><div class="ticket-line total"><span>Crédito</span><b>${money(+S.cr.monto||0,c)}</b></div>
      ${M.cr.cuota?`<div class="ticket-line"><span>Cuota anual del crédito</span><b>${money(M.cr.cuota,c)}</b></div>`:''}</div>`;
  $('#cr-tabla').innerHTML = M.cr.cuota ? `<div class="table-wrap"><table class="t"><thead><tr><th>Año</th><th class="r">Saldo inicial</th><th class="r">Intereses</th><th class="r">Abono a capital</th><th class="r">Cuota</th><th class="r">Saldo final</th></tr></thead><tbody>
    ${M.cr.rows.filter(r => r.cuota).map(r => `<tr><td>${r.t}</td><td class="r">${money(r.ini,c)}</td><td class="r">${money(r.int,c)}</td><td class="r">${money(r.cap,c)}</td><td class="r"><b>${money(r.cuota,c)}</b></td><td class="r">${money(Math.max(0,r.fin),c)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Sin crédito: el proyecto se financia con aporte propio.</p>';
  const th = `<thead><tr><th>Concepto</th>${M.years.map(y => `<th class="r">Año ${y.t}</th>`).join('')}</tr></thead>`;
  const fila = (l, k, cls='', neg=false) => `<tr class="${cls}"><td>${l}</td>${M.years.map(y => `<td class="r ${y[k]<0?'neg':''}">${neg&&y[k]?'-':''}${money(y[k],c)}</td>`).join('')}</tr>`;
  $('#t-er').innerHTML = th + `<tbody>${fila('Ventas','ventas')}${fila('Costo variable','cv','',true)}${fila('Gastos fijos','gf','',true)}${fila('Depreciación','dep','',true)}${M.pre?fila('Gastos de apertura','amort','',true):''}
    ${fila('Utilidad operacional','ebit','tot')}${fila('Intereses del crédito','int','',true)}${fila('Utilidad antes de impuestos','ebt','tot')}${fila('Impuesto de renta','imp','',true)}${fila('Utilidad neta','un','big')}</tbody>`;
  $('#t-fc').innerHTML = `<thead><tr><th>Concepto</th><th class="r">Año 0</th>${M.years.map(y => `<th class="r">Año ${y.t}</th>`).join('')}</tr></thead><tbody>
    <tr><td>Inversión</td><td class="r neg">-${money(M.inv,c)}</td>${M.years.map(() => '<td></td>').join('')}</tr>
    <tr><td>Recuperación al final</td><td></td>${M.years.map(y => `<td class="r">${y.residual?money(y.residual,c):''}</td>`).join('')}</tr>
    <tr class="big"><td>Flujo del proyecto</td>${M.fp.map(v => `<td class="r ${v<0?'neg':''}">${money(v,c)}</td>`).join('')}</tr>
    <tr class="tot"><td>Flujo del inversionista (con crédito)</td>${M.fi.map(v => `<td class="r ${v<0?'neg':''}">${money(v,c)}</td>`).join('')}</tr>
    <tr><td>Flujo acumulado del proyecto</td>${M.fp.map((v,t) => { const a = M.fp.slice(0,t+1).reduce((x,y)=>x+y,0); return `<td class="r ${a<0?'neg':'pos'}">${money(a,c)}</td>`; }).join('')}</tr></tbody>`;
  renderEval(M);
}
function veredicto(M){
  if (M.vpn > 0 && M.tir !== null) return {ok:true, t:'El proyecto es viable', d:`Rinde más que tu rentabilidad mínima del ${pct(S.s.tio)}: genera ${money(M.vpn,cur())} adicionales en valor de hoy.`};
  if (M.vpn > -0.05*M.inv) return {ok:null, t:'Viabilidad ajustada', d:'Está muy cerca de tu rentabilidad mínima. Revisa precios, costos o el tamaño de la inversión.'};
  return {ok:false, t:'No alcanza la rentabilidad esperada', d:`Con estos supuestos destruye ${money(-M.vpn,cur())} de valor frente a tu rentabilidad mínima.`};
}
function renderEval(M){
  const c = cur(), V = veredicto(M);
  $('#kpis').innerHTML = `<div class="kpi ${M.vpn>=0?'accent':''}"><span>Valor presente neto (VPN)</span><strong class="${M.vpn<0?'neg':''}">${money(M.vpn,c)}</strong><small>Descontado al ${pct(S.s.tio)}</small></div>
    <div class="kpi"><span>Tasa interna de retorno (TIR)</span><strong class="${M.tir!==null&&M.tir*100<S.s.tio?'neg':''}">${M.tir===null?'No existe':pct(M.tir*100)}</strong><small>Frente a tu TIO del ${pct(S.s.tio)}</small></div>
    <div class="kpi"><span>Recuperas la inversión en</span><strong style="font-size:1.15rem;margin-top:5px">${anios(M.pay)}</strong><small>Descontado: ${anios(M.payD)}</small></div>
    <div class="kpi"><span>Relación beneficio costo</span><strong>${fmt(M.bc,2)}</strong><small>${M.bc>=1?'Por cada peso invertido regresan '+fmt(M.bc,2):'Menor que 1: no se recupera en valor de hoy'}</small></div>`;
  $('#eval-ticket').innerHTML = `<div class="ticket-top"><h3>Veredicto</h3><span>${esc(S.nombre||'Proyecto')}</span></div>
    <div class="ticket-hero"><span>Resultado</span><strong style="font-size:1.6rem;${V.ok===false?'color:var(--neg)':V.ok===null?'color:var(--warn)':''}">${V.t}</strong><small>${V.d}</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Inversión</span><b>${money(M.inv,c)}</b></div>
      <div class="ticket-line"><span>Ventas año 1</span><b>${money(S.s.ventas,c)}</b></div>
      <div class="ticket-line"><span>Ventas de equilibrio año 1</span><b>${M.pe===null?'-':money(M.pe,c)}</b></div>
      <div class="ticket-line"><span>Utilidad neta año 1</span><b class="${M.years[0].un<0?'neg':''}">${money(M.years[0].un,c)}</b></div>
      <div class="ticket-line total"><span>VPN con crédito (inversionista)</span><b class="${M.vpnI<0?'neg':''}">${money(M.vpnI,c)}</b></div>
      <div class="ticket-line"><span>TIR del inversionista</span><b>${M.tirI===null?'No existe':pct(M.tirI*100)}</b></div></div>`;
  // gráfico acumulado
  const acc = M.fp.map((_,t) => M.fp.slice(0,t+1).reduce((a,b)=>a+b,0));
  const W=600, H=240, L=66, Rr=16, T=14, B=30, mx = Math.max(...acc, 0), mn = Math.min(...acc, 0), pad = (mx-mn)*.08||1;
  const X = t => L + t/N*(W-L-Rr), Y = v => T + (mx+pad - v)/(mx-mn+2*pad)*(H-T-B);
  let g = ''; for (let i=0;i<=4;i++){ const v = mn-pad + (mx-mn+2*pad)*i/4; g += `<line x1="${L}" x2="${W-Rr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${Y(v)+4}" font-size="12" text-anchor="end" fill="var(--ink-3)">${moneyK(v,c)}</text>`; }
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Flujo acumulado del proyecto" style="display:block">${g}
    <line x1="${L}" x2="${W-Rr}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-3)"/>
    <polyline points="${acc.map((v,t) => X(t)+','+Y(v)).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="3"/>
    ${acc.map((v,t) => `<circle cx="${X(t)}" cy="${Y(v)}" r="5" fill="${v<0?'var(--neg)':'var(--pos)'}"><title>Año ${t}: ${money(v,c)}</title></circle><text x="${X(t)}" y="${H-8}" font-size="12" text-anchor="middle" fill="var(--ink-3)">Año ${t}</text>`).join('')}</svg>`;
  // sensibilidad
  const vs = [-20,-10,0,10], cs = [-5,0,5];
  $('#sens').innerHTML = `<div class="table-wrap"><table class="t sens"><thead><tr><th>Ventas \\ Costo variable</th>${cs.map(d => `<th class="c">${d>0?'+':''}${d} pts</th>`).join('')}</tr></thead><tbody>
    ${vs.map(dv => `<tr><td><b>${dv>0?'+':''}${dv}% ventas</b></td>${cs.map(dc => { const v = modelo({ventas:S.s.ventas*(1+dv/100), cv:S.s.cv+dc}).vpn; return `<td class="c ${v<0?'neg':'pos'}" ${dv===0&&dc===0?'style="outline:2px solid var(--accent);outline-offset:-3px"':''}>${moneyK(v,c)}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div><p class="hint" style="margin-top:8px">La celda marcada es tu escenario actual. Verde: VPN positivo.</p>`;
}

$('#btn-print').innerHTML = I.print + 'Imprimir resumen del plan';
$('#btn-print').onclick = () => {
  const M = modelo(), c = cur(), V = veredicto(M);
  const yrs = M.years.map(y => `<th class="r">Año ${y.t}</th>`).join('');
  const fila = (l,k,cls='') => `<tr class="${cls}"><td>${l}</td>${M.years.map(y => `<td class="r ${y[k]<0?'neg':''}">${money(y[k],c)}</td>`).join('')}</tr>`;
  imprimirDoc('Plan de negocio', `<h2 style="margin-top:0">${esc(S.nombre)}</h2><p>${esc(S.desc)}</p>
    <div class="kp"><div><span>Inversión</span><b>${money(M.inv,c)}</b></div><div><span>VPN al ${pct(S.s.tio)}</span><b>${money(M.vpn,c)}</b></div><div><span>TIR</span><b>${M.tir===null?'No existe':pct(M.tir*100)}</b></div><div><span>Recuperación</span><b>${anios(M.pay)}</b></div></div>
    <p><b>${V.t}.</b> ${V.d}</p>
    <h2>Inversión inicial</h2><table><thead><tr><th>Concepto</th><th>Tipo</th><th class="r">Valor</th></tr></thead><tbody>${S.inv.map(x => `<tr><td>${esc(x.n)}</td><td>${TIPOS[x.t]}</td><td class="r">${money(x.v,c)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">Total</td><td class="r">${money(M.inv,c)}</td></tr></tfoot></table>
    ${S.cr.monto?`<p>Financiación: crédito de ${money(S.cr.monto,c)} al ${pct(S.cr.tasa)} anual a ${S.cr.plazo} años (cuota anual ${money(M.cr.cuota,c)}); aporte propio de ${money(M.inv-S.cr.monto,c)}.</p>`:''}
    <h2>Supuestos</h2><p>Ventas año 1: ${money(S.s.ventas,c)}, crecimiento ${pct(S.s.gv)} anual. Costo variable ${pct(S.s.cv)} de las ventas. Gastos fijos año 1: ${money(S.s.gf,c)}, aumento ${pct(S.s.inf)} anual. Vida útil de activos ${S.s.vida} años. Impuesto ${pct(S.s.tax)}. Rentabilidad mínima esperada ${pct(S.s.tio)}.</p>
    <h2>Estado de resultados proyectado</h2><table><thead><tr><th>Concepto</th>${yrs}</tr></thead><tbody>${fila('Ventas','ventas')}${fila('Costo variable','cv')}${fila('Gastos fijos','gf')}${fila('Depreciación','dep')}${fila('Utilidad operacional','ebit','tot')}${fila('Intereses','int')}${fila('Impuesto','imp')}${fila('Utilidad neta','un','tot')}</tbody></table>
    <h2>Flujo de caja del proyecto</h2><table><thead><tr><th>Concepto</th><th class="r">Año 0</th>${yrs}</tr></thead><tbody><tr class="tot"><td>Flujo del proyecto</td>${M.fp.map(v => `<td class="r ${v<0?'neg':''}">${money(v,c)}</td>`).join('')}</tr><tr><td>Flujo del inversionista</td>${M.fi.map(v => `<td class="r ${v<0?'neg':''}">${money(v,c)}</td>`).join('')}</tr></tbody></table>`, 'Evaluación a 5 años');
};

function renderAll(){ renderInv(); update(); }
tabs(() => update());
renderAll();
document.addEventListener('ma:negocio', update);
})();

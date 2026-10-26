(function(){
const {$, $$, esc, uid, num, money, moneyK, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, monthKey, mesNombre, csv, negocio, imprimirDoc} = MA;

const cur = () => negocio().moneda || 'COP';
const rep = (v) => Array(12).fill(v);
const grow = (v, g) => Array.from({length:12}, (_,i) => Math.round(v * Math.pow(1+g, i)));
const DEF = {
  inicio: monthKey(), saldo0: 3500000, minimo: 2000000,
  rubros: [
    {id:uid(), tipo:'in', n:'Ventas de contado', vals:grow(9000000, 0.02)},
    {id:uid(), tipo:'in', n:'Cobro de cartera', vals:rep(2500000)},
    {id:uid(), tipo:'out', n:'Compras de mercancía', vals:grow(5200000, 0.02)},
    {id:uid(), tipo:'out', n:'Nómina y seguridad social', vals:rep(3100000).map((v,i)=> i===5||i===11 ? v+1550000 : v)},
    {id:uid(), tipo:'out', n:'Arriendo', vals:rep(1200000)},
    {id:uid(), tipo:'out', n:'Servicios y gastos generales', vals:rep(650000)},
    {id:uid(), tipo:'out', n:'Cuota de crédito', vals:rep(900000)},
    {id:uid(), tipo:'out', n:'Impuestos', vals:[0,0,1800000,0,0,0,0,1800000,0,0,0,2400000]}
  ]
};
let S = Object.assign({}, DEF, store.get('estado', {}));
const save = () => store.set('estado', S);
const meses = () => { const [y,m] = S.inicio.split('-').map(Number); return Array.from({length:12}, (_,i) => { const d = new Date(y, m-1+i, 1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }); };
const corto = k => { const [y,m] = k.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('es-CO',{month:'short'}).replace('.','') + ' ' + String(y).slice(2); };

function calc(){
  const ti = Array(12).fill(0), te = Array(12).fill(0);
  S.rubros.forEach(r => r.vals.forEach((v,i) => { if (r.tipo === 'in') ti[i] += +v||0; else te[i] += +v||0; }));
  const neto = ti.map((v,i) => v - te[i]); const ini = [], fin = [];
  let s = +S.saldo0||0; neto.forEach((n,i) => { ini.push(s); s += n; fin.push(s); });
  return {ti, te, neto, ini, fin};
}

/* ---------- Encabezado ---------- */
$('#inicio').value = S.inicio; $('#inicio').onchange = e => { S.inicio = e.target.value || monthKey(); save(); renderGrid(); renderRes(); };
bindNum($('#saldo0'), S.saldo0, v => { S.saldo0 = v; save(); totales(); });
bindNum($('#minimo'), S.minimo, v => { S.minimo = v; save(); totales(); });

/* ---------- Grilla ---------- */
function filaRubro(r){
  return `<tr data-id="${r.id}"><td><div class="rubro"><input class="input" data-n value="${esc(r.n)}" aria-label="Nombre del rubro">
    <button class="btn ghost sm" data-fill type="button" title="Llenar meses">Llenar</button><button class="btn ghost sm icon" data-del aria-label="Quitar rubro">${I.trash}</button></div></td>
    ${r.vals.map((v,i) => `<td><input class="input num" data-i="${i}" inputmode="decimal" aria-label="${esc(r.n)} mes ${i+1}"></td>`).join('')}<td class="r" data-tot></td></tr>`;
}
function renderGrid(){
  const ms = meses();
  const head = `<thead><tr><th>Concepto</th>${ms.map(m => `<th class="r">${corto(m)}</th>`).join('')}<th class="r">Total año</th></tr></thead>`;
  const ins = S.rubros.filter(r => r.tipo === 'in'), outs = S.rubros.filter(r => r.tipo === 'out');
  const fila = (cls, label, key) => `<tr class="${cls}" data-row="${key}"><td>${label}</td>${ms.map((_,i) => `<td class="r" data-c="${i}"></td>`).join('')}<td class="r" data-c="t"></td></tr>`;
  $('#grid').innerHTML = head + `<tbody>
    ${fila('', 'Saldo inicial del mes', 'ini')}
    <tr class="sec"><td colspan="14">Ingresos</td></tr>${ins.map(filaRubro).join('')}${fila('tot','Total ingresos','ti')}
    <tr class="sec"><td colspan="14">Egresos</td></tr>${outs.map(filaRubro).join('')}${fila('tot','Total egresos','te')}
    ${fila('tot','Flujo neto del mes','neto')}${fila('fin','Saldo final del mes','fin')}</tbody>`;
  $$('#grid tr[data-id]').forEach(tr => { const r = S.rubros.find(x => x.id === tr.dataset.id);
    tr.querySelector('[data-n]').oninput = e => { r.n = e.target.value; save(); };
    tr.querySelectorAll('[data-i]').forEach(inp => bindNum(inp, r.vals[+inp.dataset.i], v => { r.vals[+inp.dataset.i] = v; save(); totales(); }, 0));
    tr.querySelector('[data-del]').onclick = async () => { if (r.vals.some(v => v) && !(await confirmar('¿Quitar «'+(r.n||'rubro')+'» y sus valores?'))) return; S.rubros = S.rubros.filter(x => x !== r); save(); renderGrid(); };
    tr.querySelector('[data-fill]').onclick = () => llenar(r); });
  totales();
}
function totales(){
  const c = calc(), cu = cur(), sum = a => a.reduce((x,y) => x+y, 0);
  const put = (key, arr, tot, colorize) => { const tr = $(`#grid tr[data-row="${key}"]`); if (!tr) return;
    arr.forEach((v,i) => { const td = tr.querySelector(`[data-c="${i}"]`); td.textContent = money(v,cu); td.className = 'r' + (colorize ? (v < 0 ? ' rojo' : v < S.minimo ? ' bajo' : '') : (key==='neto' && v < 0 ? ' neg' : '')); });
    tr.querySelector('[data-c="t"]').textContent = tot === null ? '' : money(tot,cu); };
  put('ini', c.ini, null); put('ti', c.ti, sum(c.ti)); put('te', c.te, sum(c.te)); put('neto', c.neto, sum(c.neto)); put('fin', c.fin, c.fin[11], true);
  $$('#grid tr[data-id]').forEach(tr => { const r = S.rubros.find(x => x.id === tr.dataset.id); tr.querySelector('[data-tot]').textContent = money(sum(r.vals.map(v=>+v||0)),cu); });
}
function llenar(r){
  let v = r.vals[0] || 0, g = 0;
  dialog({title:'Llenar «'+(r.n||'rubro')+'»', body:`<div class="fields"><label class="field"><span>Valor del primer mes</span><input class="input num" id="l-v" inputmode="decimal"></label>
    <label class="field"><span>Crecimiento mensual</span><div class="input-group"><input class="input num" id="l-g" inputmode="decimal" value="0"><span class="addon">%</span></div><small class="hint">0 repite el mismo valor los 12 meses.</small></label></div>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Llenar 12 meses', cls:'primary', onClick:()=>{ r.vals = grow(v, g/100); save(); renderGrid(); toast('Meses llenados'); }}],
    onOpen: d => { bindNum($('#l-v',d), v, x => v = x, 0); bindNum($('#l-g',d), 0, x => g = x); }});
}
$('#add-in').onclick = () => { S.rubros.push({id:uid(), tipo:'in', n:'Nuevo ingreso', vals:rep(0)}); save(); renderGrid(); };
$('#add-out').onclick = () => { S.rubros.push({id:uid(), tipo:'out', n:'Nuevo egreso', vals:rep(0)}); save(); renderGrid(); };
$('#btn-reset').onclick = async () => { if (!(await confirmar('Se borrarán todos los valores y quedarán rubros básicos en cero.', 'Empezar en blanco'))) return;
  S.rubros = [{id:uid(),tipo:'in',n:'Ventas',vals:rep(0)},{id:uid(),tipo:'out',n:'Compras',vals:rep(0)},{id:uid(),tipo:'out',n:'Gastos fijos',vals:rep(0)}]; S.saldo0 = 0; $('#saldo0').value = ''; save(); renderGrid(); };
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
$('#btn-csv').onclick = () => { const c = calc(), ms = meses();
  csv('flujo-de-caja-'+S.inicio, [['Concepto', ...ms, 'Total'], ['Saldo inicial', ...c.ini.map(v=>fmt(v)), ''],
    ...S.rubros.filter(r=>r.tipo==='in').map(r => [r.n, ...r.vals.map(v=>fmt(v)), fmt(r.vals.reduce((a,b)=>a+(+b||0),0))]), ['Total ingresos', ...c.ti.map(v=>fmt(v)), fmt(c.ti.reduce((a,b)=>a+b,0))],
    ...S.rubros.filter(r=>r.tipo==='out').map(r => [r.n, ...r.vals.map(v=>fmt(v)), fmt(r.vals.reduce((a,b)=>a+(+b||0),0))]), ['Total egresos', ...c.te.map(v=>fmt(v)), fmt(c.te.reduce((a,b)=>a+b,0))],
    ['Flujo neto', ...c.neto.map(v=>fmt(v)), fmt(c.neto.reduce((a,b)=>a+b,0))], ['Saldo final', ...c.fin.map(v=>fmt(v)), fmt(c.fin[11])]]); };
$('#btn-print').onclick = () => { const c = calc(), ms = meses(), cu = cur(), f = v => money(v,cu).replace(/^(-?)\D+/,'$1');
  const row = (l, a, cls='') => `<tr class="${cls}"><td>${esc(l)}</td>${a.map(v => `<td class="r ${v<0?'neg':''}">${f(v)}</td>`).join('')}</tr>`;
  imprimirDoc('Flujo de caja proyectado', `<style>@page{size:landscape}table{font-size:7.5pt}td,th{padding:4px 5px}</style><table><thead><tr><th>Concepto (${cu})</th>${ms.map(m=>`<th class="r">${corto(m)}</th>`).join('')}</tr></thead><tbody>
    ${row('Saldo inicial', c.ini)}${S.rubros.filter(r=>r.tipo==='in').map(r=>row(r.n, r.vals.map(v=>+v||0))).join('')}${row('Total ingresos', c.ti, 'tot')}
    ${S.rubros.filter(r=>r.tipo==='out').map(r=>row(r.n, r.vals.map(v=>+v||0))).join('')}${row('Total egresos', c.te, 'tot')}${row('Flujo neto', c.neto, 'tot')}${row('Saldo final', c.fin, 'tot')}</tbody></table>`,
    mesNombre(ms[0]) + ' a ' + mesNombre(ms[11])); };

/* ---------- Resumen ---------- */
function renderRes(){
  const c = calc(), cu = cur(), ms = meses(), sum = a => a.reduce((x,y)=>x+y,0);
  const minI = c.fin.indexOf(Math.min(...c.fin)), rojos = c.fin.filter(v => v < 0).length, bajos = c.fin.filter(v => v < S.minimo).length;
  const necesidad = Math.max(0, S.minimo - Math.min(...c.fin));
  $('#kpis').innerHTML = `<div class="kpi accent"><span>Saldo al final del año</span><strong class="${c.fin[11]<0?'neg':''}">${money(c.fin[11],cu)}</strong><small>Empiezas con ${money(S.saldo0,cu)}</small></div>
    <div class="kpi"><span>Mes más ajustado</span><strong class="${c.fin[minI]<0?'neg':''}">${money(c.fin[minI],cu)}</strong><small>${mesNombre(ms[minI])}</small></div>
    <div class="kpi"><span>Meses en rojo</span><strong class="${rojos?'neg':''}">${rojos}</strong><small>${bajos} bajo tu saldo mínimo</small></div>
    <div class="kpi"><span>Financiamiento sugerido</span><strong class="${necesidad?'warn':''}">${money(necesidad,cu)}</strong><small>Para no bajar de ${money(S.minimo,cu)}</small></div>`;
  // gráfico
  const W=760, H=300, L=70, R=14, T=16, B=34, n=12, bw=(W-L-R)/n;
  const vals = [...c.neto, ...c.fin, 0, S.minimo]; const mx = Math.max(...vals), mn = Math.min(...vals); const pad = (mx-mn)*.08 || 1;
  const top = mx+pad, bot = mn-pad, Y = v => T + (top - v)/(top - bot)*(H-T-B);
  let g = ''; for (let i=0;i<=4;i++){ const v = bot + (top-bot)*i/4; g += `<line x1="${L}" x2="${W-R}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="${L-8}" y="${Y(v)+4}" font-size="12" text-anchor="end" fill="var(--ink-3)">${moneyK(v,cu)}</text>`; }
  const bars = c.neto.map((v,i) => { const x = L + i*bw + bw*.2, y = Math.min(Y(v), Y(0)), h = Math.abs(Y(v)-Y(0)); return `<rect x="${x}" y="${y}" width="${bw*.6}" height="${Math.max(h,1)}" rx="3" fill="${v<0?'var(--neg)':'var(--accent)'}" opacity=".75"><title>${corto(ms[i])}: ${money(v,cu)}</title></rect><text x="${L+i*bw+bw/2}" y="${H-12}" font-size="12" text-anchor="middle" fill="var(--ink-3)">${corto(ms[i]).split(' ')[0]}</text>`; }).join('');
  const pts = c.fin.map((v,i) => `${L+i*bw+bw/2},${Y(v)}`).join(' ');
  $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Flujo neto mensual y saldo acumulado" style="display:block">
    ${g}<line x1="${L}" x2="${W-R}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--ink-3)"/>
    <line x1="${L}" x2="${W-R}" y1="${Y(S.minimo)}" y2="${Y(S.minimo)}" stroke="var(--warn)" stroke-dasharray="5 4"/>
    ${bars}<polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>
    ${c.fin.map((v,i) => `<circle cx="${L+i*bw+bw/2}" cy="${Y(v)}" r="4" fill="${v<0?'var(--neg)':'var(--paper)'}" stroke="var(--ink)" stroke-width="2"><title>Saldo ${corto(ms[i])}: ${money(v,cu)}</title></circle>`).join('')}</svg>
    <div class="row small" style="gap:16px;margin-top:6px"><span class="row" style="gap:6px"><i style="width:12px;height:12px;background:var(--accent);opacity:.75;border-radius:3px;display:inline-block"></i>Flujo neto</span>
    <span class="row" style="gap:6px"><i style="width:14px;height:3px;background:var(--ink);display:inline-block"></i>Saldo final</span>
    <span class="row" style="gap:6px"><i style="width:14px;border-top:2px dashed var(--warn);display:inline-block"></i>Saldo mínimo</span></div>`;
  // lectura
  const ti = sum(c.ti), te = sum(c.te); const L2 = [];
  L2.push(`<p>En el año entran <b>${money(ti,cu)}</b> y salen <b>${money(te,cu)}</b>, un flujo neto de <b class="${ti-te<0?'neg':'pos'}">${money(ti-te,cu)}</b>${ti?' ('+pct((ti-te)/ti*100)+' de los ingresos)':''}.</p>`);
  const negs = c.neto.map((v,i) => v < 0 ? mesNombre(ms[i]) : null).filter(Boolean);
  if (negs.length) L2.push(`<p>Los meses con más salidas que entradas son: ${negs.join(', ')}. Revisa si puedes mover pagos o adelantar cobros en esas fechas.</p>`);
  if (rojos) L2.push(`<p class="neg">La caja queda en negativo en ${rojos} ${rojos===1?'mes':'meses'}. El punto más bajo es ${mesNombre(ms[minI])} con ${money(c.fin[minI],cu)}.</p>`);
  else if (bajos) L2.push(`<p>Nunca quedas en negativo, pero en ${bajos} ${bajos===1?'mes':'meses'} bajas de tu saldo mínimo de ${money(S.minimo,cu)}.</p>`);
  else L2.push(`<p class="pos">Tu caja se mantiene por encima del saldo mínimo todo el año.</p>`);
  const out = S.rubros.filter(r => r.tipo === 'out').map(r => [r.n, sum(r.vals.map(v=>+v||0))]).sort((a,b) => b[1]-a[1]);
  if (out.length && te) L2.push(`<p>Tu egreso más grande es <b>${esc(out[0][0])}</b>: ${pct(out[0][1]/te*100)} de lo que sale.</p>`);
  $('#lectura').innerHTML = L2.join('');
}

tabs(id => { if (id === 'res') renderRes(); });
renderGrid(); renderRes();
document.addEventListener('ma:negocio', () => { renderGrid(); renderRes(); });
})();

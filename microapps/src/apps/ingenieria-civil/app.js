(function(){
const {$, $$, esc, uid, num, money, fmt, pct, bindNum, store, toast, confirmar, tabs, I, today, fechaLarga, csv, negocio, imprimirDoc} = MA;

/* ---------- Tablas de referencia ---------- */
const MEZ = [
  {k:'4000', n:'1:2:2, 4.000 psi (28 MPa, 280 kg/cm²): elementos muy exigidos', cem:420, ar:0.67, gr:0.67, ag:190},
  {k:'3000', n:'1:2:3, 3.000 psi (21 MPa, 210 kg/cm²): columnas, vigas y losas', cem:350, ar:0.56, gr:0.84, ag:180},
  {k:'2500', n:'1:2:4, 2.500 psi (17,5 MPa, 175 kg/cm²): zapatas y placas de piso', cem:300, ar:0.48, gr:0.96, ag:170},
  {k:'2000', n:'1:3:4, 2.000 psi (14 MPa, 140 kg/cm²): andenes y pisos', cem:260, ar:0.63, gr:0.84, ag:170},
  {k:'1500', n:'1:3:6, 1.500 psi (10,5 MPa): solados y concreto ciclópeo', cem:210, ar:0.50, gr:1.00, ag:160}];
const MORT = [{k:'1:3', n:'1:3 (pañetes exteriores, mampostería estructural)', cem:454, ar:1.10, ag:250}, {k:'1:4', n:'1:4 (pega de mampostería, pañetes)', cem:364, ar:1.16, ag:240},
  {k:'1:5', n:'1:5 (pega de muros divisorios)', cem:302, ar:1.20, ag:240}, {k:'1:6', n:'1:6 (pañetes interiores)', cem:261, ar:1.20, ag:235}];
const UNID = [{n:'Ladrillo tolete macizo', l:24.5, h:6, e:12}, {n:'Bloque de arcilla No. 4', l:30, h:20, e:10}, {n:'Bloque de arcilla No. 5', l:30, h:20, e:12},
  {n:'Bloque de arcilla de 15', l:30, h:20, e:15}, {n:'Bloque de concreto de 10', l:39, h:19, e:10}, {n:'Bloque de concreto de 15', l:39, h:19, e:15}, {n:'Unidad personalizada', l:0, h:0, e:0}];
const BAR = [{k:'#2', d:'1/4"', mm:6.4, kg:0.250}, {k:'#3', d:'3/8"', mm:9.5, kg:0.560}, {k:'#4', d:'1/2"', mm:12.7, kg:0.994}, {k:'#5', d:'5/8"', mm:15.9, kg:1.552},
  {k:'#6', d:'3/4"', mm:19.1, kg:2.235}, {k:'#7', d:'7/8"', mm:22.2, kg:3.042}, {k:'#8', d:'1"', mm:25.4, kg:3.973}];
const ELEM = {
  losa:{n:'Losa o placa', f:[['Largo','m'],['Ancho','m'],['Espesor','m']], v:x => x.a*x.b*x.c},
  viga:{n:'Vigas', f:[['Cantidad',''],['Base','m'],['Altura','m'],['Largo','m']], v:x => x.n*x.a*x.b*x.c},
  col:{n:'Columnas', f:[['Cantidad',''],['Lado 1','m'],['Lado 2','m'],['Altura','m']], v:x => x.n*x.a*x.b*x.c},
  zap:{n:'Zapatas', f:[['Cantidad',''],['Ancho','m'],['Largo','m'],['Altura','m']], v:x => x.n*x.a*x.b*x.c},
  cil:{n:'Pilotes o columnas redondas', f:[['Cantidad',''],['Diámetro','m'],['Altura','m']], v:x => x.n*Math.PI*x.a*x.a/4*x.b},
  vol:{n:'Volumen conocido', f:[['Volumen','m³']], v:x => x.a}
};

/* ---------- Estado ---------- */
const DEF = {
  bulto:50, conc:{mez:'3000', desp:5, el:[{id:uid(), t:'losa', n:1, a:8, b:6, c:0.12, nom:'Losa de entrepiso'}, {id:uid(), t:'col', n:6, a:0.3, b:0.3, c:2.6, nom:'Columnas primer piso'}, {id:uid(), t:'viga', n:4, a:0.3, b:0.35, c:6, nom:'Vigas aéreas'}]},
  muro:{l:12, h:2.5, v:3.6, u:2, ul:30, uh:20, ue:12, j:1, mort:'1:4', du:5, caras:2, pe:1.5, pmort:'1:5'},
  acero:{modo:'malla', barra:'#4', comercial:6, lx:8, ly:6, s:20, r:2.5, g:0, n:10, L:6, el:6, eL:2.6, es:15, eb:30, eh:30, er:4, ebarra:'#3'},
  zap:{p:45, q:1.5, f:10, r:1}, col:{at:16, n:2, w:1, fc:210, tipo:'int'},
  exc:{n:6, l:1.6, a:1.6, p:1.5, ab:25, vq:6, est:3.2, fc:1.3},
  precios:{}, lista:[], obra:''
};
let S = store.get('estado', null) || JSON.parse(JSON.stringify(DEF));
['conc','muro','acero','zap','col','exc'].forEach(k => S[k] = Object.assign({}, DEF[k], S[k]));
const save = () => store.set('estado', S);
const cur = () => negocio().moneda || 'COP';
const m$ = v => money(v, cur());
const f2 = (v, d=2) => fmt(v, d);
const bar = k => BAR.find(b => b.k === k) || BAR[2];

/* Campo numérico enlazado al estado */
function campo(sel, obj, key, d=2, after){ const el = $(sel); if (!el) return; bindNum(el, obj[key], v => { obj[key] = v; save(); after && after(); }, d); }
let LAST = {}; // último resultado de cada calculadora para agregar a la lista
function lineas(items){ return items.filter(x => x.q > 0).map(x => `<div class="ticket-line"><span>${esc(x.mat)}</span><b>${f2(x.q, x.d ?? 2)} ${x.und}</b></div>`).join(''); }

/* ================= Concreto ================= */
$('#el-tipo').innerHTML = Object.entries(ELEM).map(([k,v]) => `<option value="${k}">${v.n}</option>`).join('');
$('#mezcla').innerHTML = MEZ.map(m => `<option value="${m.k}">${m.n}</option>`).join('');
$('#mezcla').value = S.conc.mez; $('#mezcla').onchange = e => { S.conc.mez = e.target.value; save(); calcConc(); };
campo('#c-desp', S.conc, 'desp', 1, calcConc);
$('#add-el').onclick = () => { const t = $('#el-tipo').value; S.conc.el.push({id:uid(), t, n:1, a:0, b:0, c:0, nom:ELEM[t].n}); save(); renderEl(); };
function renderEl(){
  if (!S.conc.el.length){ $('#elems').innerHTML = `<div class="empty"><strong>Sin elementos</strong>Elige un tipo y toca «Agregar elemento».</div>`; calcConc(); return; }
  $('#elems').innerHTML = `<div class="stack" style="gap:10px">${S.conc.el.map(x => { const E = ELEM[x.t]; const keys = E.f.length === 4 ? ['n','a','b','c'] : E.f.length === 3 && x.t !== 'cil' ? ['a','b','c'] : x.t === 'cil' ? ['n','a','b'] : ['a'];
    return `<div class="card" style="padding:12px;box-shadow:none" data-id="${x.id}"><div class="row between" style="margin-bottom:8px"><input class="input" data-nom value="${esc(x.nom||E.n)}" style="max-width:280px;font-weight:600" aria-label="Nombre del elemento">
      <span class="row"><b data-vol class="small"></b><button class="btn ghost sm icon" data-del aria-label="Quitar elemento">${I.trash}</button></span></div>
      <div class="fields" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr))">${E.f.map((f,i) => `<label class="field"><span>${f[0]}</span><div class="input-group"><input class="input num" data-k="${keys[i]}" inputmode="decimal"><span class="addon">${f[1]||'und'}</span></div></label>`).join('')}</div></div>`; }).join('')}</div>`;
  $$('#elems [data-id]').forEach(c => { const x = S.conc.el.find(e => e.id === c.dataset.id);
    c.querySelector('[data-nom]').oninput = e => { x.nom = e.target.value; save(); };
    c.querySelectorAll('[data-k]').forEach(inp => bindNum(inp, x[inp.dataset.k], v => { x[inp.dataset.k] = v; save(); vol(); calcConc(); }, inp.dataset.k === 'n' ? 0 : 3));
    c.querySelector('[data-del]').onclick = () => { S.conc.el = S.conc.el.filter(e => e !== x); save(); renderEl(); };
    const vol = () => c.querySelector('[data-vol]').textContent = f2(ELEM[x.t].v(x), 3) + ' m³'; vol(); });
  calcConc();
}
function calcConc(){
  const M = MEZ.find(m => m.k === S.conc.mez) || MEZ[1], V = S.conc.el.reduce((a,x) => a + ELEM[x.t].v(x), 0), Vd = V * (1 + (+S.conc.desp||0) / 100);
  const cemKg = Vd * M.cem, bultos = cemKg / (+S.bulto || 50);
  const items = [{mat:'Cemento', und:'bultos', q:Math.ceil(bultos), d:0}, {mat:'Arena', und:'m³', q:Vd * M.ar}, {mat:'Grava', und:'m³', q:Vd * M.gr}, {mat:'Agua', und:'litros', q:Vd * M.ag, d:0}];
  LAST.conc = {desc:`Concreto ${M.k} psi, ${f2(V,2)} m³`, items};
  $('#mezcla-nota').innerHTML = `Por m³: ${M.cem} kg de cemento (${f2(M.cem/(+S.bulto||50),1)} bultos de ${f2(S.bulto,1)} kg), ${f2(M.ar)} m³ de arena, ${f2(M.gr)} m³ de grava y ${M.ag} litros de agua. Es una dosificación empírica de referencia; para estructuras pide un diseño de mezcla de laboratorio (ACI 211) o usa concreto premezclado.`;
  $('#t-conc').innerHTML = `<div class="ticket-top"><h3>Concreto ${M.k} psi</h3><span>Desperdicio ${f2(S.conc.desp,1)}%</span></div>
    <div class="ticket-hero"><span>Volumen total</span><strong>${f2(V,2)} m³</strong><small>Con desperdicio: ${f2(Vd,2)} m³. Equivale a ${f2(cemKg,0)} kg de cemento.</small></div>
    <div class="ticket-lines">${lineas(items)}${costo(items)}</div>`;
}

/* ================= Muros ================= */
$('#m-u').innerHTML = UNID.map((u,i) => `<option value="${i}">${u.n}${u.l?` (${f2(u.l,1)} × ${f2(u.h,1)} × ${f2(u.e,1)} cm)`:''}</option>`).join('');
$('#m-mort').innerHTML = MORT.map(m => `<option value="${m.k}">${m.n}</option>`).join(''); $('#p-mort').innerHTML = $('#m-mort').innerHTML;
function bindMuro(){ const M = S.muro;
  [['#m-l','l'],['#m-h','h'],['#m-v','v'],['#m-ul','ul',1],['#m-uh','uh',1],['#m-ue','ue',1],['#m-j','j',1],['#m-du','du',1],['#p-e','pe',1]].forEach(([s,k,d]) => campo(s, M, k, d ?? 2, calcMuro));
  $('#m-u').value = M.u; $('#m-mort').value = M.mort; $('#p-mort').value = M.pmort; $('#p-caras').value = M.caras;
  $('#m-u').onchange = e => { M.u = +e.target.value; const u = UNID[M.u]; if (u.l){ M.ul = u.l; M.uh = u.h; M.ue = u.e; ['#m-ul','#m-uh','#m-ue'].forEach((s,i) => $(s).value = f2([u.l,u.h,u.e][i],1)); } save(); calcMuro(); };
  $('#m-mort').onchange = e => { M.mort = e.target.value; save(); calcMuro(); }; $('#p-mort').onchange = e => { M.pmort = e.target.value; save(); calcMuro(); };
  $('#p-caras').onchange = e => { M.caras = +e.target.value; save(); calcMuro(); };
}
function calcMuro(){
  const M = S.muro, A = Math.max(0, M.l * M.h - M.v), L = M.ul/100, H = M.uh/100, E = M.ue/100, J = M.j/100;
  if (!(L > 0 && H > 0)){ $('#t-muro').innerHTML = `<div class="empty" style="border:0">Escribe las medidas de la unidad.</div>`; return; }
  const nM2 = 1 / ((L + J) * (H + J)), unidades = Math.ceil(A * nM2 * (1 + M.du/100));
  const vPega = A * Math.max(0, 1 - nM2 * L * H) * E * 1.10;
  const vPan = A * (+M.caras||0) * (M.pe/100) * 1.10;
  const mp = MORT.find(m => m.k === M.mort) || MORT[1], mn = MORT.find(m => m.k === M.pmort) || MORT[2];
  const cem = (vPega * mp.cem + vPan * mn.cem) / (+S.bulto||50), arena = vPega * mp.ar + vPan * mn.ar, agua = vPega * mp.ag + vPan * mn.ag;
  const uName = UNID[M.u].l ? UNID[M.u].n : `Unidad de ${f2(M.ul,1)} × ${f2(M.uh,1)} cm`;
  const items = [{mat:uName, und:'und', q:unidades, d:0}, {mat:'Cemento', und:'bultos', q:Math.ceil(cem), d:0}, {mat:'Arena', und:'m³', q:arena}, {mat:'Agua', und:'litros', q:agua, d:0}];
  LAST.muro = {desc:`Muro de ${f2(A,2)} m² en ${uName.toLowerCase()}${M.caras?', pañetado a '+M.caras+(M.caras===1?' cara':' caras'):''}`, items};
  $('#t-muro').innerHTML = `<div class="ticket-top"><h3>Muro</h3><span>${f2(nM2,1)} unidades por m²</span></div>
    <div class="ticket-hero"><span>Área neta</span><strong>${f2(A,2)} m²</strong><small>Mortero de pega ${f2(vPega,3)} m³${vPan?`, pañete ${f2(vPan,3)} m³`:''} (incluye 10% de desperdicio).</small></div>
    <div class="ticket-lines">${lineas(items)}${costo(items)}</div>`;
}

/* ================= Acero ================= */
$('#a-tabla').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Barra</th><th>Diámetro</th><th class="r">kg/m</th><th class="r">kg por varilla de 6 m</th><th class="r">kg por varilla de 12 m</th></tr></thead><tbody>
  ${BAR.map(b => `<tr><td><b>${b.k}</b></td><td>${b.d} (${f2(b.mm,1)} mm)</td><td class="r">${f2(b.kg,3)}</td><td class="r">${f2(b.kg*6,2)}</td><td class="r">${f2(b.kg*12,2)}</td></tr>`).join('')}</tbody></table></div>`;
$$('#a-modo button').forEach(b => b.onclick = () => { S.acero.modo = b.dataset.v; save(); renderAcero(); });
const barOpts = sel => BAR.map(b => `<option value="${b.k}" ${b.k===sel?'selected':''}>${b.k} (${b.d})</option>`).join('');
function renderAcero(){
  const A = S.acero; $$('#a-modo button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === A.modo));
  const nf = (id, l, u) => `<label class="field"><span>${l}</span>${u?`<div class="input-group"><input class="input num" id="${id}" inputmode="decimal"><span class="addon">${u}</span></div>`:`<input class="input num" id="${id}" inputmode="decimal">`}</label>`;
  const com = `<label class="field"><span>Varilla comercial</span><select class="input" id="a-com"><option value="6">6 m</option><option value="9">9 m</option><option value="12">12 m</option></select></label>`;
  $('#a-campos').innerHTML = A.modo === 'malla'
    ? `<label class="field"><span>Barra</span><select class="input" id="a-bar">${barOpts(A.barra)}</select></label>${com}${nf('a-lx','Largo de la losa','m')}${nf('a-ly','Ancho de la losa','m')}${nf('a-s','Separación','cm')}${nf('a-r','Recubrimiento','cm')}${nf('a-g','Gancho en cada extremo','cm')}`
    : A.modo === 'long'
    ? `<label class="field"><span>Barra</span><select class="input" id="a-bar">${barOpts(A.barra)}</select></label>${com}${nf('a-n','Cantidad de barras','')}${nf('a-L','Longitud de cada barra','m')}`
    : `<label class="field"><span>Barra del estribo</span><select class="input" id="a-ebar">${barOpts(A.ebarra)}</select></label>${com}${nf('a-el','Cantidad de elementos','')}${nf('a-eL','Longitud de cada elemento','m')}${nf('a-es','Separación de estribos','cm')}${nf('a-eb','Base de la sección','cm')}${nf('a-eh','Altura de la sección','cm')}${nf('a-er','Recubrimiento','cm')}`;
  const map = {'a-lx':'lx','a-ly':'ly','a-s':'s','a-r':'r','a-g':'g','a-n':'n','a-L':'L','a-el':'el','a-eL':'eL','a-es':'es','a-eb':'eb','a-eh':'eh','a-er':'er'};
  Object.entries(map).forEach(([id,k]) => campo('#'+id, A, k, ['n','el'].includes(k) ? 0 : 2, calcAcero));
  const c = $('#a-com'); c.value = String(A.comercial); c.onchange = e => { A.comercial = +e.target.value; save(); calcAcero(); };
  const b = $('#a-bar'); if (b) b.onchange = e => { A.barra = e.target.value; save(); calcAcero(); };
  const eb = $('#a-ebar'); if (eb) eb.onchange = e => { A.ebarra = e.target.value; save(); calcAcero(); };
  calcAcero();
}
function calcAcero(){
  const A = S.acero, Lc = +A.comercial || 6; let det = '', totalM = 0, B, piezas = 0, largo = 0, nComerciales = 0;
  if (A.modo === 'malla'){ B = bar(A.barra); const r = A.r/100, s = A.s/100, g = A.g/100;
    if (!(s > 0)) { $('#t-acero').innerHTML = `<div class="empty" style="border:0">Escribe la separación.</div>`; return; }
    const lx = Math.max(0, A.lx - 2*r) + 2*g, ly = Math.max(0, A.ly - 2*r) + 2*g;
    const nx = Math.floor(Math.max(0, A.ly - 2*r) / s) + 1, ny = Math.floor(Math.max(0, A.lx - 2*r) / s) + 1;
    totalM = nx * lx + ny * ly; piezas = nx + ny;
    nComerciales = comerciales([[nx, lx], [ny, ly]], Lc, B);
    det = `<div class="ticket-line"><span>${nx} barras de ${f2(lx)} m (sentido largo)</span><b>${f2(nx*lx,1)} m</b></div><div class="ticket-line"><span>${ny} barras de ${f2(ly)} m (sentido corto)</span><b>${f2(ny*ly,1)} m</b></div>`;
  } else if (A.modo === 'long'){ B = bar(A.barra); totalM = A.n * A.L; piezas = A.n; nComerciales = comerciales([[A.n, A.L]], Lc, B);
    det = `<div class="ticket-line"><span>${f2(A.n,0)} barras de ${f2(A.L)} m</span><b>${f2(totalM,1)} m</b></div>`;
  } else { B = bar(A.ebarra); const r = A.er, gancho = Math.max(6 * B.mm / 10, 7.5); // cm, gancho de 135° por extremo
    largo = (2 * (A.eb - 2*r) + 2 * (A.eh - 2*r) + 2 * gancho) / 100; const porEl = A.es > 0 ? Math.floor(A.eL * 100 / A.es) + 1 : 0;
    piezas = porEl * A.el; totalM = piezas * largo; nComerciales = comerciales([[piezas, largo]], Lc, B);
    det = `<div class="ticket-line"><span>${porEl} estribos por elemento × ${f2(A.el,0)}</span><b>${piezas} estribos</b></div><div class="ticket-line"><span>Largo de cada estribo, con ganchos de 135°</span><b>${f2(largo*100,1)} cm</b></div>`; }
  const kg = totalM * B.kg;
  const items = [{mat:`Acero ${B.k} (${B.d})`, und:'kg', q:kg, d:1}, {mat:`Varillas ${B.k} de ${Lc} m`, und:'und', q:nComerciales, d:0}, {mat:'Alambre negro de amarre', und:'kg', q:kg * 0.02, d:1}];
  LAST.acero = {desc: A.modo === 'malla' ? `Malla ${B.k} cada ${f2(A.s,0)} cm en losa de ${f2(A.lx)} × ${f2(A.ly)} m` : A.modo === 'long' ? `${f2(A.n,0)} barras ${B.k} de ${f2(A.L)} m` : `Estribos ${B.k} cada ${f2(A.es,0)} cm en ${f2(A.el,0)} elementos de ${f2(A.eb,0)} × ${f2(A.eh,0)} cm`, items:[items[0], items[2]]};
  $('#t-acero').innerHTML = `<div class="ticket-top"><h3>Acero ${B.k}</h3><span>${f2(B.kg,3)} kg/m</span></div>
    <div class="ticket-hero"><span>Peso total</span><strong>${f2(kg,1)} kg</strong><small>${f2(totalM,1)} metros lineales en ${piezas} piezas.</small></div>
    <div class="ticket-lines">${det}<div class="ticket-line total"><span>Varillas comerciales de ${Lc} m</span><b>${nComerciales}</b></div>
      <div class="ticket-line"><span>Alambre de amarre (2% del acero)</span><b>${f2(kg*0.02,1)} kg</b></div>${costo(LAST.acero.items)}</div>
    <p class="hint" style="margin-top:10px">Las piezas más largas que la varilla comercial incluyen traslapos de 40 diámetros. Se suma 3% por cortes.</p>`;
}
function comerciales(grupos, Lc, B){ // grupos: [[cantidad, largo]]
  const trasl = 40 * B.mm / 1000; let barras = 0, sobrantes = [];
  grupos.forEach(([n, L]) => { n = Math.round(n); if (!(n > 0) || !(L > 0)) return;
    if (L <= Lc){ const porBarra = Math.floor(Lc / L + 1e-9); barras += Math.ceil(n / porBarra); }
    else { const tramos = Math.ceil((L - Lc) / (Lc - trasl)) + 1, total = L + (tramos - 1) * trasl; barras += Math.ceil(n * total / Lc); } });
  return Math.ceil(barras * 1.03);
}

/* ================= Zapatas y columnas ================= */
['p','q','f','r'].forEach(k => campo('#z-'+k, S.zap, k, k === 'r' ? 2 : 2, calcCim));
['at','n','w','fc'].forEach(k => campo('#c-'+k, S.col, k, k === 'n' ? 0 : 2, calcCim));
$('#c-tipo').value = S.col.tipo; $('#c-tipo').onchange = e => { S.col.tipo = e.target.value; save(); calcCim(); };
const up5 = v => Math.ceil(v * 20 - 1e-9) / 20; // a 5 cm
function calcCim(){
  const Z = S.zap, qt = Z.q * 10, A = qt > 0 ? Z.p * (1 + Z.f/100) / qt : 0, r = Math.max(1, +Z.r||1);
  const B = up5(Math.sqrt(A / r)), L = up5(B * r), qr = B*L > 0 ? Z.p * (1 + Z.f/100) / (B*L) / 10 : 0;
  $('#t-zap').innerHTML = A ? `<div class="ticket-top"><h3>Zapata</h3><span>q adm ${f2(Z.q)} kg/cm²</span></div>
    <div class="ticket-hero"><span>Dimensiones mínimas</span><strong>${f2(B)} × ${f2(L)} m</strong><small>Área requerida ${f2(A,2)} m², área adoptada ${f2(B*L,2)} m².</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Carga total con peso propio</span><b>${f2(Z.p*(1+Z.f/100),1)} ton</b></div><div class="ticket-line"><span>Presión sobre el suelo</span><b>${f2(qr,2)} kg/cm²</b></div></div>` : `<div class="empty" style="border:0">Escribe la carga y la capacidad del suelo.</div>`;
  const C = S.col, fac = {int:[0.45,1.10], ext:[0.35,1.25], esq:[0.35,1.50]}[C.tipo], P = C.at * C.n * C.w * fac[1];
  const Ag = C.fc > 0 ? P * 1000 / (fac[0] * C.fc) : 0, lado = Math.max(25, Math.ceil(Math.sqrt(Ag) / 5) * 5);
  $('#t-col').innerHTML = Ag ? `<div class="ticket-top"><h3>Columna</h3><span>f'c ${f2(C.fc,0)} kg/cm²</span></div>
    <div class="ticket-hero"><span>Sección cuadrada sugerida</span><strong>${lado} × ${lado} cm</strong><small>Área mínima ${f2(Ag,0)} cm² (lado ${f2(Math.sqrt(Ag),1)} cm). Mínimo práctico 25 cm; 30 cm en zonas de amenaza sísmica alta.</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Carga de servicio estimada</span><b>${f2(C.at*C.n*C.w,1)} ton</b></div><div class="ticket-line"><span>Carga para predimensionar (× ${f2(fac[1])})</span><b>${f2(P,1)} ton</b></div>
      <div class="ticket-line"><span>Fórmula</span><b>Ag = P / (${f2(fac[0])} × f'c)</b></div><div class="ticket-line total"><span>Usa esta carga en la zapata</span><b>${f2(C.at*C.n*C.w,1)} ton</b></div></div>` : '';
}

/* ================= Excavación ================= */
['n','l','a','p','ab','vq','est','fc'].forEach(k => campo('#e-'+k, S.exc, k, k === 'n' ? 0 : 2, calcExc));
function calcExc(){
  const E = S.exc, Vb = E.n * E.l * E.a * E.p, Vs = Vb * (1 + E.ab/100), rell = Math.max(0, Vb - E.est), suelto = rell * (+E.fc||1);
  const sobra = Math.max(0, Vs - suelto), viajes = E.vq > 0 ? Math.ceil(sobra / E.vq) : 0, falta = Math.max(0, suelto - Vs);
  const items = [{mat:'Excavación', und:'m³', q:Vb}, {mat:'Relleno compactado', und:'m³', q:rell}, {mat:'Retiro de sobrantes (volqueta)', und:'viajes', q:viajes, d:0}];
  if (falta) items.push({mat:'Material de relleno adicional', und:'m³', q:falta});
  LAST.exc = {desc:`Excavación de ${f2(E.n,0)} × ${f2(E.l)} × ${f2(E.a)} × ${f2(E.p)} m`, items};
  $('#t-exc').innerHTML = `<div class="ticket-top"><h3>Movimiento de tierra</h3><span>Expansión ${f2(E.ab,0)}%</span></div>
    <div class="ticket-hero"><span>Volumen a excavar</span><strong>${f2(Vb,2)} m³</strong><small>Suelto para transportar: ${f2(Vs,2)} m³.</small></div>
    <div class="ticket-lines"><div class="ticket-line"><span>Relleno compactado</span><b>${f2(rell,2)} m³</b></div><div class="ticket-line"><span>Material suelto para el relleno</span><b>${f2(suelto,2)} m³</b></div>
      <div class="ticket-line total"><span>${falta?'Falta material de relleno':'Sobrante para retirar'}</span><b>${f2(falta||sobra,2)} m³</b></div>
      ${falta?'':`<div class="ticket-line"><span>Viajes de volqueta de ${f2(E.vq,0)} m³</span><b>${viajes}</b></div>`}${costo(items)}</div>`;
}

/* ================= Lista y precios ================= */
const MATS_BASE = [['Cemento','bultos'],['Arena','m³'],['Grava','m³'],['Agua','litros'],['Ladrillo tolete macizo','und'],['Bloque de arcilla No. 4','und'],['Bloque de arcilla No. 5','und'],
  ['Bloque de arcilla de 15','und'],['Bloque de concreto de 10','und'],['Bloque de concreto de 15','und'],...BAR.map(b => [`Acero ${b.k} (${b.d})`,'kg']),['Alambre negro de amarre','kg'],
  ['Excavación','m³'],['Relleno compactado','m³'],['Retiro de sobrantes (volqueta)','viajes'],['Material de relleno adicional','m³']];
const precio = mat => +S.precios[mat] || 0;
function costo(items){ const t = items.reduce((a,x) => a + x.q * precio(x.mat), 0); return t > 0 ? `<div class="ticket-line total"><span>Costo estimado de materiales</span><b>${m$(t)}</b></div>` : ''; }
function agregar(k){ const L = LAST[k]; if (!L || !L.items.some(x => x.q > 0)){ toast('No hay cantidades para agregar.', true); return; }
  S.lista.push({id:uid(), desc:L.desc, items:L.items.filter(x => x.q > 0).map(x => ({mat:x.mat, und:x.und, q:x.q, d:x.d}))}); save(); renderLista(); toast('Agregado a la lista de materiales ('+S.lista.length+(S.lista.length===1?' partida)':' partidas)')); }
$('#lst-conc').onclick = () => agregar('conc'); $('#lst-muro').onclick = () => agregar('muro'); $('#lst-acero').onclick = () => agregar('acero'); $('#lst-exc').onclick = () => agregar('exc');
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
$('#obra').value = S.obra || ''; $('#obra').oninput = e => { S.obra = e.target.value; save(); };
function totalesLista(){ const T = {}; S.lista.forEach(p => p.items.forEach(x => { const k = x.mat+'|'+x.und; T[k] = T[k] || {mat:x.mat, und:x.und, q:0, d:x.d}; T[k].q += x.q; }));
  return Object.values(T).map(x => ({...x, q: x.und === 'bultos' || x.und === 'und' || x.und === 'viajes' ? Math.ceil(x.q) : x.q, pu:precio(x.mat)})).map(x => ({...x, v:x.q * x.pu})); }
function tablaTot(T){ const tot = T.reduce((a,x) => a + x.v, 0);
  return `<table class="t"><thead><tr><th>Material</th><th class="r">Cantidad</th><th>Unidad</th><th class="r">Precio unitario</th><th class="r">Total</th></tr></thead><tbody>
    ${T.map(x => `<tr><td><b>${esc(x.mat)}</b></td><td class="r">${f2(x.q, x.d ?? 2)}</td><td>${x.und}</td><td class="r">${x.pu?m$(x.pu):'<span class="muted">Sin precio</span>'}</td><td class="r">${x.v?m$(x.v):''}</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="4">Total estimado</td><td class="r">${m$(tot)}</td></tr></tfoot></table>`; }
function renderLista(){
  if (!S.lista.length){ $('#lista').innerHTML = `<div class="empty"><strong>La lista está vacía</strong>Calcula en cualquier pestaña y toca «Agregar a la lista de materiales».</div>`; return; }
  const T = totalesLista(), sinP = T.filter(x => !x.pu && x.und !== 'litros').length;
  $('#lista').innerHTML = `<h3 style="margin-bottom:8px">Partidas</h3><div class="table-wrap" style="margin-bottom:18px"><table class="t"><tbody>
    ${S.lista.map(p => `<tr><td><b>${esc(p.desc)}</b><div class="small muted">${p.items.map(x => `${esc(x.mat)}: ${f2(x.q, x.d ?? 2)} ${x.und}`).join(', ')}</div></td><td class="r"><button class="btn ghost sm icon" data-del="${p.id}" aria-label="Quitar partida">${I.trash}</button></td></tr>`).join('')}</tbody></table></div>
    <h3 style="margin-bottom:8px">Totales por material</h3><div class="table-wrap">${tablaTot(T)}</div>
    ${sinP?`<p class="hint" style="margin-top:8px">${sinP} materiales sin precio. Complétalos en la pestaña «Precios».</p>`:''}`;
  $$('#lista [data-del]').forEach(b => b.onclick = () => { S.lista = S.lista.filter(p => p.id !== b.dataset.del); save(); renderLista(); });
}
$('#btn-vaciar').onclick = async () => { if (!S.lista.length) return; if (!(await confirmar('¿Vaciar la lista de materiales?'))) return; S.lista = []; save(); renderLista(); };
$('#btn-print').onclick = () => { if (!S.lista.length){ toast('La lista está vacía.', true); return; }
  imprimirDoc('Lista de materiales', `${S.obra?`<h2 style="margin-top:0">${esc(S.obra)}</h2>`:''}<h2>Partidas</h2><table><tbody>${S.lista.map(p => `<tr><td><b>${esc(p.desc)}</b><br><small>${p.items.map(x => `${esc(x.mat)}: ${f2(x.q, x.d ?? 2)} ${x.und}`).join(', ')}</small></td></tr>`).join('')}</tbody></table>
    <h2>Totales por material</h2>${tablaTot(totalesLista())}<p class="sub">Cantidades estimadas con dosificaciones de referencia. Verifícalas con el diseño y las especificaciones de la obra.</p>`, fechaLarga(today())); };
$('#btn-csv').onclick = () => { csv('materiales-'+(S.obra||'obra').toLowerCase().replace(/[^a-z0-9]+/g,'-'), [['Material','Cantidad','Unidad','Precio unitario','Total'], ...totalesLista().map(x => [x.mat, fmt(x.q, x.d ?? 2), x.und, fmt(x.pu), fmt(x.v)])]); };
function renderPrecios(){
  const mats = [...MATS_BASE]; S.lista.forEach(p => p.items.forEach(x => { if (!mats.some(m => m[0] === x.mat)) mats.push([x.mat, x.und]); }));
  $('#precios').innerHTML = `<label class="field"><span>Peso del bulto de cemento</span><div class="input-group"><input class="input num" id="pr-bulto" inputmode="decimal"><span class="addon">kg</span></div><small class="hint">Colombia: 50 kg. Venezuela: 42,5 kg.</small></label>`
    + mats.filter(m => m[1] !== 'litros').map(([n,u]) => `<label class="field"><span>${esc(n)}</span><div class="input-group"><input class="input num" data-pm="${esc(n)}" inputmode="decimal"><span class="addon">por ${u==='bultos'?'bulto':u==='viajes'?'viaje':u}</span></div></label>`).join('');
  bindNum($('#pr-bulto'), S.bulto, v => { S.bulto = v || 50; save(); calcConc(); calcMuro(); }, 1);
  $$('#precios [data-pm]').forEach(i => { i.dataset.blank0 = ''; bindNum(i, S.precios[i.dataset.pm] || 0, v => { S.precios[i.dataset.pm] = v; save(); }); });
}

function renderAll(){ renderEl(); bindMuroOnce(); calcMuro(); renderAcero(); calcCim(); calcExc(); renderLista(); renderPrecios(); }
let muroOk = false; function bindMuroOnce(){ if (!muroOk){ muroOk = true; bindMuro(); } }
tabs(id => { if (id === 'conc') calcConc(); if (id === 'muro') calcMuro(); if (id === 'acero') calcAcero(); if (id === 'exc') calcExc(); if (id === 'lista') renderLista(); if (id === 'precios') renderPrecios(); });
renderAll(); save();
document.addEventListener('ma:negocio', renderAll);
})();

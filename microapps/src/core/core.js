/* ===== Microapps José Lugo — núcleo compartido ===== */
(function(){
'use strict';
const CFG = window.MA_APP || {id:'app',name:'Microapp'};
const PREFIX = 'ma:' + CFG.id + ':';
const AUTOR = {nombre:'José Lugo', tel:'+57 312 638 7467', telRaw:'573126387467', email:'jose.lugocdv@gmail.com'};

/* ---------- Iconos ---------- */
const I = {
  more:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>',
  store:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0"/><path d="M10 20v-5h4v5"/></svg>',
  down:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M4 19h16"/></svg>',
  print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  install:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 8v6M9 11l3 3 3-3"/></svg>',
  grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  csv:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h8"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>'
};

/* ---------- Utilidades ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const pad = n => String(n).padStart(2,'0');
const today = () => { const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const monthKey = (iso) => (iso||today()).slice(0,7);
const round = (n, d=2) => { const f=Math.pow(10,d); return Math.round((+n||0)*f)/f; };

/* Convierte "1.500.000,50", "1,500,000.50", "1500000.5" o "1.500" en número */
function num(v){
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').trim().replace(/\s|\$|[A-Za-z]/g,'');
  if (!s) return 0;
  const neg = /^-/.test(s) || /^\(.*\)$/.test(s); s = s.replace(/[-()]/g,'');
  const hasDot = s.includes('.'), hasCom = s.includes(',');
  if (hasDot && hasCom){
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',', '.');
    else s = s.replace(/,/g,'');
  } else if (hasCom){
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length !== 3) s = parts[0] + '.' + parts[1];
    else s = s.replace(/,/g,'');
  } else if (hasDot){
    const parts = s.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0')) s = s.replace(/\./g,'');
  }
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
}

/* ---------- Monedas ---------- */
const MONEDAS = {
  COP:{n:'Peso colombiano', s:'$', d:0, loc:'es-CO'},
  USD:{n:'Dólar estadounidense', s:'US$', d:2, loc:'es-CO'},
  VES:{n:'Bolívar venezolano', s:'Bs', d:2, loc:'es-VE'},
  EUR:{n:'Euro', s:'€', d:2, loc:'es-ES'},
  MXN:{n:'Peso mexicano', s:'MX$', d:2, loc:'es-MX'},
  PEN:{n:'Sol peruano', s:'S/', d:2, loc:'es-PE'},
  CLP:{n:'Peso chileno', s:'CLP$', d:0, loc:'es-CL'},
  ARS:{n:'Peso argentino', s:'AR$', d:2, loc:'es-AR'},
  DOP:{n:'Peso dominicano', s:'RD$', d:2, loc:'es-DO'},
  GTQ:{n:'Quetzal', s:'Q', d:2, loc:'es-GT'},
  BOB:{n:'Boliviano', s:'Bs.', d:2, loc:'es-BO'}
};
function money(n, cur){
  cur = cur || negocio().moneda || 'COP';
  const m = MONEDAS[cur] || {s:cur+' ', d:2};
  const v = +n || 0;
  const s = Math.abs(v).toLocaleString('es-CO', {minimumFractionDigits:m.d, maximumFractionDigits:m.d});
  return (v < 0 ? '-' : '') + m.s + (m.s.length>1 && /[A-Za-z.]$/.test(m.s) ? ' ' : '') + s;
}
function moneyK(n, cur){
  const m = MONEDAS[cur || negocio().moneda || 'COP'] || {s:''}; const v = Math.abs(+n||0); const sg = n < 0 ? '-' : '';
  const s = v >= 1e9 ? fmt(v/1e9,1)+' mil M' : v >= 1e6 ? fmt(v/1e6,1)+' M' : v >= 1e3 ? fmt(v/1e3,1)+' k' : fmt(v,0);
  return sg + m.s + s;
}
/* Campo numérico: acepta puntos y comas, muestra el número formateado al salir del campo */
function bindNum(el, value, onChange, dec=2){
  if (!el) return;
  const show = v => { el.value = (v === '' || v == null || (v === 0 && el.dataset.blank0 !== undefined)) ? '' : fmt(v, dec); };
  show(value);
  el.addEventListener('input', () => onChange(el.value.trim() === '' ? 0 : num(el.value)));
  el.addEventListener('blur', () => show(el.value.trim() === '' ? '' : num(el.value)));
  el.addEventListener('focus', () => { setTimeout(() => { try { el.select(); } catch(e){} }, 0); });
}
function fmt(n, d=2){ return (+n||0).toLocaleString('es-CO',{minimumFractionDigits:0, maximumFractionDigits:d}); }
function pct(n, d=1){ return (isFinite(n) ? (+n||0) : 0).toLocaleString('es-CO',{minimumFractionDigits:0, maximumFractionDigits:d}) + '%'; }
function monedaOptions(sel){ return Object.entries(MONEDAS).map(([k,v]) => `<option value="${k}" ${k===sel?'selected':''}>${k} (${v.n})</option>`).join(''); }
function fechaLarga(iso){ if(!iso) return ''; const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d).toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'}); }
function fechaCorta(iso){ if(!iso) return ''; const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; }
function mesNombre(key){ const [y,m]=key.split('-').map(Number); const s=new Date(y,m-1,1).toLocaleDateString('es-CO',{month:'long',year:'numeric'}); return s.charAt(0).toUpperCase()+s.slice(1); }

/* ---------- Almacenamiento ---------- */
const store = {
  get(k, def){ try { const v = localStorage.getItem(PREFIX+k); return v == null ? def : JSON.parse(v); } catch(e){ return def; } },
  set(k, v){ try { localStorage.setItem(PREFIX+k, JSON.stringify(v)); return true; } catch(e){ toast('No se pudo guardar: el almacenamiento del navegador está lleno o bloqueado.', true); return false; } },
  del(k){ try { localStorage.removeItem(PREFIX+k); } catch(e){} },
  keys(){ try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)); } catch(e){ return []; } }
};
/* Perfil del negocio: compartido entre todas las microapps */
const NEG_KEY = 'ma:negocio';
function negocio(){ try { return Object.assign({nombre:'',doc:'',tel:'',email:'',dir:'',ciudad:'',moneda:'COP',logo:''}, JSON.parse(localStorage.getItem(NEG_KEY)||'{}')); } catch(e){ return {moneda:'COP'}; } }
function setNegocio(o){ try { localStorage.setItem(NEG_KEY, JSON.stringify(o)); } catch(e){ toast('No se pudo guardar el logo: prueba con una imagen más liviana.', true); } }

/* ---------- Avisos y diálogos ---------- */
function toast(msg, err){
  let box = $('.toasts'); if(!box){ box = document.createElement('div'); box.className='toasts'; box.setAttribute('role','status'); document.body.appendChild(box); }
  const t = document.createElement('div'); t.className = 'toast' + (err?' err':''); t.textContent = msg; box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function dialog({title, body, actions=[], wide=false, onOpen}){
  const d = document.createElement('dialog'); d.className = 'dlg' + (wide?' wide':'');
  d.innerHTML = `<div class="dlg-head"><h3>${esc(title)}</h3><button class="btn ghost sm icon" data-x aria-label="Cerrar">${I.x}</button></div>
    <div class="dlg-body">${body}</div>${actions.length?'<div class="dlg-foot"></div>':''}`;
  const foot = $('.dlg-foot', d);
  actions.forEach(a => { const b=document.createElement('button'); b.className='btn '+(a.cls||''); b.textContent=a.label;
    b.onclick = async () => { const r = a.onClick ? await a.onClick(d) : true; if (r !== false) close(); }; foot.appendChild(b); });
  function close(){ d.close(); d.remove(); }
  $('[data-x]', d).onclick = close;
  d.addEventListener('cancel', e => { e.preventDefault(); close(); });
  document.body.appendChild(d); d.showModal(); if(onOpen) onOpen(d);
  return {el:d, close};
}
function confirmar(msg, okLabel='Eliminar', danger=true){
  return new Promise(res => {
    dialog({title:'Confirmar', body:`<p>${esc(msg)}</p>`, actions:[
      {label:'Cancelar', cls:'ghost', onClick:()=>{res(false);}},
      {label:okLabel, cls: danger?'primary':'primary', onClick:()=>{res(true);}}
    ]});
  });
}

/* ---------- Archivos ---------- */
function download(name, content, mime='text/plain'){
  const blob = content instanceof Blob ? content : new Blob([content], {type:mime+';charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href); a.remove();}, 500);
}
function csv(name, rows){
  const body = rows.map(r => r.map(c => { const s = String(c ?? ''); return /[";\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; }).join(';')).join('\r\n');
  download(name.endsWith('.csv')?name:name+'.csv', '﻿'+body, 'text/csv');
}
function copiar(texto){
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto).then(()=>toast('Copiado'),()=>fallback());
  fallback();
  function fallback(){ const t=document.createElement('textarea'); t.value=texto; document.body.appendChild(t); t.select(); try{document.execCommand('copy'); toast('Copiado');}catch(e){toast('No se pudo copiar',true);} t.remove(); }
}
function whatsapp(texto, tel){ const n = String(tel||'').replace(/\D/g,''); window.open('https://wa.me/'+(n||'')+'?text='+encodeURIComponent(texto), '_blank', 'noopener'); }

function backup(){
  const data = {app:CFG.id, nombre:CFG.name, fecha:new Date().toISOString(), negocio:negocio(), datos:{}};
  store.keys().forEach(k => { try { data.datos[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k)); } catch(e){} });
  download(CFG.id+'-respaldo-'+today()+'.json', JSON.stringify(data, null, 1), 'application/json');
  toast('Copia de seguridad descargada');
}
function restaurar(){
  const inp = document.createElement('input'); inp.type='file'; inp.accept='.json,application/json';
  inp.onchange = () => { const f = inp.files[0]; if(!f) return; const rd = new FileReader();
    rd.onload = async () => { try {
        const data = JSON.parse(rd.result);
        if (data.app !== CFG.id) { toast('Este archivo es de otra app ('+(data.nombre||data.app)+').', true); return; }
        if (!(await confirmar('Se reemplazarán los datos actuales de esta app por los del respaldo del '+fechaCorta((data.fecha||'').slice(0,10))+'.', 'Restaurar', false))) return;
        store.keys().forEach(k => localStorage.removeItem(k));
        Object.entries(data.datos||{}).forEach(([k,v]) => store.set(k, v));
        if (data.negocio && data.negocio.nombre && !negocio().nombre) setNegocio(data.negocio);
        toast('Datos restaurados'); setTimeout(()=>location.reload(), 600);
      } catch(e){ toast('El archivo no es un respaldo válido.', true); } };
    rd.readAsText(f); };
  inp.click();
}

/* ---------- Perfil del negocio ---------- */
function editarNegocio(){
  const n = negocio();
  const body = `<p class="muted small" style="margin-bottom:14px">Estos datos aparecen en tus documentos e impresiones. Se comparten con todas las microapps de este dispositivo.</p>
  <div class="row" style="align-items:center;margin-bottom:14px">
    <div class="logo-prev" id="ma-logo-prev">${n.logo?`<img src="${n.logo}" alt="Logo">`:'Sin logo'}</div>
    <div class="stack" style="gap:6px"><label class="btn sm">Subir logo<input type="file" accept="image/*" id="ma-logo" hidden></label>
    <button class="btn ghost sm" id="ma-logo-del" type="button">Quitar logo</button></div>
  </div>
  <div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Nombre del negocio</span><input class="input" id="ma-n" value="${esc(n.nombre)}" placeholder="Ej: Distribuidora La Estrella"></label>
    <label class="field"><span>NIT / RIF / Documento</span><input class="input" id="ma-d" value="${esc(n.doc)}"></label>
    <label class="field"><span>Teléfono / WhatsApp</span><input class="input" id="ma-t" value="${esc(n.tel)}" inputmode="tel"></label>
    <label class="field"><span>Correo</span><input class="input" id="ma-e" value="${esc(n.email)}" type="email"></label>
    <label class="field"><span>Ciudad</span><input class="input" id="ma-c" value="${esc(n.ciudad)}"></label>
    <label class="field" style="grid-column:1/-1"><span>Dirección</span><input class="input" id="ma-a" value="${esc(n.dir)}"></label>
    <label class="field" style="grid-column:1/-1"><span>Moneda principal</span><select class="input" id="ma-m">${monedaOptions(n.moneda)}</select></label>
  </div>`;
  let logo = n.logo;
  dialog({title:'Datos del negocio', body, actions:[
    {label:'Cancelar', cls:'ghost'},
    {label:'Guardar datos', cls:'primary', onClick:(d)=>{
      setNegocio({nombre:$('#ma-n',d).value.trim(), doc:$('#ma-d',d).value.trim(), tel:$('#ma-t',d).value.trim(), email:$('#ma-e',d).value.trim(),
        ciudad:$('#ma-c',d).value.trim(), dir:$('#ma-a',d).value.trim(), moneda:$('#ma-m',d).value, logo});
      toast('Datos del negocio guardados'); document.dispatchEvent(new CustomEvent('ma:negocio')); renderPrintHead();
    }}
  ], onOpen:(d)=>{
    $('#ma-logo',d).onchange = e => { const f=e.target.files[0]; if(!f) return; const rd=new FileReader();
      rd.onload = () => { const img = new Image(); img.onload = () => { const max=320, k=Math.min(1,max/Math.max(img.width,img.height));
        const c=document.createElement('canvas'); c.width=Math.round(img.width*k); c.height=Math.round(img.height*k);
        c.getContext('2d').drawImage(img,0,0,c.width,c.height); logo=c.toDataURL('image/png');
        $('#ma-logo-prev',d).innerHTML=`<img src="${logo}" alt="Logo">`; }; img.src=rd.result; }; rd.readAsDataURL(f); };
    $('#ma-logo-del',d).onclick = () => { logo=''; $('#ma-logo-prev',d).textContent='Sin logo'; };
  }});
}

/* ---------- Tema ---------- */
function aplicarTema(){ const t = localStorage.getItem('ma:tema'); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; }
function alternarTema(){
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  try { localStorage.setItem('ma:tema', dark ? 'light' : 'dark'); } catch(e){}
  aplicarTema();
}

/* ---------- Pestañas ---------- */
function tabs(onChange){
  const btns = $$('.tab[data-tab]');
  const sel = (id, save=true) => {
    btns.forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id ? 'true':'false'));
    $$('.panel[data-panel]').forEach(p => p.hidden = p.dataset.panel !== id);
    if (save) store.set('_tab', id);
    if (onChange) onChange(id);
  };
  btns.forEach(b => b.addEventListener('click', () => sel(b.dataset.tab)));
  const saved = store.get('_tab'); const first = btns[0] && btns[0].dataset.tab;
  sel(btns.some(b => b.dataset.tab === saved) ? saved : first, false);
  return sel;
}

/* ---------- Instalación PWA ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function instalar(){
  if (deferredPrompt){ deferredPrompt.prompt(); deferredPrompt = null; return; }
  dialog({title:'Instalar en tu dispositivo', body:`<div class="stack small">
    <p><b>Android (Chrome):</b> abre el menú ⋮ y elige «Instalar aplicación» o «Agregar a la pantalla principal».</p>
    <p><b>iPhone (Safari):</b> toca el botón Compartir y luego «Agregar a inicio».</p>
    <p><b>Computador:</b> en Chrome o Edge, usa el ícono de instalar en la barra de direcciones.</p>
    <p class="muted">Una vez instalada funciona sin internet.</p></div>`, actions:[{label:'Entendido', cls:'primary'}]});
}

/* ---------- Encabezado de impresión ---------- */
function renderPrintHead(){
  const ph = $('#ma-print-head'); if(!ph) return; const n = negocio();
  ph.innerHTML = `<div style="display:flex;gap:14px;align-items:center;border-bottom:2px solid #222;padding-bottom:10px;margin-bottom:14px">
    ${n.logo?`<img src="${n.logo}" style="width:58px;height:58px;object-fit:contain">`:''}
    <div style="flex:1"><div style="font-size:15pt;font-weight:700">${esc(n.nombre||CFG.name)}</div>
    <div style="font-size:9pt;color:#444">${[n.doc, n.tel, n.email, [n.dir,n.ciudad].filter(Boolean).join(', ')].filter(Boolean).map(esc).join('  |  ')}</div></div>
    <div style="text-align:right;font-size:9pt;color:#444"><div style="font-weight:700;color:#000">${esc(CFG.name)}</div>${fechaLarga(today())}</div></div>`;
}

/* ---------- Montaje de la interfaz común ---------- */
function montar(){
  aplicarTema();
  // menú
  const bar = $('.app-bar-in');
  if (bar){
    const btn = document.createElement('button'); btn.className='btn ghost icon'; btn.setAttribute('aria-label','Más opciones'); btn.setAttribute('aria-haspopup','true'); btn.innerHTML = I.more;
    const menu = document.createElement('div'); menu.className='menu'; menu.hidden = true; menu.setAttribute('role','menu');
    menu.innerHTML = `<button data-a="neg">${I.store}Datos del negocio</button>
      <button data-a="print">${I.print}Imprimir o guardar PDF</button>
      <hr><button data-a="bk">${I.down}Descargar copia de seguridad</button>
      <button data-a="rs">${I.up}Restaurar copia de seguridad</button>
      <hr><button data-a="inst">${I.install}Instalar en el dispositivo</button>
      <button data-a="tema">${I.moon}Cambiar modo claro / oscuro</button>
      <a href="../">${I.grid}Ver todas las microapps</a>`;
    bar.appendChild(btn); document.querySelector('.app-bar').appendChild(menu);
    btn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    document.addEventListener('click', e => { if(!menu.contains(e.target)) menu.hidden = true; });
    document.addEventListener('keydown', e => { if(e.key==='Escape') menu.hidden = true; });
    menu.onclick = e => { const a = e.target.closest('[data-a]'); if(!a) return; menu.hidden = true;
      ({neg:editarNegocio, print:()=>window.print(), bk:backup, rs:restaurar, inst:instalar, tema:alternarTema})[a.dataset.a](); };
  }
  // encabezado de impresión
  const main = $('.app-main');
  if (main && !$('#ma-print-head')){ const ph=document.createElement('div'); ph.id='ma-print-head'; ph.className='print-only'; main.prepend(ph); }
  renderPrintHead();
  // firma
  const f = $('#firma');
  if (f){
    f.className = 'firma';
    f.innerHTML = `<div class="firma-in">
      <div class="firma-id"><div class="firma-mono" aria-hidden="true">JL</div>
        <div class="firma-txt"><small>Diseño y desarrollo</small><strong>${AUTOR.nombre}</strong><em>Soluciones digitales para emprendedores y empresas</em></div></div>
      <p class="firma-legal">© ${new Date().getFullYear()} ${AUTOR.nombre}. Todos los derechos reservados.<br>Tus datos se guardan solo en este dispositivo.</p>
      <div class="firma-links">
        <a class="wa" href="https://wa.me/${AUTOR.telRaw}?text=${encodeURIComponent('Hola José, vi tu app «'+CFG.name+'» y quiero más información.')}" target="_blank" rel="noopener">${I.wa}${AUTOR.tel}</a>
        <a href="mailto:${AUTOR.email}?subject=${encodeURIComponent('Microapp '+CFG.name)}">${I.mail}${AUTOR.email}</a>
      </div></div>`;
    const ps = document.createElement('div'); ps.className = 'print-only print-sign';
    ps.textContent = `Generado con ${CFG.name}, desarrollada por ${AUTOR.nombre}. WhatsApp ${AUTOR.tel}, ${AUTOR.email}`;
    main && main.appendChild(ps);
  }
  // service worker
  if (CFG.id !== 'hub' && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

window.MA = {CFG, AUTOR, I, $, $$, esc, uid, today, monthKey, round, num, money, moneyK, bindNum, fmt, pct, MONEDAS, monedaOptions, fechaLarga, fechaCorta, mesNombre,
  store, negocio, setNegocio, toast, dialog, confirmar, download, csv, copiar, whatsapp, backup, restaurar, editarNegocio, tabs, montar, renderPrintHead};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();

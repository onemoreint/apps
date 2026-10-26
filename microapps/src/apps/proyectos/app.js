(function(){
const {$, $$, esc, uid, num, fmt, pct, bindNum, store, toast, confirmar, dialog, tabs, I, today, fechaCorta, fechaLarga, csv, imprimirDoc} = MA;

const EST = [{k:'todo', n:'Por hacer', c:'#7B8794'}, {k:'doing', n:'En curso', c:'#3B6FD8'}, {k:'review', n:'En revisión', c:'#D08A12'}, {k:'done', n:'Hecho', c:'#1E8E5A'}];
const PRIO = {alta:'Alta', media:'Media', baja:'Baja'};
const D0 = s => new Date(s+'T12:00');
const iso = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addD = (s, n) => { const d = D0(s); d.setDate(d.getDate()+n); return iso(d); };
const diff = (a, b) => Math.round((D0(b) - D0(a)) / 864e5);
const dur = t => Math.max(1, diff(t.ini, t.fin) + 1);

/* ---------- Plantillas (de la colección de Gantt en Excel) ---------- */
const PLANT = {
  rest:{n:'Apertura de restaurante en 90 días', t:[
    ['Planeación','Definir concepto, público y menú',0,10],['Planeación','Plan de negocio y presupuesto',5,10],['Planeación','Búsqueda y negociación del local',10,15,1],
    ['Legal','Registro mercantil y RUT',15,10],['Legal','Permisos sanitarios y de bomberos',25,20,3],
    ['Adecuación','Diseño y remodelación del local',30,30,2],['Adecuación','Compra e instalación de equipos de cocina',40,20],['Adecuación','Proveedores de insumos',45,15],
    ['Personal','Selección y contratación del equipo',55,15],['Personal','Capacitación y manuales',70,10,8],
    ['Mercadeo','Identidad de marca y redes sociales',40,30],['Mercadeo','Pruebas de menú y fotos',72,8],
    ['Apertura','Apertura suave con invitados',84,3],['Apertura','Inauguración',89,1,12,1]]},
  prod:{n:'Lanzamiento de producto', t:[
    ['Investigación','Investigación de mercado y competencia',0,10],['Investigación','Definir propuesta de valor y precio',8,7,0],
    ['Desarrollo','Prototipo o muestra',14,14,1],['Desarrollo','Pruebas con clientes',28,7,2],['Desarrollo','Ajustes finales y empaque',35,10,3],
    ['Comercial','Plan de ventas y canales',20,10],['Comercial','Contenido y campaña de prelanzamiento',38,14],['Comercial','Capacitación del equipo comercial',45,5],
    ['Lanzamiento','Lanzamiento',52,1,6,1],['Lanzamiento','Seguimiento de ventas del primer mes',53,30]]},
  mkt:{n:'Campaña de marketing de 30 días', t:[
    ['Estrategia','Objetivos, público y presupuesto',0,3],['Estrategia','Mensaje y oferta',3,3,0],
    ['Contenido','Calendario de publicaciones',5,3],['Contenido','Diseño de piezas gráficas',7,6,2],['Contenido','Grabación de videos',8,6,2],
    ['Pauta','Configurar anuncios',13,2,3],['Pauta','Campaña activa',15,14,5],['Pauta','Optimización semanal',18,10],
    ['Cierre','Informe de resultados',29,2,6,0]]},
  evento:{n:'Organización de evento', t:[
    ['Planeación','Objetivo, fecha y presupuesto',0,5],['Planeación','Lista de invitados',5,7],['Logística','Reserva del lugar',5,10],
    ['Logística','Proveedores: catering, sonido, decoración',12,14,2],['Logística','Invitaciones y confirmaciones',18,14,1],
    ['Programa','Agenda y conferencistas',10,15],['Programa','Material impreso y regalos',28,10],['Ejecución','Montaje',43,1],['Ejecución','Día del evento',44,1,7,1],['Cierre','Agradecimientos y balance',46,4]]},
  obra:{n:'Remodelación de local o vivienda', t:[
    ['Preliminares','Levantamiento y diseño',0,7],['Preliminares','Presupuesto y aprobación',7,5,0],['Preliminares','Permisos',12,10,1],
    ['Obra gris','Demoliciones y retiro de escombros',22,5,2],['Obra gris','Instalaciones hidráulicas y eléctricas',27,10,3],['Obra gris','Muros, pañetes y nivelación',32,10],
    ['Acabados','Pisos y enchapes',42,8,5],['Acabados','Pintura',48,6],['Acabados','Carpintería y aparatos',50,6],['Entrega','Aseo final y entrega',56,3],['Entrega','Entrega al cliente',59,1,9,1]]},
  rrhh:{n:'Contratación de personal', t:[
    ['Perfil','Definir perfil y salario',0,3],['Convocatoria','Publicar vacante',3,10,0],['Selección','Filtro de hojas de vida',8,5],
    ['Selección','Entrevistas',12,6,2],['Selección','Pruebas y referencias',17,4,3],['Contratación','Oferta y contrato',21,3,4],
    ['Contratación','Afiliaciones a seguridad social',23,2],['Ingreso','Inducción',25,5,5],['Ingreso','Primer día',25,1,5,1]]},
  blank:{n:'Proyecto en blanco', t:[]}
};
function desdePlantilla(k, nombre, inicio, resp){
  const P = PLANT[k], tareas = P.t.map(x => ({id:uid(), fase:x[0], n:x[1], ini:addD(inicio, x[2]), fin:addD(inicio, x[2] + x[3] - 1), resp:resp||'', prog:0, est:'todo', prio:'media', dep:'', hito:!!x[5], notas:''}));
  P.t.forEach((x,i) => { if (x[4] !== undefined) tareas[i].dep = tareas[x[4]].id; });
  return {id:uid(), n:nombre || P.n, cliente:'', resp:resp||'', inicio, tareas};
}

/* ---------- Estado ---------- */
let S = store.get('estado', null);
if (!S){
  const ini = addD(today(), -35); const p = desdePlantilla('rest', 'Apertura de Lorenz Express', ini, 'José');
  const resps = ['José','María','Carlos','Ana']; const hoy = today();
  p.tareas.forEach((t,i) => { t.resp = resps[i % 4]; if (t.fin < hoy){ t.est = i === 4 ? 'doing' : 'done'; t.prog = i === 4 ? 60 : 100; } else if (t.ini <= hoy){ t.est = 'doing'; t.prog = Math.min(90, Math.round(diff(t.ini, hoy) / dur(t) * 100)); } });
  p.tareas[0].prio = 'alta'; p.tareas[4].prio = 'alta'; p.cliente = 'Lorenz Express, Maracay';
  S = {proys:[p], sel:p.id, zoom:'d'};
}
const save = () => store.set('estado', S);
const P = () => S.proys.find(p => p.id === S.sel) || S.proys[0];
const tarea = id => P().tareas.find(t => t.id === id);
const atrasada = t => t.est !== 'done' && t.fin < today();
const ordenadas = () => [...P().tareas].sort((a,b) => a.ini.localeCompare(b.ini) || a.fin.localeCompare(b.fin));
function avance(p){ const ts = p.tareas.filter(t => !t.hito); const tot = ts.reduce((a,t) => a + dur(t), 0); return tot ? ts.reduce((a,t) => a + dur(t) * (t.est === 'done' ? 100 : +t.prog||0), 0) / tot : 0; }
function rango(p){ if (!p.tareas.length) return {ini:p.inicio || today(), fin:addD(p.inicio || today(), 30)}; return {ini:p.tareas.reduce((a,t) => t.ini < a ? t.ini : a, p.tareas[0].ini), fin:p.tareas.reduce((a,t) => t.fin > a ? t.fin : a, p.tareas[0].fin)}; }

/* ---------- Proyecto ---------- */
$('#btn-nuevo').innerHTML = I.plus + 'Nuevo proyecto';
$('#btn-csv').innerHTML = I.csv + 'Exportar (CSV)'; $('#btn-print').innerHTML = I.print + 'Imprimir';
$('#btn-tarea').innerHTML = I.plus + 'Nueva tarea';
$('#sel-proy').onchange = e => { S.sel = e.target.value; save(); renderAll(); };
function renderProy(){
  $('#sel-proy').innerHTML = S.proys.map(p => `<option value="${p.id}" ${p.id===S.sel?'selected':''}>${esc(p.n)}</option>`).join('');
  const p = P(); if (!p){ $('#proy-meta').innerHTML = ''; return; } S.sel = p.id;
  const r = rango(p), av = avance(p), at = p.tareas.filter(atrasada).length;
  $('#proy-meta').innerHTML = `${p.cliente?`<span>Cliente: <b>${esc(p.cliente)}</b></span>`:''}${p.resp?`<span>Responsable: <b>${esc(p.resp)}</b></span>`:''}
    <span>Del <b>${fechaCorta(r.ini)}</b> al <b>${fechaCorta(r.fin)}</b> (${diff(r.ini, r.fin)+1} días)</span><span>Avance: <b>${pct(av,0)}</b></span>
    <span>${p.tareas.length} tareas${at?`, <b class="neg">${at} atrasadas</b>`:''}</span>`;
}
$('#btn-nuevo').onclick = () => {
  dialog({title:'Nuevo proyecto', body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Empezar desde</span><select class="input" id="np-t">${Object.entries(PLANT).map(([k,v]) => `<option value="${k}">${esc(v.n)}${v.t.length?' ('+v.t.length+' tareas)':''}</option>`).join('')}</select></label>
    <label class="field" style="grid-column:1/-1"><span>Nombre del proyecto</span><input class="input" id="np-n"></label>
    <label class="field"><span>Fecha de inicio</span><input class="input" type="date" id="np-i" value="${today()}"></label>
    <label class="field"><span>Responsable</span><input class="input" id="np-r"></label>
    <label class="field" style="grid-column:1/-1"><span>Cliente</span><input class="input" id="np-c" placeholder="Opcional"></label></div>
    <p class="hint" style="margin-top:10px">Las plantillas traen fases, tareas, duraciones y dependencias típicas. Luego puedes cambiarlo todo.</p>`,
    actions:[{label:'Cancelar', cls:'ghost'},{label:'Crear proyecto', cls:'primary', onClick:(d)=>{
      const k = $('#np-t',d).value, p = desdePlantilla(k, $('#np-n',d).value.trim() || PLANT[k].n, $('#np-i',d).value || today(), $('#np-r',d).value.trim());
      p.cliente = $('#np-c',d).value.trim(); S.proys.push(p); S.sel = p.id; save(); renderAll(); toast('Proyecto creado con '+p.tareas.length+' tareas'); }}],
    onOpen: d => { const t = $('#np-t',d), n = $('#np-n',d); const f = () => { n.placeholder = PLANT[t.value].n; }; t.onchange = f; f(); }});
};
$('#btn-editp').onclick = () => { const p = P(); if (!p) return;
  dialog({title:'Editar proyecto', body:`<div class="fields"><label class="field" style="grid-column:1/-1"><span>Nombre</span><input class="input" id="ep-n" value="${esc(p.n)}"></label>
    <label class="field"><span>Cliente</span><input class="input" id="ep-c" value="${esc(p.cliente||'')}"></label><label class="field"><span>Responsable</span><input class="input" id="ep-r" value="${esc(p.resp||'')}"></label>
    <label class="field" style="grid-column:1/-1"><span>Mover todo el proyecto (días)</span><input class="input num" id="ep-m" inputmode="numeric" value="0"><small class="hint">Ejemplo: 7 corre todas las tareas una semana; -3 las adelanta tres días.</small></label></div>`,
    actions:[{label:'Eliminar proyecto', cls:'ghost danger', onClick:async ()=>{ if (!(await confirmar('¿Eliminar «'+p.n+'» y todas sus tareas?'))) return false; S.proys = S.proys.filter(x => x !== p); S.sel = S.proys[0] && S.proys[0].id; save(); renderAll(); }},
      {label:'Cancelar', cls:'ghost'},{label:'Guardar', cls:'primary', onClick:(d)=>{ p.n = $('#ep-n',d).value.trim() || p.n; p.cliente = $('#ep-c',d).value.trim(); p.resp = $('#ep-r',d).value.trim();
        const m = Math.round(num($('#ep-m',d).value)); if (m) p.tareas.forEach(t => { t.ini = addD(t.ini, m); t.fin = addD(t.fin, m); }); save(); renderAll(); toast(m?'Proyecto movido '+m+' días':'Proyecto actualizado'); }}]});
};

/* ---------- Editor de tarea ---------- */
function editar(t, est){
  const p = P(); if (!p){ toast('Crea un proyecto primero.', true); return; }
  const nuevo = !t; t = t || {id:uid(), n:'', fase:'', resp:p.resp||'', ini:today(), fin:addD(today(), 4), prog:0, est:est||'todo', prio:'media', dep:'', hito:false, notas:''};
  const resps = [...new Set(p.tareas.map(x => x.resp).filter(Boolean))], fases = [...new Set(p.tareas.map(x => x.fase).filter(Boolean))];
  dialog({title: nuevo?'Nueva tarea':'Editar tarea', wide:true, body:`<div class="fields">
    <label class="field" style="grid-column:1/-1"><span>Tarea</span><input class="input" id="t-n" value="${esc(t.n)}" placeholder="Ej: Comprar equipos de cocina"></label>
    <label class="field"><span>Fase</span><input class="input" id="t-f" value="${esc(t.fase||'')}" list="dl-f"><datalist id="dl-f">${fases.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="field"><span>Responsable</span><input class="input" id="t-r" value="${esc(t.resp||'')}" list="dl-r"><datalist id="dl-r">${resps.map(x => `<option value="${esc(x)}">`).join('')}</datalist></label>
    <label class="field"><span>Inicio</span><input class="input" type="date" id="t-i" value="${t.ini}"></label>
    <label class="field"><span>Fin</span><input class="input" type="date" id="t-e" value="${t.fin}"></label>
    <label class="field"><span>Estado</span><select class="input" id="t-s">${EST.map(e => `<option value="${e.k}" ${e.k===t.est?'selected':''}>${e.n}</option>`).join('')}</select></label>
    <label class="field"><span>Prioridad</span><select class="input" id="t-p">${Object.entries(PRIO).map(([k,v]) => `<option value="${k}" ${k===t.prio?'selected':''}>${v}</option>`).join('')}</select></label>
    <label class="field"><span>Avance: <b id="t-pv">${fmt(t.prog,0)}%</b></span><input type="range" id="t-g" min="0" max="100" step="5" value="${t.prog}" style="accent-color:var(--accent)"></label>
    <label class="field"><span>Depende de</span><select class="input" id="t-d"><option value="">Ninguna</option>${ordenadas().filter(x => x.id !== t.id).map(x => `<option value="${x.id}" ${x.id===t.dep?'selected':''}>${esc(x.n)} (termina ${fechaCorta(x.fin)})</option>`).join('')}</select></label>
    <label class="check" style="grid-column:1/-1"><input type="checkbox" id="t-h" ${t.hito?'checked':''}> Es un hito (una fecha clave, sin duración)</label>
    <label class="field" style="grid-column:1/-1"><span>Notas</span><textarea class="input" id="t-no" rows="2">${esc(t.notas||'')}</textarea></label></div>
    <p class="small muted" id="t-info" style="margin-top:8px"></p>`,
    actions:[...(nuevo?[]:[{label:'Eliminar', cls:'ghost danger', onClick:async ()=>{ if (!(await confirmar('¿Eliminar la tarea «'+t.n+'»?'))) return false; p.tareas = p.tareas.filter(x => x !== t); p.tareas.forEach(x => { if (x.dep === t.id) x.dep = ''; }); save(); renderAll(); }}]),
      {label:'Cancelar', cls:'ghost'},
      {label: nuevo?'Agregar tarea':'Guardar', cls:'primary', onClick:(d)=>{ const n = $('#t-n',d).value.trim(); if (!n){ toast('Escribe el nombre de la tarea.', true); return false; }
        let ini = $('#t-i',d).value || today(), fin = $('#t-e',d).value || ini; const hito = $('#t-h',d).checked; if (hito) fin = ini; if (fin < ini){ toast('La fecha de fin no puede ser anterior al inicio.', true); return false; }
        const est = $('#t-s',d).value; let prog = +$('#t-g',d).value; if (est === 'done') prog = 100; else if (prog === 100) prog = 90;
        Object.assign(t, {n, fase:$('#t-f',d).value.trim(), resp:$('#t-r',d).value.trim(), ini, fin, est, prio:$('#t-p',d).value, prog, dep:$('#t-d',d).value, hito, notas:$('#t-no',d).value.trim()});
        if (nuevo) p.tareas.push(t); save(); renderAll(); const dp = t.dep && tarea(t.dep);
        toast(dp && t.ini <= dp.fin ? 'Guardada. Ojo: empieza antes de que termine «'+dp.n+'».' : (nuevo?'Tarea agregada':'Tarea guardada')); }}],
    onOpen: d => { const info = () => { const i = $('#t-i',d).value, e = $('#t-e',d).value; $('#t-info',d).textContent = i && e && e >= i ? `Duración: ${diff(i,e)+1} días calendario.` : ''; };
      $('#t-g',d).oninput = e => $('#t-pv',d).textContent = e.target.value+'%'; $('#t-i',d).onchange = () => { if ($('#t-e',d).value < $('#t-i',d).value) $('#t-e',d).value = $('#t-i',d).value; info(); }; $('#t-e',d).onchange = info; info(); if (nuevo) $('#t-n',d).focus(); }});
}
$('#btn-tarea').onclick = () => editar();

/* ---------- Kanban ---------- */
function renderKanban(){
  const p = P(); if (!p){ $('#kanban').innerHTML = `<div class="empty" style="grid-column:1/-1"><strong>No hay proyectos</strong>Crea uno con «Nuevo proyecto».</div>`; return; }
  $('#kanban').innerHTML = EST.map((e,ei) => { const ts = p.tareas.filter(t => t.est === e.k).sort((a,b) => (({alta:0,media:1,baja:2})[a.prio]-({alta:0,media:1,baja:2})[b.prio]) || a.fin.localeCompare(b.fin));
    return `<div class="kcol" data-est="${e.k}"><div class="kcol-h"><h3><i style="background:${e.c}"></i>${e.n}</h3><span>${ts.length}</span></div><div class="kcards">
      ${ts.map(t => `<div class="kcard prio-${t.prio}" draggable="true" data-id="${t.id}" tabindex="0"><b>${t.hito?'◆ ':''}${esc(t.n)}</b>
        <div class="meta">${t.resp?`<span class="pill">${esc(t.resp)}</span>`:''}<span class="${atrasada(t)?'neg':''}">${atrasada(t)?'Venció '+fechaCorta(t.fin):'Hasta '+fechaCorta(t.fin)}</span>${t.fase?`<span>${esc(t.fase)}</span>`:''}</div>
        ${t.hito?'':`<div class="prog" title="Avance ${t.prog}%"><i style="width:${t.est==='done'?100:t.prog}%"></i></div>`}
        <div class="mv no-print">${ei>0?`<button type="button" data-mv="-1" aria-label="Mover a ${EST[ei-1].n}">‹ ${EST[ei-1].n}</button>`:'<span></span>'}${ei<EST.length-1?`<button type="button" data-mv="1" aria-label="Mover a ${EST[ei+1].n}">${EST[ei+1].n} ›</button>`:''}</div></div>`).join('')}
      </div><button class="kadd no-print" type="button" data-add="${e.k}">+ Agregar tarea</button></div>`; }).join('');
  $$('.kcard').forEach(c => {
    c.addEventListener('click', e => { if (e.target.closest('[data-mv]')) return; editar(tarea(c.dataset.id)); });
    c.addEventListener('keydown', e => { if (e.key === 'Enter') editar(tarea(c.dataset.id)); });
    c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.id); e.dataTransfer.effectAllowed = 'move'; c.classList.add('drag'); });
    c.addEventListener('dragend', () => c.classList.remove('drag'));
    c.querySelectorAll('[data-mv]').forEach(b => b.onclick = () => { const t = tarea(c.dataset.id), i = EST.findIndex(x => x.k === t.est) + (+b.dataset.mv); mover(t, EST[i].k); });
  });
  $$('.kcol').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); });
    col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('over'); });
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('over'); const t = tarea(e.dataTransfer.getData('text/plain')); if (t) mover(t, col.dataset.est); });
  });
  $$('[data-add]').forEach(b => b.onclick = () => editar(null, b.dataset.add));
}
function mover(t, est){ if (t.est === est) return; t.est = est; if (est === 'done') t.prog = 100; else if (t.prog === 100) t.prog = 90; else if (est === 'doing' && !t.prog) t.prog = 10;
  save(); renderAll(); toast('«'+t.n+'» pasó a '+EST.find(x => x.k === est).n.toLowerCase()); }

/* ---------- Gantt ---------- */
$$('#zoom button').forEach(b => b.onclick = () => { S.zoom = b.dataset.v; save(); renderGantt(); });
function renderGantt(){
  $$('#zoom button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === S.zoom));
  const p = P(); if (!p || !p.tareas.length){ $('#gantt').innerHTML = `<div class="empty" style="margin:12px"><strong>Sin tareas</strong>Agrega tareas para ver el cronograma.</div>`; return; }
  const r = rango(p); let ini = r.ini, fin = r.fin; const hoy = today();
  const sem = S.zoom === 'w';
  if (sem){ const d = D0(ini); d.setDate(d.getDate() - ((d.getDay()+6)%7)); ini = iso(d); }
  ini = addD(ini, sem ? 0 : -1); fin = addD(fin, sem ? 7 : 2);
  const nd = diff(ini, fin) + 1, colW = sem ? 56 : 30, pxd = sem ? colW / 7 : colW;
  const cols = sem ? Array.from({length:Math.ceil(nd/7)}, (_,i) => addD(ini, i*7)) : Array.from({length:nd}, (_,i) => addD(ini, i));
  const W = cols.length * colW;
  // encabezado de meses
  const meses = []; cols.forEach(c => { const k = c.slice(0,7); const last = meses[meses.length-1]; if (last && last.k === k) last.n++; else meses.push({k, n:1}); });
  const mesN = k => { const [y,m] = k.split('-').map(Number); return new Date(y,m-1,1).toLocaleDateString('es-CO',{month:'short', year:'2-digit'}).replace('.',''); };
  const bg = `background-image:repeating-linear-gradient(to right,transparent 0 ${colW-1}px,color-mix(in srgb,var(--line) 70%,transparent) ${colW-1}px ${colW}px);background-size:${colW}px 100%`;
  const xd = s => diff(ini, s) * pxd;
  const todayX = hoy >= ini && hoy <= fin ? xd(hoy) + pxd/2 : null;
  const fila = t => { const late = atrasada(t), done = t.est === 'done', dp = t.dep && tarea(t.dep);
    const bar = t.hito ? `<div class="gms" style="left:${xd(t.ini) + pxd/2 - 8}px" data-id="${t.id}" title="${esc(t.n)}: ${fechaCorta(t.ini)}"></div>`
      : `<div class="gbar ${done?'done':late?'late':''}" style="left:${xd(t.ini)+1}px;width:${Math.max(6, dur(t)*pxd - 2)}px" data-id="${t.id}" title="${esc(t.n)}: ${fechaCorta(t.ini)} a ${fechaCorta(t.fin)}, ${t.est==='done'?100:t.prog}%${dp?'. Depende de '+esc(dp.n):''}"><i style="width:${done?100:t.prog}%"></i></div>`;
    return `<tr><td class="nm" data-id="${t.id}" title="${esc(t.n)}">${t.hito?'◆ ':''}${esc(t.n)}<div class="small muted" style="margin-top:-2px">${esc(t.resp||'')}${t.resp?', ':''}${dur(t)} d</div></td>
      <td class="track" colspan="${cols.length}" style="${bg};position:relative;min-width:${W}px">${todayX!==null?`<div class="gtoday" style="left:${todayX}px"></div>`:''}${bar}</td></tr>`; };
  const fases = [...new Set(ordenadas().map(t => t.fase || ''))];
  const body = fases.map(f => { const ts = ordenadas().filter(t => (t.fase||'') === f); const fi = ts.reduce((a,t) => t.ini < a ? t.ini : a, ts[0].ini), ff = ts.reduce((a,t) => t.fin > a ? t.fin : a, ts[0].fin);
    return (f ? `<tr class="grp"><td class="nm">${esc(f)}</td><td colspan="${cols.length}" style="${bg};position:relative">${todayX!==null?`<div class="gtoday" style="left:${todayX}px"></div>`:''}<div style="position:absolute;left:${xd(fi)}px;width:${(diff(fi,ff)+1)*pxd}px;top:14px;height:6px;border-radius:3px;background:var(--ink-3)"></div></td></tr>` : '') + ts.map(fila).join(''); }).join('');
  $('#gantt').innerHTML = `<table class="gt"><thead><tr><th class="nm" rowspan="2">Tarea</th>${meses.map(m => `<th colspan="${m.n}" style="text-align:left;padding-left:6px;border-left:1px solid var(--line)">${mesN(m.k)}</th>`).join('')}</tr>
    <tr>${cols.map(c => { const d = D0(c), we = !sem && (d.getDay() === 0 || d.getDay() === 6); return `<th class="cell ${we?'we':''}" style="min-width:${colW}px;max-width:${colW}px">${sem?d.getDate()+'/'+(d.getMonth()+1):d.getDate()}</th>`; }).join('')}</tr></thead>
    <tbody>${body}</tbody></table>`;
  $$('#gantt [data-id]').forEach(el => el.onclick = () => editar(tarea(el.dataset.id)));
  if (todayX !== null){ const w = $('#gantt'); w.scrollLeft = Math.max(0, todayX - w.clientWidth / 2 + 220); }
}
$('#btn-dep').onclick = () => { const p = P(); if (!p) return; let mov = 0;
  for (let k = 0; k < p.tareas.length; k++){ let cambio = false; p.tareas.forEach(t => { const dp = t.dep && tarea(t.dep); if (dp && t.ini <= dp.fin){ const d = dur(t); t.ini = addD(dp.fin, 1); t.fin = addD(t.ini, t.hito ? 0 : d - 1); cambio = true; mov++; } }); if (!cambio) break; }
  save(); renderAll(); toast(mov ? mov+' tareas corridas para respetar sus dependencias' : 'Todas las dependencias ya se cumplen'); };

/* ---------- Lista ---------- */
function renderLista(){
  const p = P(); if (!p || !p.tareas.length){ $('#lista').innerHTML = `<div class="empty"><strong>Sin tareas</strong>Agrega la primera o crea un proyecto desde una plantilla.</div>`; return; }
  $('#lista').innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>Tarea</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th class="r">Días</th><th style="width:130px">Avance</th><th>Estado</th></tr></thead><tbody>
    ${ordenadas().map(t => { const e = EST.find(x => x.k === t.est); return `<tr data-id="${t.id}" style="cursor:pointer"><td><b>${t.hito?'◆ ':''}${esc(t.n)}</b><div class="small muted">${esc(t.fase||'')}${t.dep&&tarea(t.dep)?(t.fase?', ':'')+'después de '+esc(tarea(t.dep).n):''}</div></td>
      <td>${esc(t.resp||'')}</td><td>${fechaCorta(t.ini)}</td><td class="${atrasada(t)?'neg':''}">${fechaCorta(t.fin)}</td><td class="r">${t.hito?'Hito':dur(t)}</td>
      <td>${t.hito?'':`<div class="row" style="gap:6px;flex-wrap:nowrap"><div class="prog" style="flex:1"><i style="width:${t.est==='done'?100:t.prog}%"></i></div><span class="small">${t.est==='done'?100:t.prog}%</span></div>`}</td>
      <td><span class="pill" style="border-color:${e.c};color:${e.c}">${e.n}</span>${atrasada(t)?' <span class="pill bad">Atrasada</span>':''}</td></tr>`; }).join('')}</tbody></table></div>`;
  $$('#lista tr[data-id]').forEach(tr => tr.onclick = () => editar(tarea(tr.dataset.id)));
}

/* ---------- Resumen ---------- */
function renderRes(){
  const p = P(); if (!p){ $('#kpis').innerHTML = ''; $('#alertas').innerHTML = ''; $('#carga').innerHTML = ''; return; }
  const hoy = today(), ts = p.tareas, r = rango(p), av = avance(p);
  const transc = Math.min(100, Math.max(0, (diff(r.ini, hoy) + 1) / (diff(r.ini, r.fin) + 1) * 100));
  const at = ts.filter(atrasada), prox = ts.filter(t => t.est !== 'done' && t.fin >= hoy && diff(hoy, t.fin) <= 7);
  $('#kpis').innerHTML = `<div class="kpi accent"><span>Avance real</span><strong>${pct(av,0)}</strong><small>Ponderado por duración</small></div>
    <div class="kpi"><span>Tiempo transcurrido</span><strong>${pct(transc,0)}</strong><small class="${av + 5 < transc ? 'neg' : 'pos'}">${av + 5 < transc ? 'El avance va detrás del calendario' : 'Al día con el calendario'}</small></div>
    <div class="kpi"><span>Tareas terminadas</span><strong>${ts.filter(t => t.est === 'done').length} de ${ts.length}</strong></div>
    <div class="kpi"><span>Atrasadas</span><strong class="${at.length?'neg':''}">${at.length}</strong><small>${prox.length} vencen en 7 días</small></div>`;
  const it = (t, tipo) => `<tr data-id="${t.id}" style="cursor:pointer"><td><b>${esc(t.n)}</b><div class="small muted">${esc(t.resp||'Sin responsable')}</div></td><td class="r ${tipo==='at'?'neg':'warn'}">${tipo==='at'?'Venció hace '+diff(t.fin, hoy)+' d':diff(hoy,t.fin)===0?'Vence hoy':'Faltan '+diff(hoy, t.fin)+' d'}</td></tr>`;
  $('#alertas').innerHTML = at.length || prox.length ? `<div class="table-wrap"><table class="t"><tbody>${at.map(t => it(t,'at')).join('')}${prox.map(t => it(t,'px')).join('')}</tbody></table></div>` : `<div class="empty"><strong>Todo en orden</strong>No hay tareas atrasadas ni por vencer esta semana.</div>`;
  $$('#alertas tr[data-id]').forEach(tr => tr.onclick = () => editar(tarea(tr.dataset.id)));
  const c = {}; ts.filter(t => t.est !== 'done').forEach(t => { const k = t.resp || 'Sin responsable'; c[k] = (c[k]||0) + 1; });
  const e = Object.entries(c).sort((a,b) => b[1]-a[1]), mx = Math.max(1, ...e.map(x => x[1]));
  $('#carga').innerHTML = e.length ? e.map(([k,v]) => `<div class="bar-row"><span class="lbl">${esc(k)}</span><div class="track"><div class="fill" style="width:${v/mx*100}%"></div></div><b class="small">${v}</b></div>`).join('') : '<p class="muted small">No hay tareas abiertas.</p>';
}

/* ---------- Exportar ---------- */
$('#btn-csv').onclick = () => { const p = P(); if (!p) return;
  csv('proyecto-'+p.n.toLowerCase().replace(/[^a-z0-9]+/g,'-'), [['Fase','Tarea','Responsable','Inicio','Fin','Días','Avance %','Estado','Prioridad','Depende de','Hito','Notas'],
    ...ordenadas().map(t => [t.fase||'', t.n, t.resp||'', t.ini, t.fin, dur(t), t.est==='done'?100:t.prog, EST.find(x => x.k === t.est).n, PRIO[t.prio], t.dep&&tarea(t.dep)?tarea(t.dep).n:'', t.hito?'Sí':'', t.notas||''])]); };
$('#btn-print').onclick = () => { const p = P(); if (!p) return; const r = rango(p);
  const d0 = D0(r.ini); d0.setDate(d0.getDate() - ((d0.getDay()+6)%7)); const s0 = iso(d0); const nw = Math.min(30, Math.ceil((diff(s0, r.fin) + 1) / 7));
  const wk = Array.from({length:nw}, (_,i) => addD(s0, i*7));
  imprimirDoc('Cronograma del proyecto', `<style>@page{size:landscape}.g{width:14px;padding:0!important;border-left:1px solid #eee}.g.on{background:#9A7600}.g.ok{background:#15784a}.g.late{background:#b3261e}table{font-size:8pt}</style>
    <h2 style="margin-top:0">${esc(p.n)}</h2><p class="sub">${p.cliente?esc(p.cliente)+'. ':''}Del ${fechaLarga(r.ini)} al ${fechaLarga(r.fin)}. Avance ${pct(avance(p),0)}.</p>
    <table><thead><tr><th>Tarea</th><th>Responsable</th><th>Inicio</th><th>Fin</th><th class="r">Avance</th>${wk.map(w => `<th class="g" title="${w}" style="font-size:6pt;writing-mode:vertical-rl">${fechaCorta(w).slice(0,5)}</th>`).join('')}</tr></thead><tbody>
    ${ordenadas().map(t => `<tr><td>${t.hito?'◆ ':''}${esc(t.n)}</td><td>${esc(t.resp||'')}</td><td>${fechaCorta(t.ini)}</td><td>${fechaCorta(t.fin)}</td><td class="r">${t.est==='done'?100:t.prog}%</td>
      ${wk.map(w => { const we = addD(w, 6); const on = t.ini <= we && t.fin >= w; return `<td class="g ${on?(t.est==='done'?'ok':atrasada(t)?'late':'on'):''}"></td>`; }).join('')}</tr>`).join('')}</tbody></table>`, p.cliente || ''); };

function renderAll(){ renderProy(); renderKanban(); renderGantt(); renderLista(); renderRes(); }
tabs(id => { if (id === 'gantt') renderGantt(); });
renderAll(); save();
})();

"use strict";
/* ================= SEGURIDAD ================= */
/* Anti-clickjacking: la página no puede mostrarse dentro de un marco ajeno */
if(window.top!==window.self){try{window.top.location=window.self.location}catch(e){document.documentElement.innerHTML=""}}
/* Escapa texto antes de insertarlo como HTML */
const esc=v=>String(v??"").replace(/[&<>"'`]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;"}[c]));
/* Limpia lo que escribe el visitante: sin etiquetas, sin caracteres de control, con largo máximo */
const clean=(v,max=80)=>String(v??"").replace(/<[^>]*>/g,"").replace(/[\u0000-\u001F\u007F<>]/g,"").replace(/\s+/g," ").trim().slice(0,max);
const PAGE_T0=Date.now();

/* ================= CONFIGURACIÓN ================= */
const WA = "573126387467";
const STORE = "https://onemore.global/!aasespr";      // Enlace de afiliado: tienda + registro automático
const VIDEO_ID = "34RSPX_I7AI";
const SHIP = [[0,12],[100,10],[150,8],[200,6],[300,0]];

/* ================= ÍCONOS (trazos propios) ================= */
const I={
 bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
 move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v4M6 12l3-4 4 1 3 4h3"/><path d="M11 15l2-6"/></svg>',
 moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/><path d="M16 3v3M14.5 4.5h3"/></svg>',
 bolt:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
 pill:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="M9.5 8.5l5 7"/></svg>',
 patch:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="5"/><rect x="8" y="8" width="8" height="8" rx="2" stroke-dasharray="2 2"/></svg>',
 leaf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/></svg>',
 hand:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h4l3.5 2.5a1.6 1.6 0 0 0 2-2.5L10 12"/><path d="M7 14l5-4 4 1 5 3"/><path d="M16 17l2 1a1.5 1.5 0 0 0 2-2"/><path d="M3 20h18"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
 arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
 shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/></svg>',
 run:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/><path d="M17 3h4v4"/></svg>',
 heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9.2-9.2C1.6 7.4 3.8 4.5 7 4.5c2 0 3.5 1.2 5 3 1.5-1.8 3-3 5-3 3.2 0 5.4 2.9 4.2 6.3C19.5 15.4 12 20 12 20z"/><path d="M3 12h5l2-3 3 6 2-3h6"/></svg>',
 spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c.7 4.3 2.7 6.3 7 7-4.3.7-6.3 2.7-7 7-.7-4.3-2.7-6.3-7-7 4.3-.7 6.3-2.7 7-7z"/><path d="M19 16c.3 1.6 1 2.3 2.5 2.5-1.5.3-2.2 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.2 2.2-.9 2.5-2.5z"/></svg>',
 hour:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/></svg>',
 couple:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M2.5 20c.6-3.5 2.8-5.5 5.5-5.5s4.9 2 5.5 5.5M13.5 15.5c.9-1.3 2.1-2 3.5-2 2.4 0 4 1.8 4.5 5"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
};
const paintIcons=(root=document)=>root.querySelectorAll("[data-i]").forEach(e=>{if(!e.dataset.done){e.innerHTML=I[e.dataset.i]||"";e.dataset.done=1}});

/* ================= PRODUCTOS (foto real + ficha del catálogo) ================= */
const P = [
 {id:"png",name:"PNG",sub:"Painless Night Glu",cat:"Parches",img:"img/png-painless-night-glu.jpg",life:"img/life-png.jpg",pos:"40% 50%",star:1,p:79,d:64,qv:50,cv:25,pres:"25 parches",ing:"Glucosamina, ginseng rojo coreano, iones de plata, saponinas, germanio orgánico, calcio, potasio, magnesio",desc:"El producto estrella, pensado para acompañar músculos y articulaciones en movimiento."},
 {id:"melatonin",name:"Melatonin Plus",cat:"Parches",img:"img/melatonin.jpg",life:"img/life-melatonin.jpg",pos:"50% 30%",p:47,d:35,qv:30,cv:14,pres:"24 parches",ing:"4,4 mg de melatonina, aceite esencial de lavanda, aceite esencial de rosas",desc:"Para acompañar tu rutina de descanso y despertar con otra cara."},
 {id:"b12",name:"B12 Plus",cat:"Parches",img:"img/b12.jpg",life:"img/life-b12.jpg",pos:"45% 50%",p:47,d:35,qv:30,cv:14,pres:"24 parches",ing:"Vitaminas B1, B3, B12, ácido fólico, vitamina E, vitamina C, vitamina D",desc:"Complejo vitamínico en formato parche, para tu día a día."},
 {id:"dekamin",name:"Dekamin",cat:"Parches",img:"img/dekamin.jpg",life:"img/life-dekamin.jpg",pos:"65% 50%",p:43,d:32,qv:25,cv:13,pres:"24 parches",ing:"Vitamina D3, vitamina K12, vitamina C, magnesio",desc:"Vitaminas y minerales clave: «Boost your energy»."},
 {id:"slim",name:"Slim Style",cat:"Parches",img:"img/slim.jpg",life:"img/life-slim.jpg",pos:"60% 50%",p:43,d:32,qv:25,cv:13,pres:"30 parches",ing:"Espirulina, palmitoil tripéptido, L-carnitina, jengibre orgánico, té verde, guaraná, garcinia cambogia",desc:"Tu aliado para alcanzar tu forma ideal, junto a buena alimentación y actividad física."},
 {id:"omevia",name:"Omevia",cat:"Parches",img:"img/omevia.jpg",life:"img/life-omevia.jpg",pos:"60% 50%",p:49,d:39,qv:32,cv:17,pres:"26 parches",ing:"Omega 3, coenzima Q10, DHEA, pregnenolona",desc:"Omega 3 y coenzima Q10 para cuidarte por dentro."},
 {id:"nladies",name:"Night Ladies",cat:"Parches",img:"img/nladies.jpg",life:"img/life-nladies.jpg",pos:"55% 30%",p:79,d:59,qv:45,cv:23,pres:"27 parches",ing:"Omega 3, L-arginina, zinc, jengibre, ginseng, dioscorea bulbífera, trébol rojo",desc:"Línea Night de bienestar íntimo, diseñada para ella."},
 {id:"ngent",name:"Night Gentlemen",cat:"Parches",img:"img/ngent.jpg",life:"img/life-ngent.jpg",pos:"55% 25%",p:79,d:59,qv:45,cv:23,pres:"27 parches",ing:"Omega 3, L-arginina, zinc, jengibre, ginseng, cornus officinalis, maca, eurycoma longifolia",desc:"Línea Night de bienestar íntimo, diseñada para él."},
 {id:"glutanad",name:"GlutaNAD+ Boost",sub:"Longevity Formula",cat:"Suplementos",img:"img/glutanad.jpg",life:"img/life-glutanad.jpg",pos:"50% 35%",p:79,d:67,qv:50,cv:25,pres:"30 strips",ing:"Glutatión, NMN, quercetina, astaxantina · tecnología SnapRelease™",desc:"Fórmula avanzada en tiras para una nueva etapa de bienestar."},
 {id:"glutamore",name:"Glutamore",sub:"Glutathion Plus",cat:"Suplementos",img:"img/glutamore.jpg",life:"img/life-glutamore.jpg",pos:"50% 50%",pres:"2 unidades de 20 ml",ing:"L-glutatión, vitamina C, taurina, arginina, L-valina",desc:"L-glutatión en gotas: «¡Para tu mejor versión!»."},
 {id:"collagen",name:"Sornie Collagen",sub:"by Lumière",cat:"Belleza",img:"img/collagen.jpg",life:"img/life-collagen.jpg",pos:"50% 30%",p:79,d:59,qv:45,cv:23,pres:"27 parches",ing:"Colágeno, queratina hidrolizada, extracto de algas marinas, vitamina E, miel de acacia, coenzima Q10",desc:"Colágeno práctico para tu piel, en formato parche."},
 {id:"antiaging",name:"Sornie Anti-Aging Mask",sub:"by Lumière",cat:"Belleza",img:"img/antiaging.jpg",life:"img/life-antiaging.jpg",pos:"50% 30%",pres:"4 mascarillas",ing:"Colágeno, aloe vera, ácido hialurónico, ginseng, retinol A, lecitina, péptidos, aceites orgánicos",desc:"Mascarilla facial de la línea Sornie para tu rutina de cuidado."}
];
const CATS=["Todos","Parches","Suplementos","Belleza"];
const NEEDS=[["move","Movilidad","png"],["moon","Descanso","melatonin"],["bolt","Energía","b12"],["shield","Defensas","dekamin"],["run","Figura","slim"],["heart","Corazón","omevia"],["spark","Piel","collagen"],["hour","Longevidad","glutanad"]];
const byId=id=>P.find(p=>p.id===id);

/* ================= UTILIDADES ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const usd=n=>"$"+Math.round(n).toLocaleString("en-US");
const wa=t=>`https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
const pageUrl=()=>location.href.split("#")[0];
const store={get(k,d){try{return JSON.parse(localStorage.getItem("om3_"+k))??d}catch{return d}},set(k,v){try{localStorage.setItem("om3_"+k,JSON.stringify(v))}catch{}}};
const RM=matchMedia("(prefers-reduced-motion:reduce)").matches,FINE=matchMedia("(hover:hover) and (pointer:fine)").matches;
function toast(h,act){const t=$("#toast");t.innerHTML=h+(act?` <button>${act.l}</button>`:"");if(act)t.querySelector("button").onclick=act.f;t.classList.add("on");clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove("on"),2800)}

$$(".store-link").forEach(a=>a.href=STORE);
$$(".wa-general").forEach(a=>a.href=wa("Hola José, vengo de tu página web y quiero información sobre ONE MORE 😊"));
$$(".wa-video").forEach(a=>a.href=wa("Hola José, vi tu video en la página web y quiero información para empezar con ONE MORE 🙌"));
$("#packWa").href=wa(`Hola José, vengo de tu página web. Me interesa el paquete PNG de $150 (2 PNG, cliente + socio) y tengo unas dudas.\n${pageUrl()}#oferta`);
$("#joinWa").href=wa("Hola José, vengo de tu página web y quiero conocer el negocio ONE MORE antes de afiliarme. ¿Cuándo podemos hablar?");

/* Cinta de personas */
const REEL=[["png","Muévete"],["melatonin","Descansa"],["dekamin","Energía"],["collagen","Brilla"],["ngent","Vitalidad"],["b12","Equilibrio"],["slim","Tu forma"],["nladies","Para ella"],["omevia","Cuídate"],["antiaging","Luce"]];
$("#reel").innerHTML=[...REEL,...REEL].map(([id,t])=>`<figure><img src="${byId(id).life}" alt="" loading="lazy" style="object-position:${byId(id).pos}"><figcaption>${t}</figcaption></figure>`).join("");

/* ================= ASESOR ================= */
let need=null;
function renderNeeds(){
  $("#needs").innerHTML=NEEDS.map(([i,t,id])=>`<button class="${need===id?"on":""}" data-need="${id}"><span class="ic" data-i="${i}"></span>${t}</button>`).join("");
  paintIcons($("#needs"));
  const m=$("#match");if(!need){m.classList.remove("on");return}
  const p=byId(need);
  m.innerHTML=`<div class="ph"><img class="l" src="${p.life}" alt="" style="object-position:${p.pos}"><img class="p" src="${p.img}" alt="${p.name}"></div><div><span class="cat" style="font-size:11px;font-weight:800;letter-spacing:.16em;color:var(--orange2)">TE RECOMIENDO</span><h4>${p.name}</h4><small>${p.desc} · ${p.pres}</small>
    <div class="acts">${p.p?`<button class="btn btn-fire" data-add="${p.id}">Agregar · ${usd(p.p)}</button>`:""}<a class="btn btn-wa" target="_blank" rel="noopener" href="${wa(`Hola José, usé el asesor de tu página: quiero mejorar ${NEEDS.find(n=>n[2]===need)[1].toLowerCase()} y me recomendó *${p.name}*. ¿Me cuentas más?\n${pageUrl()}#producto-${p.id}`)}">Preguntar</a><a class="btn btn-ghost" href="#producto-${p.id}">Ver ficha</a></div></div>`;
  m.classList.remove("on");void m.offsetWidth;m.classList.add("on");
}

/* ================= CATÁLOGO ================= */
let cat="Todos";
function renderChips(){$("#chips").innerHTML=CATS.map(c=>`<button class="chip ${c===cat?"on":""}" data-cat="${c}">${c}${c==="Todos"?"":` · ${P.filter(p=>p.cat===c).length}`}</button>`).join("")}
function renderGrid(){
  const list=P.filter(p=>cat==="Todos"||p.cat===cat);
  $("#grid").innerHTML=list.map((p,i)=>`
  <article class="card" id="producto-${p.id}" style="animation-delay:${i*60}ms">
    <div class="media" data-zoom>
      ${p.star?`<span class="badge">★ Producto estrella</span>`:p.cat==="Suplementos"?`<span class="badge soft">Suplemento</span>`:""}
      <img class="life" src="${p.life}" alt="" loading="lazy" style="object-position:${p.pos}">
      <span class="pk"><img src="${p.img}" alt="${p.name} ${p.sub||""} de ONE MORE" loading="lazy"></span>
      <span class="hint">🔍 Ver empaque</span>
    </div>
    <div class="body">
      <span class="cat">${p.cat}</span>
      <h3>${p.name}${p.sub?` <small>· ${p.sub}</small>`:""}</h3>
      <p>${p.desc}</p>
      <div class="specs"><div><b>Presentación</b><span>${p.pres}</span></div><div><b>Ingredientes</b><span>${p.ing}</span></div></div>
      ${p.p?`<div class="prices"><b>${usd(p.p)}</b><small>Socio ${usd(p.d)}</small></div><div class="qv">${p.qv} QV · ${p.cv} CV</div>`:`<div class="prices"><span class="ask">Precio según tu país</span></div>`}
      <div class="actions">
        ${p.p?`<button class="btn btn-fire" data-add="${p.id}">Agregar al pedido</button>`:`<a class="btn btn-ghost" target="_blank" rel="noopener" href="${wa(`Hola José, vengo de tu página web. ¿Qué precio tiene *${p.name}* en mi país?\n${pageUrl()}#producto-${p.id}`)}">Consultar precio</a>`}
        <a class="wa-mini" target="_blank" rel="noopener" aria-label="Preguntar por ${p.name} en WhatsApp" href="${wa(`Hola José, vengo de tu página web y me interesa este producto ONE MORE: *${p.name}*${p.p?` (${usd(p.p)})`:""}\n${pageUrl()}#producto-${p.id}`)}"><span class="ic" data-i="wa" style="width:22px;height:22px;color:#04240F"></span></a>
      </div>
    </div>
  </article>`).join("");
  paintIcons($("#grid"));
}
/* Al pasar el cursor: aparece el empaque y se acerca siguiendo el puntero */
document.addEventListener("mouseover",e=>{const m=e.target.closest("[data-zoom]");$$(".media.zoomed").forEach(o=>{if(o!==m)o.classList.remove("zoomed")});if(m&&FINE)m.classList.add("zoomed")});
document.addEventListener("mousemove",e=>{const m=e.target.closest("[data-zoom]");if(!m)return;const r=m.getBoundingClientRect();m.querySelector(".pk img").style.transformOrigin=`${(e.clientX-r.left)/r.width*100}% ${(e.clientY-r.top)/r.height*100}%`});
document.addEventListener("mouseleave",()=>$$(".media.zoomed").forEach(o=>o.classList.remove("zoomed")));

/* ================= PEDIDO ================= */
let cart=(Array.isArray(store.get("cart",[]))?store.get("cart",[]):[]).filter(i=>i&&byId(i.id)?.p&&Number.isInteger(i.qty)&&i.qty>0&&i.qty<100),mode=store.get("mode","cliente")==="socio"?"socio":"cliente";
function add(id){const it=cart.find(i=>i.id===id);if(it)it.qty++;else cart.push({id,qty:1});saveCart();toast(`✓ ${byId(id).name} agregado`,{l:"Ver pedido",f:openCart});const b=$("#cartBtn");b.classList.remove("bump");void b.offsetWidth;b.classList.add("bump")}
function saveCart(){store.set("cart",cart);renderCart()}
function totals(){const sub=cart.reduce((s,i)=>s+(mode==="socio"?byId(i.id).d:byId(i.id).p)*i.qty,0),qv=cart.reduce((s,i)=>s+byId(i.id).qv*i.qty,0);let ship=0;for(const[f,c]of SHIP)if(qv>=f)ship=c;ship=cart.length?ship:0;return{sub,qv,ship,total:sub+ship,n:cart.reduce((s,i)=>s+i.qty,0)}}
function renderCart(){
  const t=totals();$("#cartN").textContent=t.n;
  $$("#mode button").forEach(b=>b.classList.toggle("on",b.dataset.mode===mode));
  if(!cart.length){$("#dItems").innerHTML=`<div class="d-empty"><span class="ic" data-i="patch" style="width:48px;height:48px;color:var(--orange)"></span><b>Tu pedido está vacío</b>Empieza con el paquete PNG o elige productos del catálogo.</div>`;paintIcons($("#dItems"));$("#dFoot").style.display="none";return}
  $("#dFoot").style.display="";
  $("#dItems").innerHTML=cart.map(i=>{const p=byId(i.id),pr=mode==="socio"?p.d:p.p;return`<div class="line"><img src="${p.img}" alt=""><div><h5>${p.name}</h5><small>${usd(pr)} · ${p.qv} QV</small></div><div class="r"><b>${usd(pr*i.qty)}</b><div class="qty"><button data-q="${i.id}" data-d="-1" aria-label="Menos">−</button><span>${i.qty}</span><button data-q="${i.id}" data-d="1" aria-label="Más">+</button></div></div></div>`}).join("");
  $("#sSub").textContent=usd(t.sub);$("#sQV").textContent=t.qv+" QV";$("#sShip").textContent=t.ship?usd(t.ship):"Gratis";$("#sTot").textContent=usd(t.total);
  const next=SHIP.find(([f])=>f>t.qv);
  $("#shipNote").innerHTML=(next?`Te faltan <b>${next[0]-t.qv} QV</b> para envío de ${next[1]?usd(next[1]):"<b>gratis</b>"}. `:"")+(mode==="socio"?"El precio de socio aplica con el paquete PNG o tu registro activo. ":"")+"Totales de referencia: la compañía confirma el valor final.";
}
function openCart(){$("#drawer").classList.add("on");$("#overlay").classList.add("on");document.body.style.overflow="hidden"}
function closeCart(){$("#drawer").classList.remove("on");$("#overlay").classList.remove("on");document.body.style.overflow=""}
function send(){const t=totals(),name=clean($("#fName").value,60);store.set("name",name);
  const lines=cart.map(i=>{const p=byId(i.id),pr=mode==="socio"?p.d:p.p;return`• ${i.qty} × *${p.name}* — ${usd(pr*i.qty)}`});
  window.open(wa(`Hola José, vengo de tu página web y quiero hacer este pedido ONE MORE:\n\n${lines.join("\n")}\n\nPrecio: ${mode==="socio"?"socio":"cliente"}\nProductos: ${usd(t.sub)}\nVolumen: ${t.qv} QV\nEnvío estimado: ${t.ship?usd(t.ship):"Gratis"}\n*Total estimado: ${usd(t.total)}*\n\n👤 ${name||"(nombre)"}\n📍 ${$("#fCountry").value}\n\n¿Me ayudas a hacer la compra?`),"_blank","noopener,noreferrer")}
$("#fName").value=clean(store.get("name",""),60);

/* ================= RANGOS (Requisitos de calificación OM, marzo 2025) ================= */
const RANKS=[
 {n:"Starter",qv:100,w:0,f:250,r:"2 activos",g:"inicio",c:"#9FB4C7"},
 {n:"Builder",qv:300,w:0,f:250,r:"2 activos",g:"inicio",c:"#7F9BB4"},
 {n:"Bronze",qv:650,w:0,f:250,r:"1 Starter",g:"inicio",c:"#B0743C"},
 {n:"Silver",qv:1000,w:100,f:500,r:"2 Starter",g:"lider",c:"#9EA7AD"},
 {n:"Gold",qv:2000,w:200,f:750,r:"1 Starter · 1 Bronze",g:"lider",c:"#C9A227"},
 {n:"Platinum",qv:3000,w:300,f:1000,r:"1 Builder · 1 Bronze",g:"lider",c:"#8E9AA6"},
 {n:"Pearl",qv:4000,w:400,f:1500,r:"1 Bronze · 1 Silver",g:"lider",c:"#C8BBAE"},
 {n:"Sapphire",qv:5000,w:500,f:2000,r:"1 Starter · 1 Builder · 1 Gold",g:"lider",c:"#2F5DA8"},
 {n:"Ruby",qv:7500,w:750,f:3000,r:"1 Starter · 1 Bronze · 1 Platinum",g:"lider",c:"#B3263E"},
 {n:"Emerald",qv:12500,w:1250,f:4000,r:"1 Starter · 1 Builder · 1 Gold · 1 Pearl",g:"lider",c:"#1E8A5A"},
 {n:"Diamond",qv:20000,w:1500,f:7500,r:"1 Builder · 1 Silver · 1 Pearl · 1 Sapphire",g:"diamante",c:"#5DADE2"},
 {n:"Double Diamond",qv:40000,w:3000,f:15000,r:"1 Bronze · 1 Gold · 1 Platinum · 1 Sapphire · 1 Ruby",g:"diamante",c:"#3E8EC9"},
 {n:"Triple Diamond",qv:70000,w:5000,f:20000,r:"1 Builder · 1 Bronze · 1 Gold · 1 Sapphire · 1 Ruby · 1 Diamond",g:"diamante",c:"#2471A3"},
 {n:"Imperial Diamond",qv:100000,w:7000,f:30000,r:"1 Builder · 1 Silver · 1 Pearl · 1 Sapphire · 1 Ruby · 1 Emerald · 1 Diamond",g:"diamante",c:"#6C3483"},
 {n:"Imperial Blue Diamond",qv:300000,w:15000,f:50000,r:"1 Silver · 1 Platinum · 1 Sapphire · 1 Ruby · 1 Emerald · 1 Double Diamond · 1 Triple Diamond",g:"diamante",c:"#1B3A8A"},
 {n:"Imperial Black Diamond",qv:650000,w:25000,f:60000,r:"1 Silver · 1 Platinum · 1 Ruby · 1 Emerald · 1 Diamond · 2 Double Diamond · 1 Imperial Diamond",g:"diamante",c:"#3A3330"},
 {n:"Royal Diamond",qv:1000000,w:100000,f:100000,r:"2 Sapphire · 2 Ruby · 2 Emerald · 1 Double Diamond · 1 Triple Diamond · 1 Imperial Diamond · 1 Imperial Blue Diamond",g:"diamante",c:"#FF7A1A"}
];
let rkG="todos",rkO=null;
function renderRanks(){
  $("#rkTabs").innerHTML=[["todos","Todos"],["inicio","Inicio"],["lider","Liderazgo"],["diamante","Diamantes"]].map(([k,t])=>`<button class="${k===rkG?"on":""}" data-rkg="${k}">${t}</button>`).join("");
  $("#rkList").innerHTML=RANKS.map((r,i)=>({...r,i})).filter(r=>rkG==="todos"||r.g===rkG).map((r,k)=>`<div class="rk ${rkO===r.i?"open":""}" style="animation-delay:${k*35}ms">
    <button data-rk="${r.i}"><span class="gem" style="background:${r.c};--c:${r.c}">${r.i+1}</span><span class="nm"><b>${r.n}</b><small>${r.qv.toLocaleString("es-CO")} QV</small></span>
    <span class="mn">Semanal <b>${r.w?usd(r.w):"—"}</b><br>Flash Out <b>${usd(r.f)}</b></span><span class="chev">+</span></button>
    <div class="req"><div class="pills">${r.r.split(" · ").map(x=>`<span>${x}</span>`).join("")}</div></div></div>`).join("");
}

/* ================= VIDEO ================= */
const embedUrl=()=>{const o=/^https?:/.test(location.origin)?`&origin=${encodeURIComponent(location.origin)}`:"";return`https://www.youtube.com/embed/${VIDEO_ID}?autoplay=1&playsinline=1&rel=0&modestbranding=1${o}`};
const makeFrame=()=>{const f=document.createElement("iframe");f.src=embedUrl();f.title="Video de José Lugo sobre ONE MORE";f.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";f.referrerPolicy="strict-origin-when-cross-origin";return f};
$$("img[data-fallback]").forEach(im=>im.addEventListener("error",()=>{if(im.dataset.fallback){im.src=im.dataset.fallback;im.dataset.fallback=""}},{once:false}));
const phoneHTML=$("#phone").innerHTML;
const playInline=()=>{$("#phone").innerHTML="";$("#phone").appendChild(makeFrame())};
function openVideo(){$("#phone").innerHTML=phoneHTML;$$("#phone img[data-fallback]").forEach(im=>im.addEventListener("error",()=>{if(im.dataset.fallback){im.src=im.dataset.fallback;im.dataset.fallback=""}}));$("#vbox").innerHTML="";$("#vbox").appendChild(makeFrame());$("#vmodal").classList.add("on");document.body.style.overflow="hidden"}
function closeVideo(){$("#vbox").innerHTML="";$("#vmodal").classList.remove("on");if(!$("#drawer").classList.contains("on"))document.body.style.overflow=""}
$("#vfab").onclick=openVideo;$("#vclose").onclick=closeVideo;$("#vmodal").onclick=e=>{if(e.target.id==="vmodal")closeVideo()};

/* ================= EVENTOS ================= */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-cat],[data-add],[data-q],[data-mode],[data-need],[data-rkg],[data-rk],[data-play],[data-zoom]");if(!t)return;const d=t.dataset;
  if(d.cat){cat=d.cat;renderChips();renderGrid()}
  else if(d.add){add(d.add)}
  else if(d.q){const it=cart.find(i=>i.id===d.q);it.qty+= +d.d;if(it.qty<=0)cart=cart.filter(i=>i!==it);saveCart()}
  else if(d.mode){mode=d.mode;store.set("mode",mode);renderCart()}
  else if(d.need){need=need===d.need?null:d.need;renderNeeds()}
  else if(d.rkg){rkG=d.rkg;rkO=null;renderRanks()}
  else if(d.rk){const i=+d.rk;rkO=rkO===i?null:i;$$("#rkList .rk").forEach(el=>el.classList.toggle("open",+el.querySelector("[data-rk]").dataset.rk===rkO))}
  else if(d.play!==undefined){playInline()}
  else if(d.zoom!==undefined&&!FINE){t.classList.toggle("zoomed")}
});
$("#cartBtn").onclick=openCart;$("#openCart2").onclick=openCart;$("#closeCart").onclick=closeCart;$("#overlay").onclick=closeCart;$("#sendWa").onclick=send;
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeVideo();closeCart()}});

/* ================= EFECTOS ================= */
const onScroll=()=>{const h=document.documentElement,y=h.scrollTop;$("#progress").style.transform=`scaleX(${y/(h.scrollHeight-h.clientHeight||1)})`;$("#top").classList.toggle("scrolled",y>20);
  const off=$("#oferta").getBoundingClientRect();$("#mbar").classList.toggle("on",y>600&&!(off.top<innerHeight&&off.bottom>0));$("#vfab")?.classList.toggle("hide",y<500)};
addEventListener("scroll",onScroll,{passive:true});onScroll();
const io=new IntersectionObserver(es=>es.forEach(en=>{if(!en.isIntersecting)return;const el=en.target;el.classList.add("in");
  el.querySelectorAll("[data-count]").forEach(c=>{const to=+c.dataset.count,pre=c.dataset.prefix||"";let t0=null;const st=t=>{t0??=t;const k=Math.min(1,(t-t0)/1500);c.textContent=pre+Math.round(to*(1-Math.pow(1-k,3))).toLocaleString("es-CO");if(k<1)requestAnimationFrame(st)};requestAnimationFrame(st)});
  io.unobserve(el)}),{threshold:.12});
$$(".rv,.proof").forEach(el=>{const par=el.parentElement;if(par.matches(".pains,.steps,.paths"))el.style.transitionDelay=[...par.children].indexOf(el)*120+"ms";io.observe(el)});
/* Brasas en el hero */
if(!RM){const c=$("#sparks"),x=c.getContext("2d");let W,H,vis=true;const E=Array.from({length:60},()=>({x:Math.random(),y:Math.random(),r:Math.random()*2.2+.6,v:Math.random()*.0009+.0003,d:Math.random()*6.28,o:Math.random()*.6+.25}));
  const rs=()=>{W=c.width=c.offsetWidth*devicePixelRatio;H=c.height=c.offsetHeight*devicePixelRatio};rs();addEventListener("resize",rs);new IntersectionObserver(e=>vis=e[0].isIntersecting).observe(c);
  (function l(){if(vis){x.clearRect(0,0,W,H);for(const p of E){p.y-=p.v;p.d+=.02;if(p.y<-.02){p.y=1.02;p.x=Math.random()}const px=(p.x+Math.sin(p.d)*.012)*W,py=p.y*H,g=x.createRadialGradient(px,py,0,px,py,p.r*4*devicePixelRatio);g.addColorStop(0,`rgba(255,190,110,${p.o})`);g.addColorStop(1,"rgba(255,100,0,0)");x.fillStyle=g;x.beginPath();x.arc(px,py,p.r*4*devicePixelRatio,0,7);x.fill()}}requestAnimationFrame(l)})()}
if(FINE&&!RM){
  const g=$("#glow");let gx=0,gy=0,tx=0,ty=0;addEventListener("mousemove",e=>{tx=e.clientX;ty=e.clientY;document.body.classList.add("has-glow")});(function l(){gx+=(tx-gx)*.12;gy+=(ty-gy)*.12;g.style.transform=`translate(${gx}px,${gy}px)`;requestAnimationFrame(l)})();
  $$("[data-tilt]").forEach(el=>{el.addEventListener("mousemove",e=>{const r=el.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;el.classList.add("tilting");el.style.transform=`perspective(1000px) rotateY(${(px-.5)*14}deg) rotateX(${(.5-py)*12}deg) scale(1.02)`;el.style.setProperty("--gx",px*100+"%");el.style.setProperty("--gy",py*100+"%")});el.addEventListener("mouseleave",()=>{el.classList.remove("tilting");el.style.transform=""})});
  document.addEventListener("mousemove",e=>{const c=e.target.closest(".card");$$(".card.tl").forEach(o=>{if(o!==c){o.classList.remove("tl");o.style.transform=""}});if(!c)return;const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;c.classList.add("tl");c.style.transform=`perspective(1100px) rotateY(${px*5}deg) rotateX(${-py*5}deg) translateY(-6px)`});
  $$(".hero .btn,.offer .btn,.final .btn,.path .btn").forEach(b=>{b.addEventListener("mousemove",e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.15}px,${(e.clientY-r.top-r.height/2)*.22}px)`});b.addEventListener("mouseleave",()=>b.style.transform="")});
}
document.addEventListener("pointerdown",e=>{const b=e.target.closest(".btn");if(!b||RM)return;const r=b.getBoundingClientRect(),d=Math.max(r.width,r.height),s=document.createElement("span");s.className="rip";s.style.cssText=`width:${d}px;height:${d}px;left:${e.clientX-r.left-d/2}px;top:${e.clientY-r.top-d/2}px`;b.appendChild(s);setTimeout(()=>s.remove(),650)});
document.addEventListener("click",e=>{const t=e.target.closest("[data-add]");if(!t||RM)return;const host=t.closest(".card,.match");const src=host?.querySelector(".pk img,img.p");const a=(src||t).getBoundingClientRect(),dst=$("#cartBtn").getBoundingClientRect();
  const f=document.createElement("div");f.className="flyer";f.innerHTML=src?`<img src="${src.getAttribute("src")}" alt="">`:"";f.style.left=a.left+a.width/2-33+"px";f.style.top=a.top+a.height/2-33+"px";document.body.appendChild(f);
  const dx=dst.left+dst.width/2-(a.left+a.width/2),dy=dst.top+dst.height/2-(a.top+a.height/2);
  f.animate([{transform:"translate(0,0) scale(1)"},{transform:`translate(${dx*.55}px,${dy-100}px) scale(1.15) rotate(-12deg)`,offset:.55},{transform:`translate(${dx}px,${dy}px) scale(.25) rotate(10deg)`,opacity:.5}],{duration:850,easing:"cubic-bezier(.5,0,.3,1)"}).onfinish=()=>{f.remove();
    for(let i=0;i<14;i++){const p=document.createElement("i");p.className="burst";p.style.background=["#FF7A1A","#FFC266","#FFE2B0"][i%3];p.style.boxShadow="0 0 10px #FF7A1A";p.style.left=dst.left+dst.width/2+"px";p.style.top=dst.top+dst.height/2+"px";document.body.appendChild(p);const g=i/14*6.28,ds=30+Math.random()*28;p.animate([{transform:"translate(0,0)",opacity:1},{transform:`translate(${Math.cos(g)*ds}px,${Math.sin(g)*ds}px) scale(.2)`,opacity:0}],{duration:650,easing:"ease-out"}).onfinish=()=>p.remove()}}},true);

/* ================= CAPTURA DE LEADS ================= */
/* FormSubmit. Tras activar, reemplaza el correo por el código aleatorio que FormSubmit te envía (más privado). */
const LEAD_EMAIL_ENDPOINT = "https://formsubmit.co/ajax/" + ["clerigman","gmail.com"].join("@");
I.sun='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
paintIcons();
const lead={interest:"",time:"Mañana"};let fStep=1;
const digits=v=>(v||"").replace(/\D/g,"");
function setStep(n,back){
  fStep=n;$$("#leadForm .fstep").forEach(s=>{const on=+s.dataset.step===n;s.classList.toggle("on",on);s.classList.toggle("back",on&&!!back)});
  $("#fBar").style.width=(n/3*100)+"%";$("#fStepTxt").innerHTML=`Paso <b>${n}</b> de 3`;
  $("#fBack").hidden=n===1;$("#fNext").textContent=n===3?"Quiero mi asesoría →":"Continuar →";
  if(n===2)setTimeout(()=>$("#lName").focus({preventScroll:true}),350);
}
function fieldErr(id,bad){$(id).classList.toggle("err",bad);return !bad}
function validStep2(){
  const ok1=fieldErr("#fdName",$("#lName").value.trim().length<2);
  const ok2=fieldErr("#fdPhone",digits($("#lPhone").value).length<7);
  const em=$("#lEmail").value.trim();const ok3=fieldErr("#fdEmail",!!em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em));
  return ok1&&ok2&&ok3;
}
function leadText(d){return `Hola José, vengo de tu página web y quiero una asesoría 🙌\n\n👤 ${d.name}\n📱 ${d.whatsapp}${d.email?`\n✉️ ${d.email}`:""}\n🎯 Interés: ${d.interest}\n🕐 Mejor momento: ${d.time}`}
function canSend(){
  if(Date.now()-PAGE_T0<4000)return false;                       // los robots envían al instante
  const log=(store.get("leadlog",[])||[]).filter(t=>Date.now()-t<3600e3);
  if(log.length>=3)return false;                                  // máximo 3 envíos por hora por navegador
  if(log.length&&Date.now()-log[log.length-1]<60e3)return false;  // y uno por minuto
  log.push(Date.now());store.set("leadlog",log);return true;
}
function sendLead(d){
  if(!canSend()){toast("Ya recibimos tu solicitud. Si necesitas algo más, escríbeme por WhatsApp.");return false}
  // Correo (en segundo plano, no bloquea al visitante)
  try{fetch(LEAD_EMAIL_ENDPOINT,{method:"POST",keepalive:true,headers:{"Content-Type":"application/json",Accept:"application/json"},
    body:JSON.stringify({_honey:"",_blacklist:"viagra, casino, crypto, bitcoin, loan, seo services, http://, https://",_subject:`Nuevo lead ONE MORE: ${d.name} (${d.interest})`,_template:"table",_captcha:"false",Nombre:d.name,WhatsApp:d.whatsapp,Correo:d.email||"—",Interés:d.interest,"Mejor momento":d.time,País:d.country,Origen:d.source,Página:pageUrl(),Fecha:new Date().toLocaleString("es-CO")})}).catch(()=>{})}catch(e){}
  store.set("lead",{at:Date.now()});
  if(typeof gtag==="function")gtag("event","generate_lead");
  return true;
}
function celebrate(el){
  if(RM)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/3;
  for(let i=0;i<34;i++){const p=document.createElement("i");p.className="burst";p.style.background=["#FF7A1A","#FFC266","#FFE2B0","#25D366"][i%4];p.style.boxShadow="0 0 10px #FF7A1A";p.style.left=cx+"px";p.style.top=cy+"px";document.body.appendChild(p);
    const g=Math.random()*6.28,ds=60+Math.random()*120;p.animate([{transform:"translate(0,0) scale(1)",opacity:1},{transform:`translate(${Math.cos(g)*ds}px,${Math.sin(g)*ds+60}px) scale(.3)`,opacity:0}],{duration:900+Math.random()*500,easing:"cubic-bezier(.2,.8,.3,1)"}).onfinish=()=>p.remove()}
}
$$("#leadForm .opt").forEach(b=>b.addEventListener("click",()=>{$$("#leadForm .opt").forEach(o=>o.classList.toggle("on",o===b));lead.interest=b.dataset.int;setTimeout(()=>setStep(2),280)}));
$$("#leadForm .times button").forEach(b=>b.addEventListener("click",()=>{$$("#leadForm .times button").forEach(o=>o.classList.toggle("on",o===b));lead.time=b.dataset.time}));
["#lName","#lPhone","#lEmail"].forEach(id=>$(id).addEventListener("input",e=>e.target.closest(".fld").classList.remove("err")));
$("#lPhone").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();$("#fNext").click()}});
$("#fBack").onclick=()=>setStep(fStep-1,true);
$("#fNext").onclick=()=>{
  if(fStep===1){if(!lead.interest){$$("#leadForm .opt").forEach(o=>o.animate([{transform:"translateX(-5px)"},{transform:"translateX(5px)"},{transform:"none"}],{duration:300}));toast("👆 Elige una opción para continuar");return}setStep(2);return}
  if(fStep===2){if(validStep2())setStep(3);return}
  if(!$("#lConsent").checked){$("#lConsentWrap").classList.add("err");$("#lConsentWrap").animate([{transform:"translateX(-5px)"},{transform:"translateX(5px)"},{transform:"none"}],{duration:300});return}
  if($("#leadForm [name=_honey]").value)return;
  const code=digits($("#lCode").value).slice(0,4),d={name:clean($("#lName").value,60),whatsapp:(code?"+"+code+" ":"")+clean($("#lPhone").value,20).replace(/[^\d\s()+-]/g,""),email:clean($("#lEmail").value,90),interest:lead.interest,time:lead.time,country:$("#lCode").selectedOptions[0].textContent,source:"Formulario de asesoría"};
  const b=$("#fNext");b.classList.add("loading");b.textContent="Enviando ";
  if(!sendLead(d)){b.classList.remove("loading");b.textContent="Quiero mi asesoría →";return}
  const link=wa(leadText(d));$("#fDoneWa").href=link;window.open(link,"_blank","noopener,noreferrer");
  setTimeout(()=>{$("#leadForm").style.display="none";$("#fDoneTitle").textContent=`¡Listo, ${d.name.split(" ")[0]}!`;$("#fDone").classList.add("on");celebrate($("#fDone"))},500);
};
$("#lConsent").onchange=()=>$("#lConsentWrap").classList.remove("err");

/* Pop-up: aparece una sola vez (intención de salida en computador o a los 40 s) */
const popSeen=()=>{try{return sessionStorage.getItem("om3_pop")||store.get("lead",null)}catch{return true}};
function openPop(){if(popSeen()||$("#drawer").classList.contains("on")||$("#vmodal").classList.contains("on")||$("#fDone").classList.contains("on"))return;try{sessionStorage.setItem("om3_pop","1")}catch{}$("#lpop").classList.add("on")}
function closePop(){$("#lpop").classList.remove("on")}
document.addEventListener("mouseout",e=>{if(!e.relatedTarget&&e.clientY<8&&scrollY>600)openPop()});
setTimeout(()=>{if(scrollY>400)openPop()},40000);
$("#lpopX").onclick=closePop;$("#lpopSkip").onclick=closePop;$("#lpop").onclick=e=>{if(e.target.id==="lpop")closePop()};
["#pName","#pPhone"].forEach(id=>$(id).addEventListener("input",e=>e.target.closest(".fld").classList.remove("err")));
$("#pConsent").onchange=()=>$("#pConsentWrap").classList.remove("err");
$("#popForm").onsubmit=e=>{e.preventDefault();
  const ok1=fieldErr("#pdName",$("#pName").value.trim().length<2),ok2=fieldErr("#pdPhone",digits($("#pPhone").value).length<7);
  if(!(ok1&&ok2))return;if(!$("#pConsent").checked){$("#pConsentWrap").classList.add("err");return}
  if($("#popForm [name=_honey]").value)return;
  const code=digits($("#pCode").value).slice(0,4),d={name:clean($("#pName").value,60),whatsapp:(code?"+"+code+" ":"")+clean($("#pPhone").value,20).replace(/[^\d\s()+-]/g,""),email:"",interest:"Por definir",time:"Cuando pueda",country:$("#pCode").selectedOptions[0].textContent,source:"Pop-up de salida"};
  if(!sendLead(d)){closePop();return}window.open(wa(leadText(d)),"_blank","noopener,noreferrer");
  closePop();toast(`🎉 ¡Gracias, ${esc(d.name.split(" ")[0])}! Te escribo muy pronto.`);celebrate($("#cartBtn"));
};
document.addEventListener("keydown",e=>{if(e.key==="Escape")closePop()});

/* ================= INICIO ================= */
/* ================= INTRO 3D ================= */
(function(){
  const root=document.documentElement;if(!root.classList.contains("intro-on"))return;
  const el=$("#intro"),c=$("#introFx"),x=c.getContext("2d");let W,H,run=true,t0=performance.now();
  const rs=()=>{W=c.width=innerWidth*devicePixelRatio;H=c.height=innerHeight*devicePixelRatio};rs();addEventListener("resize",rs);
  const P=Array.from({length:140},()=>{const a=Math.random()*6.28,s=Math.random()*1.4+.3;return{a,s,d:Math.random()*.2,r:Math.random()*2+.6,o:Math.random()*.7+.3,hue:Math.random()<.2?210:28+Math.random()*16}});
  (function loop(now){if(!run)return;const t=(now-t0)/1000;x.clearRect(0,0,W,H);const cx=W/2,cy=H/2;
    for(const p of P){const k=t<1.2?0:(t-1.2);const dist=(p.d+k*p.s*.32)*Math.max(W,H);const px=cx+Math.cos(p.a)*dist,py=cy+Math.sin(p.a)*dist*.7;const al=t<1.2?0:Math.max(0,p.o*(1-k/2.2));
      if(al<=0)continue;const g=x.createRadialGradient(px,py,0,px,py,p.r*5*devicePixelRatio);g.addColorStop(0,`hsla(${p.hue},100%,70%,${al})`);g.addColorStop(1,`hsla(${p.hue},100%,50%,0)`);x.fillStyle=g;x.beginPath();x.arc(px,py,p.r*5*devicePixelRatio,0,7);x.fill()}
    requestAnimationFrame(loop)})(t0);
  let done=false;
  function finish(){if(done)return;done=true;try{sessionStorage.setItem("om_intro","1")}catch(e){}
    el.classList.add("out");setTimeout(()=>{root.classList.remove("intro-on");scrollTo(0,0)},350);setTimeout(()=>{run=false;el.remove()},1300)}
  $("#introSkip").onclick=finish;el.addEventListener("click",e=>{if(e.target.id!=="introSkip"&&performance.now()-t0>1200)finish()});
  addEventListener("keydown",e=>{if(e.key==="Escape"||e.key==="Enter")finish()},{once:true});
  setTimeout(finish,3600);
})();

paintIcons();renderNeeds();renderChips();renderGrid();renderCart();renderRanks();
const h=location.hash.match(/^#producto-([a-z0-9]{2,20})$/);if(h&&byId(h[1]))setTimeout(()=>document.getElementById("producto-"+h[1])?.scrollIntoView({block:"center"}),300);

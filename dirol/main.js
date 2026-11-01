/* Dirol: muestrario de cueros. Patrón IIFE, sin módulos; cada init protegido. */
(function(){
  "use strict";
  var IMG = "https://www.dirol.co/cdn/shop/files/";
  var PROD = "https://www.dirol.co/products/";
  var SIL = {
    bolso: '<path d="M40 50 Q100 0 160 50" fill="none" stroke="currentColor" stroke-width="5"/><path d="M30 70 H170 L182 180 H18 Z" fill="currentColor" fill-opacity=".85"/><path d="M38 80 H162 L172 170 H28 Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-dasharray="4 4"/>',
    billetera: '<rect x="22" y="62" width="156" height="104" rx="6" fill="currentColor" fill-opacity=".85"/><path d="M30 70 H170 V158 H30 Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-dasharray="4 4"/><path d="M22 62 H178 V112 Q100 128 22 112 Z" fill="currentColor"/>',
    manolibre: '<path d="M44 74 L20 6 M156 74 L180 6" fill="none" stroke="currentColor" stroke-width="2"/><rect x="38" y="70" width="124" height="110" rx="14" fill="currentColor" fill-opacity=".85"/><path d="M48 80 H152 V170 H48 Z" fill="none" stroke="#fff" stroke-opacity=".6" stroke-dasharray="4 4"/>'
  };

  function safe(fn, name){ try{ fn(); }catch(e){ if(window.console) console.warn("[" + name + "]", e); } }

  function initMuestrario(){
    var portada = document.getElementById("muestrario");
    var escena = document.getElementById("escena");
    if(!portada || !escena) return;
    var tiras = portada.querySelectorAll(".tira");
    var foto = escena.querySelector(".escena-foto");
    var silueta = escena.querySelector(".silueta");
    var nombre = document.getElementById("escena-nombre");
    var color = document.getElementById("escena-color");
    var precio = document.getElementById("escena-precio");

    function elegir(tira){
      var d = tira.dataset;
      Array.prototype.forEach.call(tiras, function(t){ t.setAttribute("aria-pressed", String(t === tira)); });
      portada.style.setProperty("--cuero", d.color);
      escena.href = PROD + d.slug;
      nombre.textContent = d.pieza;
      color.textContent = d.nombre;
      precio.textContent = d.precio;
      if(silueta && SIL[d.tipo]) silueta.innerHTML = SIL[d.tipo];
      var vieja = foto.querySelector("img");
      if(vieja) vieja.remove();
      var img = new Image();
      img.alt = d.pieza + " en cuero color " + d.nombre.toLowerCase();
      img.onload = function(){ img.classList.add("ok"); };
      img.onerror = function(){ img.remove(); };
      img.src = IMG + d.img + "&width=900";
      foto.appendChild(img);
    }

    Array.prototype.forEach.call(tiras, function(t){
      t.addEventListener("click", function(){ elegir(t); });
    });

    /* Precarga las fotos del muestrario para que el cambio sea inmediato */
    var precarga = function(){
      Array.prototype.forEach.call(tiras, function(t){ var i = new Image(); i.src = IMG + t.dataset.img + "&width=900"; });
    };
    if("requestIdleCallback" in window){ requestIdleCallback(precarga); } else { setTimeout(precarga, 1500); }
  }

  function iniciar(){ safe(initMuestrario, "muestrario"); }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", iniciar); } else { iniciar(); }
})();

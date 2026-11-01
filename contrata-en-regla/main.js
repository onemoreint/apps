/* Contrata en regla: calculadora de costo laboral y formulario a WhatsApp.
   Patrón IIFE, sin módulos. Cada init va protegido para que un fallo no rompa el resto. */
(function(){
  "use strict";
  var WHATSAPP = "573126387467";
  var SMMLV = 1750905;
  var AUXILIO = 249095;

  function safe(fn, name){
    try{ fn(); }catch(e){ if(window.console) console.warn("[" + name + "]", e); }
  }
  function $(id){ return document.getElementById(id); }
  function cop(n){ return "$" + Math.round(n).toLocaleString("es-CO"); }
  function leerNumero(texto){ return Number(String(texto).replace(/[^\d]/g, "")) || 0; }

  function initCalculadora(){
    var form = $("calc-form"), salario = $("salario"), riesgo = $("riesgo"), exo = $("exonerado");
    if(!form) return;
    var detalle = $("detalle").tBodies[0], total = $("total"), multiplo = $("multiplo");

    function calcular(){
      var s = leerNumero(salario.value);
      if(s <= 0){ total.textContent = "$0"; multiplo.textContent = "Escribe un salario"; detalle.innerHTML = ""; return; }
      var aux = s <= 2 * SMMLV ? AUXILIO : 0;
      var exonerado = exo.checked && s < 10 * SMMLV;
      var basePrest = s + aux;
      var cesantias = basePrest * 0.0833;
      var filas = [
        ["grupo", "Pagos al trabajador", ""],
        ["Salario", s],
        ["Auxilio de transporte", aux],
        ["grupo", "Seguridad social", ""],
        ["Salud (8,5%)", exonerado ? 0 : s * 0.085, exonerado ? "Exonerado" : null],
        ["Pensión (12%)", s * 0.12],
        ["ARL", s * Number(riesgo.value)],
        ["grupo", "Parafiscales", ""],
        ["Caja de compensación (4%)", s * 0.04],
        ["ICBF (3%)", exonerado ? 0 : s * 0.03, exonerado ? "Exonerado" : null],
        ["SENA (2%)", exonerado ? 0 : s * 0.02, exonerado ? "Exonerado" : null],
        ["grupo", "Prestaciones (provisión mensual)", ""],
        ["Prima de servicios", basePrest * 0.0833],
        ["Cesantías", cesantias],
        ["Intereses de cesantías", cesantias * 0.12],
        ["Vacaciones", s * 0.0417]
      ];
      var suma = 0, html = "";
      filas.forEach(function(f){
        if(f[0] === "grupo"){ html += '<tr class="grupo"><th scope="row">' + f[1] + "</th><td></td></tr>"; return; }
        suma += f[1];
        html += '<tr><th scope="row">' + f[0] + "</th><td>" + (f[2] || cop(f[1])) + "</td></tr>";
      });
      detalle.innerHTML = html;
      total.textContent = cop(suma);
      multiplo.textContent = (suma / s).toLocaleString("es-CO", {maximumFractionDigits: 2, minimumFractionDigits: 2}) + " veces el salario";
    }

    salario.addEventListener("input", function(){
      var n = leerNumero(salario.value);
      salario.value = n ? n.toLocaleString("es-CO") : "";
      calcular();
    });
    riesgo.addEventListener("change", calcular);
    exo.addEventListener("change", calcular);
    form.addEventListener("submit", function(e){ e.preventDefault(); });
    calcular();
  }

  function initFormulario(){
    var form = $("formulario");
    if(!form) return;
    var error = $("error"), enviado = $("enviado");
    form.addEventListener("submit", function(e){
      e.preventDefault();
      error.hidden = true; enviado.hidden = true;
      var nombre = $("nombre").value.trim(), tel = $("telefono").value.trim();
      if(!nombre || !tel){ error.textContent = "Escribe tu nombre y tu número de WhatsApp para poder responderte."; error.hidden = false; return; }
      if(!$("acepto").checked){ error.textContent = "Marca la autorización de datos para poder contactarte."; error.hidden = false; return; }
      var lineas = [
        "Hola José, quiero agendar la asesoría express de Contrata en regla.",
        "Nombre: " + nombre,
        "WhatsApp: " + tel,
        $("ciudad").value.trim() ? "Ciudad: " + $("ciudad").value.trim() : "",
        "Soy: " + $("perfil").value,
        $("empleados").value ? "Empleados: " + $("empleados").value : "",
        $("mensaje").value.trim() ? "Necesito: " + $("mensaje").value.trim() : ""
      ].filter(Boolean);
      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(lineas.join("\n"));
      var w = window.open(url, "_blank");
      if(w){ try{ w.opener = null; }catch(err){} } else { window.location.href = url; }
      enviado.hidden = false;
    });
  }

  function iniciar(){
    safe(initCalculadora, "calculadora");
    safe(initFormulario, "formulario");
  }
  if(document.readyState === "loading"){ document.addEventListener("DOMContentLoaded", iniciar); } else { iniciar(); }
})();

/* ================================================================
   CONFIGURACIÓN DE LA CLASE EN VIVO · José Lugo
   Edita solo este archivo para cambiar fecha, enlaces y píxel.
   ================================================================ */
window.EVENTO = {
  id: 'ia-prospectos',                 // cambia el id en cada nueva fecha para separar las listas

  titulo: 'Cómo conseguir prospectos todos los días en redes de mercadeo usando IA',

  // Fecha y hora de inicio en hora de Colombia. Déjalo en '' mientras esté "por anunciar".
  // Formato: '2026-11-12T20:00:00-05:00'
  fecha: '',
  duracion: '45 minutos + preguntas',
  lugar: 'En línea, desde tu celular. El enlace te llega por WhatsApp.',

  // Enlace de invitación a tu grupo o comunidad de WhatsApp (chat.whatsapp.com/...).
  // Si lo dejas vacío, el botón de la página de gracias abre un chat contigo.
  grupoWhatsApp: '',

  // Video corto de invitación (ID de YouTube, 11 caracteres). Vacío = se oculta la sección.
  video: '',

  whatsapp: '573126387467',             // tu número (para el chat de confirmación)
  presentador: 'José Lugo',

  // ID de tu píxel de Meta (solo números). Vacío = no se carga el píxel.
  pixelMeta: '',

  supabase: {
    url: 'https://ybatnimglmstcsaotntn.supabase.co',
    clave: 'sb_publishable_eIUs_tsEPOiP-F8lpLS_bQ_LukrycxP'   // clave pública: solo permite registrarse
  }
};

/* ---------- Utilidades compartidas ---------- */
window.EV = {
  rpc: function (fn, body) {
    var c = window.EVENTO.supabase;
    return fetch(c.url + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: c.clave, Authorization: 'Bearer ' + c.clave },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (t) {
        var d; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
        if (!r.ok) { var m = (d && (d.message || d.hint)) || ('Error ' + r.status); throw new Error(m); }
        return d;
      });
    });
  },
  pixel: function (evento) {
    var id = (window.EVENTO.pixelMeta || '').replace(/\D/g, '');
    if (!id) return;
    if (!window.fbq) {
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', id);
      window.fbq('track', 'PageView');
    }
    if (evento) window.fbq('track', evento);
  },
  fechaTexto: function () {
    var f = window.EVENTO.fecha; if (!f) return null;
    var d = new Date(f); if (isNaN(d)) return null;
    var dia = d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Bogota' });
    var hora = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Bogota' });
    return { dia: dia.charAt(0).toUpperCase() + dia.slice(1), hora: hora + ' (hora Colombia)', fecha: d };
  }
};

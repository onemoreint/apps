import { GA_MEASUREMENT_ID, META_PIXEL_ID } from "../config/site";

/* Carga Google Analytics y Meta Pixel solo si hay identificadores reales. */
export function initTracking() {
  if (GA_MEASUREMENT_ID) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID);
  }
  if (META_PIXEL_ID) {
    const fbq = function () {
      fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
    };
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = window._fbq = fbq;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
    window.fbq("init", META_PIXEL_ID);
    window.fbq("track", "PageView");
  }
}

/* Evento de conversión. Sin identificadores configurados no envía nada. */
export function trackJoinClick(location) {
  window.gtag?.("event", "join_whatsapp_group", { cta_location: location });
  window.fbq?.("track", "Lead", { content_name: "Grupo WhatsApp", cta_location: location });
}

export function trackFormPrepared() {
  window.gtag?.("event", "prequalification_prepared");
  window.fbq?.("trackCustom", "PrequalificationPrepared");
}

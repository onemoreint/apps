/* ONE MORE Bienestar - service worker offline */
const CACHE = "om-bienestar-v1";
const CORE = [".", "index.html", "js/app.js", "js/intro.js", "js/pwa.js",
  "manifest.webmanifest", "img/jose-hero.jpg", "img/png-painless-night-glu.jpg", "img/om-emblem.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  e.respondWith(
    caches.match(r).then(hit => hit || fetch(r).then(res => {
      try { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); } catch (_) {}
      return res;
    }).catch(() => caches.match("index.html")))
  );
});

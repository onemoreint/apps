/// Página que el Mac sirve al teléfono. Va dentro del código para que la app sea un solo
/// paquete, sin recursos sueltos ni nada que descargar de Internet.
enum WebAssets {
    static let icon = ##"""
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="#2574ff"/><g fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"><path d="M27 37l10-10"/><path d="M30 20l4-4a10 10 0 0 1 14 14l-4 4"/><path d="M34 44l-4 4a10 10 0 0 1-14-14l4-4"/></g></svg>
"""##

    static let html = ##"""
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0e15">
<title>LUGO CONNECT</title>
<link rel="icon" href="/icon.svg">
<link rel="stylesheet" href="/app.css">
</head>
<body>
<header class="top">
  <img src="/icon.svg" alt="" width="32" height="32">
  <div class="brand"><strong>LUGO</strong><span>CONNECT</span></div>
  <button id="logout" class="ghost" hidden>Desconectar</button>
</header>

<div id="offline" class="banner" role="status" hidden>Sin conexión con el Mac. Reintentando…</div>

<main>
  <section id="screen-pin" class="screen" hidden>
    <h1>Conecta tu teléfono</h1>
    <p class="muted">Escribe el PIN de 6 dígitos que aparece en tu Mac.</p>
    <form id="pin-form" autocomplete="off">
      <label for="pin" class="sr">PIN</label>
      <input id="pin" class="pin" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" autofocus>
      <button id="pin-submit" class="primary" type="submit">Conectar</button>
    </form>
    <p id="pin-error" class="error" role="alert" hidden></p>
  </section>

  <section id="screen-wait" class="screen center" hidden>
    <div class="spinner" aria-hidden="true"></div>
    <h1>Acepta en tu Mac</h1>
    <p class="muted">En la pantalla del Mac apareció un aviso. Pulsa <strong>Aceptar</strong> para continuar.</p>
  </section>

  <section id="screen-main" class="screen" hidden>
    <nav class="tabs" role="tablist">
      <button id="tab-send" class="tab" role="tab" aria-selected="true">Enviar al Mac</button>
      <button id="tab-receive" class="tab" role="tab" aria-selected="false">Recibir del Mac</button>
    </nav>

    <div id="panel-send">
      <label class="drop" for="files">
        <span class="plus" aria-hidden="true">+</span>
        <strong>Elegir archivos</strong>
        <span class="muted small">Fotos, vídeos, documentos o lo que necesites</span>
      </label>
      <input id="files" type="file" multiple class="sr">
      <p id="destination" class="muted small"></p>
      <div id="queue-head" class="row-head" hidden>
        <h2>Transferencias</h2>
        <button id="clear-done" class="ghost">Limpiar</button>
      </div>
      <ul id="queue" class="list"></ul>
      <p id="keep-open" class="muted small" hidden>Deja esta página abierta y la pantalla encendida hasta que termine.</p>
    </div>

    <div id="panel-receive" hidden>
      <div id="outbox-block" hidden>
        <h2>Enviado desde tu Mac</h2>
        <ul id="outbox" class="list"></ul>
      </div>
      <div id="browser-block">
        <div class="row-head">
          <h2 id="browser-title">Carpetas del Mac</h2>
          <button id="browser-up" class="ghost" hidden>Atrás</button>
        </div>
        <ul id="browser" class="list"></ul>
        <p id="browser-empty" class="muted small" hidden></p>
      </div>
      <p class="muted small">Se guardan en la carpeta Descargas del teléfono. Si Chrome pregunta, elige conservar el archivo.</p>
      <p id="receive-error" class="error" role="alert" hidden></p>
    </div>
  </section>
</main>

<div id="download-bar" class="bar" hidden>
  <span id="download-count"></span>
  <button id="download" class="primary">Descargar</button>
</div>
<script src="/app.js"></script>
</body>
</html>
"""##

    static let style = ##"""
:root{--bg:#0b0e15;--card:#161b26;--line:rgba(255,255,255,.09);--text:#f4f6fb;--muted:rgba(244,246,251,.64);--blue:#2574ff;--bright:#5daaff;--ok:#3cd390;--bad:#ff7a70}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{background:var(--bg)}
body{margin:0;min-height:100dvh;background:var(--bg);color:var(--text);font:16px/1.45 system-ui,-apple-system,Roboto,"Segoe UI",sans-serif;padding-bottom:calc(92px + env(safe-area-inset-bottom))}
[hidden]{display:none!important}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.top{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line)}
.top img{border-radius:8px}
.brand{display:flex;flex-direction:column;line-height:1.05}
.brand strong{font-size:13px;letter-spacing:.14em}
.brand span{font-size:10px;letter-spacing:.2em;color:var(--bright);font-weight:600}
.top .ghost{margin-left:auto}
main{max-width:620px;margin:0 auto;padding:20px 16px}
h1{font-size:25px;line-height:1.2;margin:8px 0}
h2{font-size:16px;margin:0}
p{margin:8px 0}
.muted{color:var(--muted)}
.small{font-size:14px}
.center{text-align:center;padding-top:48px}
.error{color:var(--bad);font-weight:500}
.banner{background:#4a3312;color:#ffd38a;padding:10px 16px;font-size:14px;text-align:center}
button{font:inherit;color:inherit;cursor:pointer;border:0;background:none}
button:focus-visible,input:focus-visible,.drop:focus-within{outline:2px solid var(--bright);outline-offset:2px}
.primary{background:var(--blue);color:#fff;font-weight:600;min-height:48px;padding:0 22px;border-radius:13px}
.primary:disabled{opacity:.5}
.ghost{color:var(--bright);font-size:14px;font-weight:500;min-height:44px;padding:0 8px}
.pin{display:block;width:100%;background:var(--card);border:1px solid var(--line);border-radius:14px;color:var(--text);font-size:34px;font-weight:600;letter-spacing:.32em;text-align:center;padding:14px 0 14px .32em;margin:18px 0 12px;font-variant-numeric:tabular-nums}
#pin-form .primary{width:100%}
.spinner{width:42px;height:42px;margin:0 auto 18px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--blue);animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:var(--card);padding:4px;border-radius:13px;margin-bottom:16px}
.tab{min-height:44px;border-radius:10px;font-size:15px;font-weight:500;color:var(--muted)}
.tab[aria-selected=true]{background:var(--blue);color:#fff}
.drop{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;padding:26px 16px;background:var(--card);border:1.5px dashed rgba(93,170,255,.5);border-radius:16px;cursor:pointer}
.plus{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:var(--blue);color:#fff;font-size:28px;line-height:1;margin-bottom:6px}
.row-head{display:flex;align-items:center;justify-content:space-between;min-height:44px;margin-top:16px}
.list{list-style:none;margin:6px 0;padding:0;display:grid;gap:8px}
.item{background:var(--card);border:1px solid var(--line);border-radius:13px;padding:12px 14px}
.item-top{display:flex;align-items:center;gap:10px}
.name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
.meta{display:flex;flex-wrap:wrap;gap:0 10px;color:var(--muted);font-size:13px;margin-top:3px;font-variant-numeric:tabular-nums}
.meta .ok{color:var(--ok)}
.meta .bad{color:var(--bad)}
.track{height:6px;background:rgba(255,255,255,.09);border-radius:3px;margin-top:9px;overflow:hidden}
.fill{height:100%;width:0;background:var(--blue);border-radius:3px;transition:width .2s linear}
.action{color:var(--bright);font-size:14px;font-weight:500;min-height:44px;margin:-10px -6px;padding:0 6px;flex:none}
.check-row{display:flex;align-items:center;gap:12px;min-height:44px;cursor:pointer;margin:-4px 0}
.check-row input{width:22px;height:22px;flex:none;accent-color:var(--blue);margin:0}
.check-row .body{flex:1;min-width:0}
.folder{display:flex;align-items:center;gap:12px;width:100%;text-align:left;min-height:44px;margin:-4px 0}
.folder .glyph{color:var(--bright);font-size:20px;flex:none}
.folder .name{display:block}
.bar{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;gap:12px;background:#121723;border-top:1px solid var(--line);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
@media (prefers-reduced-motion:reduce){.spinner{animation-duration:3s}.fill{transition:none}}
"""##

    static let script = ##"""
"use strict";
(function () {
  const $ = (id) => document.getElementById(id);
  const TOKEN_KEY = "lugo-token";
  const CONCURRENT = 2;
  const MAX_AUTO_RETRIES = 3;

  let token = null;
  let online = true;
  let statusTimer = null;
  let outboxSignature = "";
  const uploads = [];
  const selection = new Map();
  const browser = { folder: null, folderName: "", path: "" };

  function store(value) {
    try {
      if (value) localStorage.setItem(TOKEN_KEY, value);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* Sin almacenamiento: la sesión dura lo que dure la pestaña. */ }
  }
  function loadToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
  }

  function formatSize(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = Math.max(bytes, 0), index = 0;
    while (value >= 1000 && index < units.length - 1) { value /= 1000; index++; }
    return index === 0 ? value + " B" : value.toFixed(1) + " " + units[index];
  }
  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "";
    if (seconds < 60) return Math.ceil(seconds) + " s";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + " min " + Math.round(seconds % 60) + " s";
    return Math.floor(minutes / 60) + " h " + (minutes % 60) + " min";
  }
  function randomKey() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  async function api(path, options) {
    const settings = options || {};
    const headers = {};
    if (token) headers["X-Lugo-Token"] = token;
    if (settings.body !== undefined) headers["Content-Type"] = "application/json";
    const response = await fetch(path, {
      method: settings.method || "GET",
      headers,
      body: settings.body === undefined ? undefined : JSON.stringify(settings.body),
      cache: "no-store"
    });
    let data = {};
    try { data = await response.json(); } catch (e) { /* Respuesta sin cuerpo. */ }
    if (response.status === 401 && token) sessionEnded();
    if (!response.ok) {
      const failure = new Error(data.error || "No se pudo completar.");
      failure.status = response.status;
      failure.data = data;
      throw failure;
    }
    return data;
  }

  function show(name) {
    for (const screen of ["pin", "wait", "main"]) $("screen-" + screen).hidden = screen !== name;
    $("logout").hidden = name !== "main";
    updateDownloadBar();
  }

  function sessionEnded() {
    token = null;
    store(null);
    stopStatus();
    uploads.forEach((item) => { if (item.xhr) item.xhr.abort(); });
    selection.clear();
    $("pin").value = "";
    showPinError("La sesión terminó. Vuelve a escribir el PIN.");
    show("pin");
  }

  function showPinError(message) {
    $("pin-error").textContent = message || "";
    $("pin-error").hidden = !message;
  }

  function deviceName() {
    const match = /Android[^;)]*;\s*([^;)]+)[;)]/.exec(navigator.userAgent);
    const model = match ? match[1].replace(/\s*Build.*$/, "").trim() : "";
    if (model && model !== "K") return model;
    return /Android/.test(navigator.userAgent) ? "Teléfono Android" : "Navegador";
  }

  // ----- Emparejamiento

  async function submitPin(event) {
    if (event) event.preventDefault();
    const pin = $("pin").value.trim();
    if (pin.length !== 6) { showPinError("El PIN tiene 6 dígitos."); return; }
    $("pin-submit").disabled = true;
    showPinError("");
    try {
      const result = await api("/api/pair", { method: "POST", body: { pin, device: deviceName() } });
      show("wait");
      waitForApproval(result.requestId);
    } catch (failure) {
      $("pin").value = "";
      if (failure.status === 403 && failure.data && failure.data.attemptsLeft !== undefined) {
        showPinError("PIN incorrecto. Te quedan " + failure.data.attemptsLeft + " intentos.");
      } else if (failure.status === 429) {
        showPinError("Demasiados intentos. Espera " + formatTime(failure.data.retryAfter) + ".");
      } else if (failure.status) {
        showPinError(failure.message);
      } else {
        showPinError("No se pudo contactar con el Mac. Comprueba que estén en la misma Wi-Fi.");
      }
    } finally {
      $("pin-submit").disabled = false;
    }
  }

  async function waitForApproval(id) {
    try {
      const result = await api("/api/pair/" + encodeURIComponent(id));
      if (result.status === "approved") {
        token = result.token;
        store(token);
        enterMain();
        return;
      }
      if (result.status === "rejected") {
        showPinError("El Mac rechazó la conexión.");
        show("pin");
        return;
      }
      if (result.status === "unknown") {
        showPinError("La solicitud caducó. Escribe el PIN de nuevo.");
        show("pin");
        return;
      }
    } catch (failure) { /* Corte breve de red: se sigue esperando. */ }
    setTimeout(() => waitForApproval(id), 1200);
  }

  // ----- Pantalla principal

  function enterMain() {
    show("main");
    selectTab("send");
    refreshStatus();
    startStatus();
  }

  function selectTab(name) {
    const isSend = name === "send";
    $("tab-send").setAttribute("aria-selected", String(isSend));
    $("tab-receive").setAttribute("aria-selected", String(!isSend));
    $("panel-send").hidden = !isSend;
    $("panel-receive").hidden = isSend;
    if (!isSend) { loadOutbox(); loadBrowser(); }
    updateDownloadBar();
  }

  function startStatus() {
    stopStatus();
    statusTimer = setInterval(refreshStatus, 3000);
  }
  function stopStatus() {
    if (statusTimer) clearInterval(statusTimer);
    statusTimer = null;
  }

  async function refreshStatus() {
    if (!token) return;
    try {
      const status = await api("/api/status");
      setOnline(true);
      $("destination").textContent = status.destination
        ? "Se guardarán en la carpeta «" + status.destination + "» de tu Mac."
        : "Tu Mac aún no tiene carpeta de destino.";
      if (!$("panel-receive").hidden) loadOutbox();
    } catch (failure) {
      if (!failure.status) setOnline(false);
    }
  }

  function setOnline(value) {
    if (online === value) return;
    online = value;
    $("offline").hidden = value;
    if (value) {
      // La red volvió: se reintentan las subidas cortadas, sin que tengas que tocar nada.
      uploads.forEach((item) => {
        if (item.state === "interrupted" && item.retries < MAX_AUTO_RETRIES) {
          item.retries++;
          queueAgain(item);
        }
      });
      pump();
    }
  }

  // ----- Android → Mac

  function addFiles(list) {
    for (const file of list) {
      const item = {
        file, key: randomKey(), state: "queued", loaded: 0, speed: 0, retries: 0,
        xhr: null, message: "", finalName: "", node: null
      };
      buildUploadRow(item);
      uploads.push(item);
      $("queue").prepend(item.node.root);
      render(item);
    }
    $("queue-head").hidden = uploads.length === 0;
    pump();
  }

  function buildUploadRow(item) {
    const root = element("li", "item");
    const top = element("div", "item-top");
    const name = element("span", "name", item.file.name);
    const action = element("button", "action");
    action.type = "button";
    action.addEventListener("click", () => {
      if (item.state === "uploading" || item.state === "checking" || item.state === "queued") cancelUpload(item);
      else if (["error", "cancelled", "interrupted"].includes(item.state)) { item.retries = 0; queueAgain(item); pump(); }
    });
    top.append(name, action);
    const meta = element("div", "meta");
    const track = element("div", "track");
    const fill = element("div", "fill");
    track.append(fill);
    root.append(top, meta, track);
    item.node = { root, name, action, meta, track, fill };
  }

  function render(item) {
    const node = item.node;
    const total = item.file.size;
    const percent = total > 0 ? Math.min(item.loaded / total * 100, 100) : (item.state === "done" ? 100 : 0);
    node.fill.style.width = percent + "%";
    node.track.hidden = item.state !== "uploading" && item.state !== "checking";
    if (item.finalName) node.name.textContent = item.finalName;

    const parts = [];
    let statusClass = "";
    switch (item.state) {
      case "queued": parts.push(formatSize(total), "En cola"); break;
      case "checking": parts.push(formatSize(total), "Preparando…"); break;
      case "uploading":
        parts.push(Math.floor(percent) + "%", formatSize(item.loaded) + " de " + formatSize(total));
        if (item.speed > 0) {
          parts.push((item.speed / 1e6).toFixed(1) + " MB/s");
          parts.push("Quedan " + formatTime((total - item.loaded) / item.speed));
        }
        break;
      case "done": parts.push(formatSize(total), "Enviado"); statusClass = "ok"; break;
      case "cancelled": parts.push(formatSize(total), "Cancelado"); break;
      case "interrupted": parts.push("Conexión interrumpida"); statusClass = "bad"; break;
      case "error": parts.push(item.message || "Error"); statusClass = "bad"; break;
    }
    node.meta.replaceChildren(...parts.map((text, index) => {
      const isLast = index === parts.length - 1;
      return element("span", isLast ? statusClass : "", text);
    }));

    const busy = ["queued", "checking", "uploading"].includes(item.state);
    const canRetry = ["error", "cancelled", "interrupted"].includes(item.state);
    node.action.hidden = !busy && !canRetry;
    node.action.textContent = busy ? "Cancelar" : "Reintentar";
    node.action.setAttribute("aria-label", (busy ? "Cancelar " : "Reintentar ") + item.file.name);
    $("keep-open").hidden = !uploads.some((entry) => ["queued", "checking", "uploading"].includes(entry.state));
  }

  function queueAgain(item) {
    item.state = "queued";
    item.loaded = 0;
    item.speed = 0;
    item.message = "";
    item.key = randomKey();
    render(item);
  }

  function pump() {
    const active = uploads.filter((item) => item.state === "checking" || item.state === "uploading").length;
    let free = CONCURRENT - active;
    for (const item of uploads) {
      if (free <= 0) break;
      if (item.state === "queued") { startUpload(item); free--; }
    }
  }

  async function startUpload(item) {
    item.state = "checking";
    render(item);
    try {
      await api("/api/upload/check", { method: "POST", body: { name: item.file.name, size: item.file.size } });
    } catch (failure) {
      if (item.state !== "checking") return;
      if (failure.status) { item.state = "error"; item.message = failure.message; }
      else { item.state = "interrupted"; }
      render(item);
      pump();
      return;
    }
    if (item.state !== "checking") return;
    if (!token) return;

    const xhr = new XMLHttpRequest();
    item.xhr = xhr;
    item.state = "uploading";
    let sampleTime = performance.now();
    let sampleBytes = 0;
    const url = "/api/upload?name=" + encodeURIComponent(item.file.name) + "&key=" + item.key;
    xhr.open("PUT", url);
    xhr.setRequestHeader("X-Lugo-Token", token);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (event) => {
      item.loaded = event.loaded;
      const now = performance.now();
      const elapsed = (now - sampleTime) / 1000;
      if (elapsed >= 0.5) {
        const instant = (event.loaded - sampleBytes) / elapsed;
        item.speed = item.speed === 0 ? instant : item.speed * 0.6 + instant * 0.4;
        sampleTime = now;
        sampleBytes = event.loaded;
      }
      render(item);
    };
    xhr.onload = () => {
      item.xhr = null;
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch (e) { /* Sin cuerpo. */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        item.state = "done";
        item.loaded = item.file.size;
        item.finalName = data.name || "";
      } else if (xhr.status === 401) {
        sessionEnded();
        return;
      } else {
        item.state = "error";
        item.message = data.error || "El Mac rechazó el archivo.";
      }
      render(item);
      pump();
    };
    xhr.onerror = () => {
      item.xhr = null;
      if (item.state !== "uploading") return;
      item.state = "interrupted";
      render(item);
      // Si el Mac sigue respondiendo el corte fue puntual y se reintenta ya; si no, el
      // reintento lo dispara el aviso de que la red volvió.
      setTimeout(async () => {
        await refreshStatus();
        if (online && item.state === "interrupted" && item.retries < MAX_AUTO_RETRIES) {
          item.retries++;
          queueAgain(item);
        }
        pump();
      }, 800);
      pump();
    };
    render(item);
    xhr.send(item.file);
  }

  function cancelUpload(item) {
    const wasUploading = item.state === "uploading";
    const key = item.key;
    const xhr = item.xhr;
    item.state = "cancelled";
    item.speed = 0;
    item.xhr = null;
    render(item);
    if (wasUploading) {
      api("/api/upload/cancel", { method: "POST", body: { key } }).catch(() => {}).finally(() => {
        if (xhr) xhr.abort();
      });
    }
    pump();
  }

  function clearFinished() {
    for (let index = uploads.length - 1; index >= 0; index--) {
      if (uploads[index].state === "done" || uploads[index].state === "cancelled") {
        uploads[index].node.root.remove();
        uploads.splice(index, 1);
      }
    }
    $("queue-head").hidden = uploads.length === 0;
  }

  // ----- Mac → Android

  function fileRow(key, payload, name, size) {
    const root = element("li", "item");
    const label = element("label", "check-row");
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = selection.has(key);
    box.addEventListener("change", () => {
      if (box.checked) selection.set(key, { payload, size });
      else selection.delete(key);
      updateDownloadBar();
    });
    const body = element("span", "body");
    const title = element("span", "name", name);
    title.style.display = "block";
    const meta = element("span", "meta", formatSize(size));
    body.append(title, meta);
    label.append(box, body);
    root.append(label);
    return root;
  }

  async function loadOutbox() {
    try {
      const { items } = await api("/api/outbox");
      const signature = items.map((item) => item.id).join();
      if (signature === outboxSignature) return;
      outboxSignature = signature;
      const live = new Set(items.map((item) => "o:" + item.id));
      for (const key of Array.from(selection.keys())) {
        if (key.startsWith("o:") && !live.has(key)) selection.delete(key);
      }
      $("outbox").replaceChildren(...items.map((item) =>
        fileRow("o:" + item.id, { outbox: item.id }, item.name, item.size)));
      $("outbox-block").hidden = items.length === 0;
      updateDownloadBar();
    } catch (failure) { /* Lo avisa la comprobación de estado. */ }
  }

  async function loadBrowser() {
    $("browser-empty").hidden = true;
    $("receive-error").hidden = true;
    try {
      if (browser.folder === null) {
        const { folders } = await api("/api/folders");
        $("browser-title").textContent = "Carpetas del Mac";
        $("browser-up").hidden = true;
        $("browser").replaceChildren(...folders.map((folder) =>
          folderRow(folder.name, () => {
            browser.folder = folder.id;
            browser.folderName = folder.name;
            browser.path = "";
            loadBrowser();
          })));
        if (folders.length === 0) {
          $("browser-empty").textContent = "No hay carpetas compartidas. Puedes añadirlas en Configuración, en tu Mac.";
          $("browser-empty").hidden = false;
        }
        return;
      }
      const query = "folder=" + encodeURIComponent(browser.folder) + "&path=" + encodeURIComponent(browser.path);
      const { entries } = await api("/api/files?" + query);
      const lastPart = browser.path.split("/").pop();
      $("browser-title").textContent = lastPart || browser.folderName;
      $("browser-up").hidden = false;
      $("browser").replaceChildren(...entries.map((entry) => {
        const relative = browser.path ? browser.path + "/" + entry.name : entry.name;
        if (entry.isDir) {
          return folderRow(entry.name, () => { browser.path = relative; loadBrowser(); });
        }
        return fileRow("s:" + browser.folder + ":" + relative, { folder: browser.folder, path: relative }, entry.name, entry.size);
      }));
      if (entries.length === 0) {
        $("browser-empty").textContent = "Esta carpeta está vacía.";
        $("browser-empty").hidden = false;
      }
    } catch (failure) {
      if (failure.status) showReceiveError(failure.message);
    }
  }

  function folderRow(name, open) {
    const root = element("li", "item");
    const button = element("button", "folder");
    button.type = "button";
    const glyph = element("span", "glyph", "▸");
    glyph.setAttribute("aria-hidden", "true");
    button.append(glyph, element("span", "name", name));
    button.addEventListener("click", open);
    root.append(button);
    return root;
  }

  function goUp() {
    if (browser.path) {
      const parts = browser.path.split("/");
      parts.pop();
      browser.path = parts.join("/");
    } else {
      browser.folder = null;
    }
    loadBrowser();
  }

  function showReceiveError(message) {
    $("receive-error").textContent = message;
    $("receive-error").hidden = false;
  }

  function updateDownloadBar() {
    const visible = !$("screen-main").hidden && !$("panel-receive").hidden && selection.size > 0;
    $("download-bar").hidden = !visible;
    if (!visible) return;
    let total = 0;
    selection.forEach((entry) => { total += entry.size; });
    const count = selection.size;
    $("download-count").textContent = (count === 1 ? "1 archivo" : count + " archivos") + " · " + formatSize(total);
    $("download").textContent = count === 1 ? "Descargar" : "Descargar ZIP";
  }

  async function downloadSelected() {
    $("receive-error").hidden = true;
    $("download").disabled = true;
    try {
      const items = Array.from(selection.values(), (entry) => entry.payload);
      const ticket = await api("/api/tickets", { method: "POST", body: { items } });
      const link = document.createElement("a");
      link.href = ticket.url;
      link.download = ticket.name;
      document.body.append(link);
      link.click();
      link.remove();
      selection.clear();
      document.querySelectorAll(".check-row input").forEach((box) => { box.checked = false; });
      updateDownloadBar();
    } catch (failure) {
      showReceiveError(failure.message);
    } finally {
      $("download").disabled = false;
    }
  }

  // ----- Arranque

  async function logout() {
    try { await api("/api/logout", { method: "POST", body: {} }); } catch (e) { /* Ya no importa. */ }
    token = null;
    store(null);
    stopStatus();
    showPinError("");
    show("pin");
  }

  function wire() {
    $("pin-form").addEventListener("submit", submitPin);
    $("pin").addEventListener("input", () => {
      $("pin").value = $("pin").value.replace(/\D/g, "").slice(0, 6);
      if ($("pin").value.length === 6) submitPin();
    });
    $("tab-send").addEventListener("click", () => selectTab("send"));
    $("tab-receive").addEventListener("click", () => selectTab("receive"));
    $("files").addEventListener("change", () => {
      addFiles($("files").files);
      $("files").value = "";
    });
    $("clear-done").addEventListener("click", clearFinished);
    $("browser-up").addEventListener("click", goUp);
    $("download").addEventListener("click", downloadSelected);
    $("logout").addEventListener("click", logout);
    window.addEventListener("beforeunload", (event) => {
      if (uploads.some((item) => item.state === "uploading")) event.preventDefault();
    });
  }

  async function boot() {
    wire();
    token = loadToken();
    if (token) {
      try {
        await api("/api/status");
        if (token) { enterMain(); return; }
      } catch (failure) {
        // Sin red pero con sesión guardada: entra y deja que el aviso de conexión actúe.
        if (!failure.status && token) { enterMain(); setOnline(false); return; }
        token = null;
        store(null);
      }
    }
    show("pin");
  }

  boot();
})();
"""##
}

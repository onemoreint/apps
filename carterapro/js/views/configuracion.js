import { html, montar, $ } from '../ui/html.js';
import { encabezado, campo, mostrarErrores } from '../ui/componentes.js';
import { toast, confirmar } from '../ui/dialogos.js';
import * as config from '../services/config.js';
import { obtener } from '../services/datos.js';
import { MONEDAS } from '../core/money.js';
import { icono } from '../ui/icons.js';
import { PLANTILLAS } from '../services/whatsapp.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';

// Colores con contraste suficiente sobre blanco para texto y botones.
const COLORES = [['#0E7C66', 'Verde'], ['#1D4ED8', 'Azul'], ['#6D28D9', 'Morado'], ['#BE185D', 'Fucsia'],
  ['#B45309', 'Ámbar'], ['#B91C1C', 'Rojo'], ['#0F766E', 'Turquesa'], ['#334155', 'Grafito']];

function comprimirLogo(archivo, lado = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);
    img.onload = () => {
      const e = Math.min(1, lado / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * e); c.height = Math.round(img.height * e);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('logo')); };
    img.src = url;
  });
}

export async function render(el, _p, query) {
  const inicio = query.inicio === '1';
  const cfg = config.get();
  const { datos } = await obtener();
  const hayDatos = datos.creditos.length > 0;
  const codigo = cfg.moneda?.codigo || 'COP';

  const monedas = [...Object.values(MONEDAS).map(m => ({ valor: m.codigo, texto: `${m.codigo} · ${m.nombre}` })),
    { valor: 'OTRA', texto: 'Otra (personalizada)' }];

  montar(el, html`
    ${encabezado(inicio ? 'Configura tu negocio' : 'Configuración', {
      atras: inicio ? '#/bienvenida' : '#/mas',
      subtitulo: inicio ? 'Paso 1 de 3 · Solo toma un minuto. Podrás cambiarlo después.' : 'Datos del negocio, moneda y cobros',
    })}
    <form class="formulario" novalidate>
      <fieldset class="tarjeta">
        <legend>Tu negocio</legend>
        ${campo({ etiqueta: 'Nombre del negocio', nombre: 'nombreNegocio', valor: cfg.nombreNegocio, requerido: true, attrs: 'maxlength="60" autocomplete="organization"' })}
        <div class="rejilla-2">
          ${campo({ etiqueta: 'Teléfono', nombre: 'telefono', valor: cfg.telefono, tipo: 'tel', attrs: 'autocomplete="tel"' })}
          ${campo({ etiqueta: 'Correo', nombre: 'email', valor: cfg.email, tipo: 'email', attrs: 'autocomplete="email"' })}
        </div>
        ${campo({ etiqueta: 'Dirección', nombre: 'direccion', valor: cfg.direccion })}
      </fieldset>

      ${inicio ? '' : html`<fieldset class="tarjeta">
        <legend>Apariencia</legend>
        <div class="foto-campo">
          <span id="logo-vista">${cfg.logo ? html`<img class="logo-vista" src="${cfg.logo}" alt="Logo actual">` : html`<span class="marca-logo marca-logo-xl" aria-hidden="true">C</span>`}</span>
          <label class="btn btn-sec btn-sm">${icono('camara')}<span>${cfg.logo ? 'Cambiar logo' : 'Subir logo'}</span>
            <input type="file" accept="image/*" id="logo" class="oculto-visual"></label>
          ${cfg.logo ? html`<button type="button" class="btn-link" id="quitar-logo">Quitar logo</button>` : ''}
          <small class="campo-ayuda">Aparece en los recibos y en la pantalla de bloqueo.</small>
        </div>
        ${campo({ etiqueta: 'Tema', nombre: 'tema', valor: cfg.tema, opciones: [
          { valor: 'auto', texto: 'Automático (según el teléfono)' }, { valor: 'claro', texto: 'Claro' }, { valor: 'oscuro', texto: 'Oscuro' }] })}
        <div class="campo" data-campo="colorPrincipal">
          <span class="campo-etiqueta" id="lbl-color">Color principal</span>
          <div class="colores" role="radiogroup" aria-labelledby="lbl-color">
            ${COLORES.map(([c, n]) => html`<label class="color" title="${n}"><input type="radio" name="colorPrincipal" value="${c}" ${c.toLowerCase() === (cfg.colorPrincipal || '').toLowerCase() ? 'checked' : ''}><span style="background:${c}"></span><span class="oculto-visual">${n}</span></label>`)}
          </div>
        </div>
      </fieldset>`}

      <fieldset class="tarjeta">
        <legend>País y moneda</legend>
        <div class="rejilla-2">
          ${campo({ etiqueta: 'País', nombre: 'pais', valor: cfg.pais, opciones: Object.entries(config.PAISES).map(([k, p]) => ({ valor: k, texto: p.nombre })), ayuda: 'Se usa para el indicativo de WhatsApp.' })}
          ${campo({ etiqueta: 'Moneda', nombre: 'moneda', valor: codigo, opciones: monedas })}
        </div>
        <div class="rejilla-2 ${codigo === 'OTRA' ? '' : 'oculto'}" id="moneda-otra">
          ${campo({ etiqueta: 'Símbolo', nombre: 'simbolo', valor: cfg.moneda?.simbolo || '$', attrs: 'maxlength="4"' })}
          ${campo({ etiqueta: 'Decimales', nombre: 'decimales', valor: cfg.moneda?.decimales ?? 2, opciones: [{ valor: 0, texto: 'Sin decimales' }, { valor: 2, texto: '2 decimales' }] })}
        </div>
        ${hayDatos ? html`<p class="aviso aviso-amarillo">Si cambias la moneda, los valores ya registrados no se convierten: solo cambia cómo se muestran.</p>` : ''}
        ${campo({ etiqueta: 'Formato de fecha', nombre: 'formatoFecha', valor: cfg.formatoFecha, opciones: [
          { valor: 'DD/MM/YYYY', texto: 'Día/Mes/Año (31/12/2026)' },
          { valor: 'MM/DD/YYYY', texto: 'Mes/Día/Año (12/31/2026)' },
          { valor: 'YYYY-MM-DD', texto: 'Año-Mes-Día (2026-12-31)' }] })}
      </fieldset>

      <fieldset class="tarjeta">
        <legend>Cobros</legend>
        ${campo({ etiqueta: 'Días de gracia por defecto', nombre: 'diasGracia', valor: cfg.diasGracia, tipo: 'number', attrs: 'min="0" max="60" inputmode="numeric"', ayuda: 'Días después del vencimiento antes de marcar una cuota como vencida. Cada crédito puede cambiarlo.' })}
        ${campo({ etiqueta: 'Métodos de pago', nombre: 'metodosPago', valor: cfg.metodosPago.join('\n'), tipo: 'textarea', ayuda: 'Uno por línea. Aparecerán al registrar un pago.' })}
      </fieldset>

      ${inicio ? '' : html`<fieldset class="tarjeta">
        <legend>Mensajes de WhatsApp</legend>
        <p class="campo-ayuda bloque">Variables disponibles: {nombre} {valor} {fecha} {cuota} {recibo} {saldo} {negocio}. Deja un mensaje vacío para usar el texto original. Mantén un tono respetuoso: la cobranza abusiva está prohibida en muchos países.</p>
        ${Object.entries(PLANTILLAS).map(([k, p]) => campo({ etiqueta: p.nombre, nombre: `wa_${k}`, tipo: 'textarea', valor: cfg.plantillasWhatsApp?.[k] || p.texto }))}
      </fieldset>`}

      <div class="barra-acciones">
        <button class="btn btn-pri btn-lg" type="submit">${inicio ? 'Continuar' : 'Guardar cambios'}</button>
      </div>
    </form>`);

  const form = $('form', el);
  let logo = cfg.logo || null;
  $('#logo', el)?.addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      logo = await comprimirLogo(f);
      montar($('#logo-vista', el), html`<img class="logo-vista" src="${logo}" alt="Logo nuevo">`);
    } catch { toast('No pudimos leer esa imagen.', 'error'); }
  });
  $('#quitar-logo', el)?.addEventListener('click', () => {
    logo = null;
    montar($('#logo-vista', el), html`<span class="marca-logo marca-logo-xl" aria-hidden="true">C</span>`);
  });
  // Vista previa inmediata del color y el tema.
  form.addEventListener('change', e => {
    if (e.target.name === 'colorPrincipal') document.documentElement.style.setProperty('--primario', e.target.value);
    if (e.target.name === 'tema') document.documentElement.dataset.tema = e.target.value;
  });
  form.pais.addEventListener('change', async () => {
    const p = config.PAISES[form.pais.value];
    if (!hayDatos) form.moneda.value = p.moneda;
    form.moneda.dispatchEvent(new Event('change'));
    if (await confirmar({ titulo: '¿Usar los métodos de pago de ' + p.nombre + '?', mensaje: p.metodos.join(', '), aceptar: 'Sí, usarlos', cancelar: 'Mantener los actuales' })) {
      form.metodosPago.value = p.metodos.join('\n');
    }
  });
  form.moneda.addEventListener('change', () => $('#moneda-otra', el).classList.toggle('oculto', form.moneda.value !== 'OTRA'));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const errores = {};
    if (f.nombreNegocio.trim().length < 2) errores.nombreNegocio = 'Escribe el nombre de tu negocio.';
    const gracia = Number(f.diasGracia);
    if (!Number.isInteger(gracia) || gracia < 0 || gracia > 60) errores.diasGracia = 'Entre 0 y 60 días.';
    const metodos = [...new Set(f.metodosPago.split('\n').map(s => s.trim()).filter(Boolean))];
    if (!metodos.length) errores.metodosPago = 'Agrega al menos un método de pago.';
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) errores.email = 'Revisa el correo.';
    mostrarErrores(form, errores);
    if (Object.keys(errores).length) return;

    const plantillasWhatsApp = {};
    for (const k of Object.keys(PLANTILLAS)) {
      const v = (f[`wa_${k}`] || '').trim();
      if (v && v !== PLANTILLAS[k].texto) plantillasWhatsApp[k] = v;
    }

    await intentar(() => config.guardar({
      configurado: true,
      plantillasWhatsApp,
      ...(inicio ? {} : { logo, tema: f.tema, colorPrincipal: f.colorPrincipal || cfg.colorPrincipal }),
      nombreNegocio: f.nombreNegocio.trim(), telefono: f.telefono.trim(), email: f.email.trim(), direccion: f.direccion.trim(),
      pais: f.pais, formatoFecha: f.formatoFecha, diasGracia: gracia, metodosPago: metodos,
      moneda: f.moneda === 'OTRA' ? { codigo: 'OTRA', simbolo: f.simbolo.trim() || '$', decimales: Number(f.decimales) } : { codigo: f.moneda },
    }), 'guardar la configuración');
    toast('Configuración guardada.');
    ir(inicio ? '/clientes/nuevo?inicio=1' : '/mas');
  });

  // Si sale sin guardar, se descarta la vista previa de color y tema.
  return () => { config.cargar(); };
}

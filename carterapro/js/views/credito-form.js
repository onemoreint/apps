import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, campo, mostrarErrores, vacio } from '../ui/componentes.js';
import { confirmar, toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as creditos from '../services/creditos.js';
import * as config from '../services/config.js';
import { TIPOS_INTERES, porcentajeABp } from '../domain/interes.js';
import { FRECUENCIAS, primerVencimientoSugerido } from '../domain/cuotas.js';
import { aMinimo, aTextoInput, formatear as dinero, getMoneda } from '../core/money.js';
import { hoy as fechaHoy, formatear as fecha } from '../core/dates.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el, _p, query) {
  const { datos } = await obtener();
  const lista = [...datos.clientes].sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es'));
  const inicio = query.inicio === '1';
  const hoy = fechaHoy();
  const cfg = config.get();

  if (!lista.length) {
    montar(el, html`${encabezado('Nuevo crédito', { atras: '#/creditos' })}
      ${vacio({ ico: 'clientes', titulo: 'Primero crea un cliente', texto: 'Cada crédito pertenece a un cliente.', accion: { href: '#/clientes/nuevo?volver=credito', texto: 'Crear cliente' } })}`);
    return;
  }

  const clienteInicial = lista.find(c => c.id === query.cliente)?.id || '';
  const atras = clienteInicial && !inicio ? `#/clientes/${clienteInicial}` : '#/creditos';
  const simbolo = getMoneda().simbolo;

  montar(el, html`
    ${encabezado('Nuevo crédito', { atras, subtitulo: inicio ? 'Paso 3 de 3 · Registra el primer préstamo' : '' })}
    <form class="formulario formulario-credito" novalidate>
      <div class="form-principal">
        <fieldset class="tarjeta">
          <legend>¿A quién le prestas?</legend>
          ${campo({ etiqueta: 'Cliente', nombre: 'clienteId', valor: clienteInicial, requerido: true,
            opciones: [{ valor: '', texto: 'Selecciona un cliente…' }, ...lista.map(c => ({ valor: c.id, texto: `${c.nombreCompleto} · ${c.telefono}` }))] })}
          <a class="enlace" href="#/clientes/nuevo?volver=credito">${icono('mas_circulo')} Crear un cliente nuevo</a>
        </fieldset>

        <fieldset class="tarjeta">
          <legend>Préstamo e interés</legend>
          ${campo({ etiqueta: `Monto prestado (${simbolo})`, nombre: 'monto', requerido: true, attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ej: 1.000.000"' })}
          <div class="campo" data-campo="tipoInteres">
            <span class="campo-etiqueta" id="lbl-tipo">Tipo de interés</span>
            <div class="opciones-tarjeta" role="radiogroup" aria-labelledby="lbl-tipo">
              ${Object.entries(TIPOS_INTERES).map(([k, t], i) => html`<label class="opcion">
                <input type="radio" name="tipoInteres" value="${k}" ${i === 0 ? 'checked' : ''}>
                <span><strong>${t.corto}</strong></span></label>`)}
            </div>
            <div class="explicacion" id="explicacion" aria-live="polite"></div>
            <small class="campo-error" role="alert"></small>
          </div>
          <div id="grupo-tasa">${campo({ etiqueta: 'Porcentaje (%)', nombre: 'tasa', attrs: 'inputmode="decimal" autocomplete="off" placeholder="Ej: 10"' })}</div>
          <div id="grupo-fijo" class="oculto">${campo({ etiqueta: `Valor del interés (${simbolo})`, nombre: 'interesFijo', attrs: 'inputmode="decimal" autocomplete="off"' })}</div>
        </fieldset>

        <fieldset class="tarjeta">
          <legend>Cuotas y fechas</legend>
          <div class="campo" data-campo="frecuencia">
            <span class="campo-etiqueta" id="lbl-frec">¿Cada cuánto paga?</span>
            <div class="segmentado" role="radiogroup" aria-labelledby="lbl-frec">
              ${Object.entries(FRECUENCIAS).map(([k, f]) => html`<label><input type="radio" name="frecuencia" value="${k}" ${k === 'DIARIA' ? 'checked' : ''}><span>${f.nombre}</span></label>`)}
            </div>
            <small class="campo-error" role="alert"></small>
          </div>
          <label class="check" id="grupo-domingos"><input type="checkbox" name="excluirDomingos"><span>No cobrar los domingos</span></label>
          <div class="rejilla-2">
            ${campo({ etiqueta: 'Número de cuotas', nombre: 'numeroCuotas', tipo: 'number', valor: '20', requerido: true, attrs: 'min="1" max="1000" inputmode="numeric"' })}
            ${campo({ etiqueta: 'Días de gracia', nombre: 'diasGracia', tipo: 'number', valor: String(cfg.diasGracia || 0), attrs: 'min="0" max="60" inputmode="numeric"', ayuda: 'Días tras el vencimiento antes de marcarla vencida.' })}
          </div>
          <div class="rejilla-2">
            ${campo({ etiqueta: 'Fecha del préstamo', nombre: 'fechaInicio', tipo: 'date', valor: hoy, requerido: true })}
            ${campo({ etiqueta: 'Primera cuota vence', nombre: 'fechaPrimerVencimiento', tipo: 'date', valor: primerVencimientoSugerido(hoy, 'DIARIA'), requerido: true })}
          </div>
          ${campo({ etiqueta: 'Notas', nombre: 'notas', tipo: 'textarea' })}
        </fieldset>
      </div>

      <aside class="form-resumen">
        <div class="tarjeta resumen-credito" id="resumen" aria-live="polite"></div>
        <button class="btn btn-pri btn-lg btn-bloque" type="submit">${icono('check')}<span>Crear crédito</span></button>
      </aside>
    </form>`);

  const form = $('form', el);
  let fechaEditada = false;

  const leer = () => {
    const tipo = form.tipoInteres.value;
    return {
      clienteId: form.clienteId.value,
      montoPrestado: aMinimo(form.monto.value),
      tipoInteres: tipo,
      tasaBp: TIPOS_INTERES[tipo]?.usaTasa ? porcentajeABp(form.tasa.value) : 0,
      interesFijo: tipo === 'FIJO' ? (form.interesFijo.value.trim() ? aMinimo(form.interesFijo.value) : NaN) : 0,
      numeroCuotas: Number(form.numeroCuotas.value),
      frecuencia: form.frecuencia.value,
      excluirDomingos: form.excluirDomingos.checked && form.frecuencia.value === 'DIARIA',
      fechaInicio: form.fechaInicio.value,
      fechaPrimerVencimiento: form.fechaPrimerVencimiento.value,
      diasGracia: Number(form.diasGracia.value || 0),
      notas: form.notas.value,
    };
  };

  const actualizar = () => {
    const tipo = form.tipoInteres.value;
    const t = TIPOS_INTERES[tipo];
    montar($('#explicacion', el), html`${icono('info')}<span><strong>${t.nombre}.</strong> ${t.explicacion}<br><em>${t.ejemplo}</em></span>`);
    $('#grupo-tasa', el).classList.toggle('oculto', !t.usaTasa);
    $('#grupo-fijo', el).classList.toggle('oculto', tipo !== 'FIJO');
    const frec = form.frecuencia.value;
    $('#grupo-domingos', el).classList.toggle('oculto', frec !== 'DIARIA');
    $('#grupo-tasa .campo-etiqueta', el).firstChild.textContent =
      tipo === 'PCT_PERIODO' ? `Porcentaje por ${FRECUENCIAS[frec].unidad} (%)` : 'Porcentaje (%)';
    if (!fechaEditada && form.fechaInicio.value) {
      form.fechaPrimerVencimiento.value = primerVencimientoSugerido(form.fechaInicio.value, frec, form.excluirDomingos.checked);
    }
    pintarResumen(leer());
  };

  const pintarResumen = e => {
    const sim = creditos.simular(e);
    const caja = $('#resumen', el);
    if (Object.keys(sim.errores).length) {
      const faltan = Object.keys(sim.errores).filter(k => k !== 'clienteId');
      montar(caja, html`<h2>Resumen</h2><p class="resumen-vacio">${icono('info')} ${faltan.length
        ? 'Completa el monto, el interés y las cuotas para ver el cálculo.'
        : 'Selecciona el cliente para continuar.'}</p>`);
      if (faltan.length) return;
    }
    const s = Object.keys(sim.errores).length ? creditos.simular({ ...e, clienteId: 'x' }) : sim;
    const muestras = s.cuotas.length <= 4 ? s.cuotas : [...s.cuotas.slice(0, 3), null, s.cuotas.at(-1)];
    montar(caja, html`<h2>Resumen</h2>
      <dl class="resumen-cifras">
        <div><dt>Capital</dt><dd class="dinero">${dinero(e.montoPrestado, { ocultable: false })}</dd></div>
        <div><dt>Interés</dt><dd class="dinero">${dinero(s.interesTotal, { ocultable: false })}</dd></div>
        <div class="total"><dt>Total a pagar</dt><dd class="dinero">${dinero(s.totalAPagar, { ocultable: false })}</dd></div>
      </dl>
      <p class="resumen-cuota"><span>${e.numeroCuotas} ${e.numeroCuotas === 1 ? 'cuota' : 'cuotas'} ${FRECUENCIAS[e.frecuencia].nombre.toLowerCase()}${e.numeroCuotas === 1 ? '' : 's'} de</span>
        <strong class="dinero">${dinero(s.valorCuota, { ocultable: false })}</strong></p>
      ${s.ultimaDistinta != null ? html`<p class="resumen-nota">La última cuota es de ${dinero(s.ultimaDistinta, { ocultable: false })} para ajustar el redondeo.</p>` : ''}
      <ol class="mini-tabla">${muestras.map(c => c
        ? html`<li><span>Cuota ${c.numero}</span><span>${fecha(c.fechaVencimiento)}</span><b class="dinero">${dinero(c.valorProgramado, { ocultable: false })}</b></li>`
        : html`<li class="elipsis" aria-hidden="true">⋯</li>`)}</ol>
      <p class="resumen-nota">Termina el ${fecha(s.fechaUltimoVencimiento)}.</p>`);
  };

  form.addEventListener('input', e => {
    if (e.target.name === 'fechaPrimerVencimiento') fechaEditada = true;
    actualizar();
  });
  form.addEventListener('change', actualizar);
  for (const nombre of ['monto', 'interesFijo']) {
    form[nombre].addEventListener('blur', () => {
      const v = aMinimo(form[nombre].value);
      if (Number.isFinite(v) && v > 0) form[nombre].value = aTextoInput(v);
    });
  }
  actualizar();

  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    const e = leer();
    const sim = creditos.simular(e);
    const errores = { ...sim.errores };
    if (errores.montoPrestado) errores.monto = errores.montoPrestado;
    mostrarErrores(form, errores);
    if (Object.keys(errores).length) {
      toast('Revisa los campos marcados.', 'error');
      return;
    }
    const cliente = lista.find(c => c.id === e.clienteId);
    const ok = await confirmar({
      titulo: '¿Crear este crédito?',
      detalle: html`<div class="resumen-confirmacion">
        <strong>${cliente.nombreCompleto}</strong>
        <span>Presta ${dinero(e.montoPrestado, { ocultable: false })} · paga ${dinero(sim.totalAPagar, { ocultable: false })}</span>
        <span>${e.numeroCuotas} cuotas de ${dinero(sim.valorCuota, { ocultable: false })} · desde ${fecha(e.fechaPrimerVencimiento)}</span>
      </div>`,
      aceptar: 'Crear crédito',
    });
    if (!ok) return;
    const credito = await intentar(() => creditos.crear(e), 'crear el crédito');
    toast(`Crédito ${creditos.formatoNumero(credito.numero)} creado con ${credito.numeroCuotas} cuotas.`);
    ir(`/creditos/${credito.id}`);
  });
}

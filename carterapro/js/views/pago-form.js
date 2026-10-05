import { html, montar, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, campo, mostrarErrores, avatar, badge, filaLista, vacio, botonWhatsApp } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as pagosSrv from '../services/pagos.js';
import * as config from '../services/config.js';
import * as wa from '../services/whatsapp.js';
import { formatoNumero } from '../services/creditos.js';
import { distribuirPago, montoHastaCuota, saldoCuota } from '../domain/pagos.js';
import { validarPago, normalizarTexto, soloDigitos } from '../domain/validaciones.js';
import { aMinimo, aTextoInput, formatear as dinero } from '../core/money.js';
import { formatear as fecha } from '../core/dates.js';
import { ir } from '../core/router.js';
import { intentar } from '../core/errors.js';

const vigente = i => !i.credito.cancelado && i.resumen.saldoTotal > 0;

export async function render(el, _p, query) {
  const { analisis, hoy } = await obtener();

  if (query.credito) {
    const info = analisis.creditos.get(query.credito);
    if (!info || !vigente(info)) {
      montar(el, html`${encabezado('Registrar pago', { atras: '#/pagos' })}${vacio({ ico: 'check', titulo: 'Este crédito no tiene saldo pendiente', accion: { href: '#/pagos/nuevo', texto: 'Elegir otro' } })}`);
      return;
    }
    return formulario(el, info, Number(query.cuota) || null, hoy);
  }

  if (query.cliente) {
    const ic = analisis.clientes.get(query.cliente);
    const activos = (ic?.creditos || []).filter(vigente);
    if (activos.length === 1) { ir(`/pagos/nuevo?credito=${activos[0].credito.id}`, { reemplazar: true }); return; }
    montar(el, html`${encabezado('¿Qué crédito paga?', { atras: '#/pagos/nuevo', subtitulo: ic?.cliente.nombreCompleto })}
      ${activos.length ? html`<div class="lista">${activos.map(i => filaLista({
        href: `#/pagos/nuevo?credito=${i.credito.id}`,
        izquierda: html`<span class="num-credito">${formatoNumero(i.credito.numero)}</span>`,
        titulo: `Prestado ${dinero(i.credito.montoPrestado)}`,
        sub: `${i.resumen.cuotasPagadas}/${i.resumen.totalCuotas} cuotas pagadas`,
        derecha: html`<strong class="dinero">${dinero(i.resumen.saldoTotal)}</strong>`,
        derechaSub: badge(i.resumen.visual),
      }))}</div>` : vacio({ ico: 'check', titulo: 'Este cliente no tiene saldos pendientes' })}`);
    return;
  }

  return elegirCliente(el, analisis);
}

function elegirCliente(el, analisis) {
  const conSaldo = [...analisis.clientes.values()].filter(ic => ic.creditos.some(vigente))
    .sort((a, b) => (b.vencido - a.vencido) || a.cliente.nombreCompleto.localeCompare(b.cliente.nombreCompleto, 'es'));
  montar(el, html`${encabezado('Registrar pago', { atras: '#/', subtitulo: '¿Quién está pagando?' })}
    ${conSaldo.length ? html`
      <div class="buscador">${icono('buscar')}<input type="search" class="input" id="buscar" placeholder="Buscar cliente" aria-label="Buscar cliente" autocomplete="off" autofocus></div>
      <div class="lista" id="lista"></div>`
    : vacio({ ico: 'check', titulo: 'No hay saldos por cobrar', texto: 'Cuando crees un crédito podrás registrar sus pagos aquí.', accion: { href: '#/creditos/nuevo', texto: 'Crear crédito' } })}`);
  if (!conSaldo.length) return;
  const input = $('#buscar', el);
  const pintar = () => {
    const q = normalizarTexto(input.value);
    const d = soloDigitos(input.value);
    const lista = conSaldo.filter(ic => !q || normalizarTexto(ic.cliente.nombreCompleto).includes(q) || (d.length >= 3 && soloDigitos(ic.cliente.telefono).includes(d)));
    montar($('#lista', el), html`${lista.map(ic => filaLista({
      href: `#/pagos/nuevo?cliente=${ic.cliente.id}`,
      izquierda: avatar(ic.cliente), titulo: ic.cliente.nombreCompleto,
      sub: ic.vencido ? `Vencido ${dinero(ic.vencido)}` : ic.cliente.telefono,
      derecha: html`<strong class="dinero">${dinero(ic.saldo)}</strong>`, derechaSub: badge(ic.visual),
    }))}`);
  };
  input.addEventListener('input', pintar);
  pintar();
}

function formulario(el, info, cuotaElegida, hoy) {
  const { credito: k, cliente, cuotas, resumen: r } = info;
  const pendientes = cuotas.filter(c => saldoCuota(c) > 0);
  const objetivo = pendientes.find(c => c.numero === cuotaElegida) || pendientes[0];
  const sugerencias = [
    { texto: objetivo.numero === pendientes[0].numero ? `Cuota ${objetivo.numero}` : `Hasta cuota ${objetivo.numero}`, valor: montoHastaCuota(cuotas, objetivo.numero) },
    r.montoVencido > 0 && { texto: 'Todo lo vencido', valor: r.montoVencido },
    { texto: 'Saldo total', valor: r.saldoTotal },
  ].filter(Boolean).filter((s, i, a) => a.findIndex(x => x.valor === s.valor) === i);
  const metodos = config.get().metodosPago;

  montar(el, html`
    ${encabezado('Registrar pago', { atras: `#/creditos/${k.id}` })}
    <form class="formulario formulario-pago" novalidate>
      <div class="tarjeta pago-credito">
        ${avatar(cliente)}
        <span><strong>${cliente?.nombreCompleto}</strong><small>Crédito ${formatoNumero(k.numero)} · saldo ${dinero(r.saldoTotal)}</small></span>
        ${badge(r.visual)}
      </div>

      <div class="tarjeta">
        ${campo({ etiqueta: 'Valor recibido', nombre: 'monto', valor: aTextoInput(sugerencias[0].valor), requerido: true, attrs: 'inputmode="decimal" autocomplete="off"' })}
        <div class="chips chips-sugerencia" aria-label="Valores sugeridos">
          ${sugerencias.map(s => html`<button type="button" class="chip" data-valor="${s.valor}">${s.texto} · <span class="dinero">${dinero(s.valor, { ocultable: false })}</span></button>`)}
        </div>
        <div class="aplicacion" id="aplicacion" aria-live="polite"></div>
      </div>

      <div class="tarjeta">
        <div class="campo" data-campo="metodoPago">
          <span class="campo-etiqueta" id="lbl-metodo">Método de pago</span>
          <div class="segmentado segmentado-flex" role="radiogroup" aria-labelledby="lbl-metodo">
            ${metodos.map((m, i) => html`<label><input type="radio" name="metodoPago" value="${m}" ${i === 0 ? 'checked' : ''}><span>${m}</span></label>`)}
          </div>
          <small class="campo-error" role="alert"></small>
        </div>
        <div class="rejilla-2">
          ${campo({ etiqueta: 'Fecha del pago', nombre: 'fecha', tipo: 'date', valor: hoy, requerido: true, attrs: `max="${hoy}"` })}
          ${campo({ etiqueta: 'Observación', nombre: 'observacion', attrs: 'maxlength="200" placeholder="Opcional"' })}
        </div>
      </div>

      <div class="barra-acciones">
        <button class="btn btn-pri btn-lg btn-bloque" type="submit">${icono('check')}<span>Guardar pago</span></button>
      </div>
    </form>`);

  const form = $('form', el);
  form.monto.classList.add('input-grande');
  const vista = () => {
    const monto = aMinimo(form.monto.value);
    const caja = $('#aplicacion', el);
    if (!Number.isFinite(monto) || monto <= 0) { montar(caja, ''); return; }
    if (monto > r.saldoTotal) {
      montar(caja, html`<p class="aviso aviso-rojo">${icono('alerta')} Supera el saldo del crédito (${dinero(r.saldoTotal, { ocultable: false })}).</p>`);
      return;
    }
    const { aplicaciones, saldoDespues } = distribuirPago(cuotas, monto);
    montar(caja, html`<h3>Así se aplicará</h3>
      <ul>${aplicaciones.map(a => html`<li><span>Cuota ${a.numeroCuota}</span>
        <span class="${a.liquida ? 'verde' : 'naranja'}">${a.liquida ? 'Queda pagada' : 'Abono parcial'}</span>
        <b class="dinero">${dinero(a.monto, { ocultable: false })}</b></li>`)}</ul>
      <p class="aplicacion-saldo">Saldo después del pago: <strong class="dinero">${dinero(saldoDespues, { ocultable: false })}</strong></p>`);
  };
  form.monto.addEventListener('input', vista);
  form.monto.addEventListener('blur', () => {
    const v = aMinimo(form.monto.value);
    if (Number.isFinite(v) && v > 0) form.monto.value = aTextoInput(v);
  });
  el.querySelectorAll('[data-valor]').forEach(b => b.addEventListener('click', () => {
    form.monto.value = aTextoInput(Number(b.dataset.valor));
    vista();
  }));
  vista();

  let enviando = false;
  form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (enviando) return;
    const datos = { monto: aMinimo(form.monto.value), fecha: form.fecha.value, metodoPago: form.metodoPago.value, observacion: form.observacion.value };
    const errores = validarPago(datos, { saldo: r.saldoTotal, hoy });
    mostrarErrores(form, errores);
    if (Object.keys(errores).length) return;
    enviando = true;
    try {
      const { pago, saldoDespues } = await intentar(() => pagosSrv.registrar({ creditoId: k.id, ...datos }), 'guardar este pago');
      exito(el, { pago, saldoDespues, info });
    } catch {
      enviando = false;
    }
  });
}

function exito(el, { pago, saldoDespues, info }) {
  const { credito: k, cliente } = info;
  const cuotas = pago.aplicaciones.map(a => a.numeroCuota);
  const mensaje = wa.generar('confirmacion', { cliente, valor: pago.monto, fecha: pago.fecha, recibo: pago.numeroRecibo, saldo: saldoDespues });
  toast('Pago registrado.');
  montar(el, html`<section class="exito">
    <span class="exito-ico">${icono('check')}</span>
    <h1>Pago registrado</h1>
    <p class="exito-monto dinero">${dinero(pago.monto, { ocultable: false })}</p>
    <dl class="tarjeta datos recibo-datos">
      <div><dt>Recibo</dt><dd><strong>${pago.numeroRecibo}</strong></dd></div>
      <div><dt>Cliente</dt><dd>${cliente?.nombreCompleto}</dd></div>
      <div><dt>Crédito</dt><dd>${formatoNumero(k.numero)}</dd></div>
      <div><dt>${cuotas.length > 1 ? 'Cuotas' : 'Cuota'}</dt><dd>${cuotas.join(', ')}</dd></div>
      <div><dt>Fecha</dt><dd>${fecha(pago.fecha)}</dd></div>
      <div><dt>Método</dt><dd>${pago.metodoPago}</dd></div>
      <div><dt>Saldo restante</dt><dd><strong class="dinero">${dinero(saldoDespues, { ocultable: false })}</strong></dd></div>
    </dl>
    ${saldoDespues === 0 ? html`<p class="aviso aviso-azul">${icono('check')} ¡Este crédito quedó totalmente pagado!</p>` : ''}
    <div class="exito-botones">
      ${botonWhatsApp(cliente, mensaje, 'Enviar confirmación')}
      <a class="btn btn-sec" href="#/recibos/${pago.id}">${icono('recibo')}<span>Ver recibo</span></a>
      <a class="btn btn-sec" href="#/creditos/${k.id}">Ver crédito</a>
      <a class="btn btn-sec" href="#/pagos/nuevo">Registrar otro pago</a>
      <a class="btn btn-texto" href="#/">Ir al inicio</a>
    </div>
  </section>`);
  window.scrollTo(0, 0);
}

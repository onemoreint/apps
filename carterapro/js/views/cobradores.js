import { html, montar, acciones, $ } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, campo, mostrarErrores, seccion, vacio } from '../ui/componentes.js';
import { pedirTexto, toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as cobradores from '../services/cobradores.js';
import { formatear as dinero } from '../core/money.js';
import { recargar } from '../core/router.js';
import { intentar } from '../core/errors.js';

export async function render(el) {
  const { analisis } = await obtener();
  const lista = cobradores.lista();
  const cartera = new Map();
  for (const { credito, resumen } of analisis.creditos.values()) {
    if (credito.cancelado || resumen.saldoTotal <= 0) continue;
    const k = credito.cobradorId || '';
    const c = cartera.get(k) || { creditos: 0, saldo: 0, vencido: 0 };
    c.creditos++; c.saldo += resumen.saldoTotal; c.vencido += resumen.montoVencido;
    cartera.set(k, c);
  }
  const fila = c => {
    const x = cartera.get(c.id) || { creditos: 0, saldo: 0, vencido: 0 };
    return html`<li class="fila fila-estatica ${c.activo === false ? 'inactivo' : ''}">
      <span class="avatar" aria-hidden="true">${c.nombre.slice(0, 2).toUpperCase()}</span>
      <span class="fila-texto"><strong>${c.nombre}${c.activo === false ? ' · inactivo' : ''}</strong>
        <small>${x.creditos} ${x.creditos === 1 ? 'crédito activo' : 'créditos activos'} · cartera ${dinero(x.saldo)}${x.vencido ? html` · <span class="rojo">vencido ${dinero(x.vencido)}</span>` : ''}</small>
        ${c.telefono ? html`<small>${c.telefono}</small>` : ''}</span>
      <span class="fila-botones">
        <a class="btn btn-sec btn-xs" href="#/ruta?cobrador=${c.id}">${icono('ruta')}<span>Ruta</span></a>
        <button type="button" class="btn btn-sec btn-xs" data-accion="renombrar" data-id="${c.id}">Editar</button>
        <button type="button" class="btn btn-texto btn-xs" data-accion="activo" data-id="${c.id}">${c.activo === false ? 'Activar' : 'Desactivar'}</button>
      </span>
    </li>`;
  };
  const sinAsignar = cartera.get('');

  montar(el, html`
    ${encabezado('Cobradores', { atras: '#/mas', subtitulo: 'Asigna créditos y liquida la caja de cada uno' })}
    <form class="tarjeta formulario-linea" novalidate>
      ${campo({ etiqueta: 'Nombre del cobrador', nombre: 'nombre', requerido: true, attrs: 'maxlength="40" autocomplete="off"' })}
      ${campo({ etiqueta: 'Teléfono', nombre: 'telefono', tipo: 'tel', attrs: 'inputmode="tel"' })}
      <button class="btn btn-pri" type="submit">${icono('mas_circulo')}<span>Agregar</span></button>
    </form>
    ${lista.length
      ? seccion('Equipo de cobro', html`<ul class="lista">${lista.map(fila)}</ul>`, { contador: lista.length })
      : vacio({ ico: 'clientes', titulo: 'Aún no tienes cobradores', texto: 'Si cobras tú mismo no necesitas crearlos. Si tienes personas en la calle, agrégalas para asignarles créditos, darles base y cerrar su caja cada día.' })}
    ${sinAsignar ? html`<p class="aviso aviso-gris">${icono('info')} ${sinAsignar.creditos} ${sinAsignar.creditos === 1 ? 'crédito activo no tiene' : 'créditos activos no tienen'} cobrador asignado (${dinero(sinAsignar.saldo)}). Puedes asignarlo desde cada crédito.</p>` : ''}
    <p class="nota-legal">${icono('info')} Por ahora cada cobrador usa la app en este dispositivo o tú registras lo que reporta. La sincronización entre teléfonos llegará en la versión con nube.</p>`);

  const form = $('form', el);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await cobradores.guardar({ nombre: form.nombre.value, telefono: form.telefono.value });
    } catch (err) {
      mostrarErrores(form, err.detalle || { nombre: err.message });
      return;
    }
    toast('Cobrador agregado.');
    recargar();
  });

  return acciones(el, {
    async renombrar(btn) {
      const c = cobradores.porId(btn.dataset.id);
      const nombre = await pedirTexto({ titulo: 'Editar cobrador', etiqueta: 'Nombre', aceptar: 'Guardar', obligatorio: true, valor: c.nombre });
      if (!nombre) return;
      await intentar(() => cobradores.guardar({ ...c, nombre }), 'guardar el cobrador');
      toast('Cobrador actualizado.');
      recargar();
    },
    async activo(btn) {
      const c = cobradores.porId(btn.dataset.id);
      await intentar(() => cobradores.cambiarActivo(c.id, c.activo === false), 'actualizar el cobrador');
      recargar();
    },
  });
}

// Formularios en diálogo que se usan desde varias pantallas (caja, gastos, ruta).
import { html } from './html.js';
import { campo } from './componentes.js';
import { formularioDialogo, toast } from './dialogos.js';
import * as cobradores from '../services/cobradores.js';
import * as gastosSrv from '../services/gastos.js';
import * as cajaSrv from '../services/caja.js';
import { CATEGORIAS_GASTO, TIPOS_MOVIMIENTO } from '../domain/caja.js';
import { aMinimo, getMoneda } from '../core/money.js';
import { intentar } from '../core/errors.js';
import { hoy } from '../core/dates.js';

const montoValido = v => Number.isInteger(v) && v > 0;

/** Registra un gasto. @returns {Promise<boolean>} true si se guardó */
export async function nuevoGasto({ fecha, cobradorId = '' }) {
  const equipo = cobradores.lista();
  const r = await formularioDialogo({
    titulo: 'Registrar gasto',
    aceptar: 'Guardar gasto',
    cuerpo: html`
      ${campo({ etiqueta: `Valor (${getMoneda().simbolo})`, nombre: 'monto', requerido: true, attrs: 'inputmode="decimal" autocomplete="off"' })}
      ${campo({ etiqueta: 'Categoría', nombre: 'categoria', valor: 'Transporte', opciones: CATEGORIAS_GASTO.map(c => ({ valor: c, texto: c })) })}
      ${campo({ etiqueta: 'Descripción', nombre: 'descripcion', attrs: 'maxlength="120" placeholder="Ej: gasolina de la moto"' })}
      <div class="rejilla-2">
        ${campo({ etiqueta: 'Fecha', nombre: 'fecha', tipo: 'date', valor: fecha, attrs: `max="${hoy()}"` })}
        ${equipo.length ? campo({ etiqueta: 'Cobrador', nombre: 'cobradorId', valor: cobradorId, opciones: cobradores.opciones(cobradorId, { textoVacio: 'Oficina / dueño' }) }) : ''}
      </div>`,
    validar: d => (montoValido(aMinimo(d.monto)) ? {} : { monto: 'Escribe un valor mayor que cero.' }),
  });
  if (!r) return false;
  await intentar(() => gastosSrv.registrar({ ...r, monto: aMinimo(r.monto) }), 'guardar el gasto');
  toast('Gasto registrado.');
  return true;
}

/** Aporte, retiro o base al cobrador. */
export async function nuevoMovimiento(tipo, { fecha, cobradorId = '' }) {
  const t = TIPOS_MOVIMIENTO[tipo];
  const equipo = cobradores.lista({ soloActivos: true });
  if (tipo === 'BASE' && !equipo.length) {
    toast('Primero agrega a tus cobradores en Más → Cobradores.', 'info');
    return false;
  }
  const r = await formularioDialogo({
    titulo: t.nombre,
    mensaje: t.explicacion,
    aceptar: 'Guardar',
    cuerpo: html`
      ${campo({ etiqueta: `Valor (${getMoneda().simbolo})`, nombre: 'monto', requerido: true, attrs: 'inputmode="decimal" autocomplete="off"' })}
      ${tipo === 'BASE' ? campo({ etiqueta: 'Cobrador', nombre: 'cobradorId', valor: cobradorId || equipo[0].id, opciones: cobradores.opciones(cobradorId).slice(1) }) : ''}
      <div class="rejilla-2">
        ${campo({ etiqueta: 'Fecha', nombre: 'fecha', tipo: 'date', valor: fecha, attrs: `max="${hoy()}"` })}
        ${campo({ etiqueta: 'Nota', nombre: 'nota', attrs: 'maxlength="120" placeholder="Opcional"' })}
      </div>`,
    validar: d => (montoValido(aMinimo(d.monto)) ? {} : { monto: 'Escribe un valor mayor que cero.' }),
  });
  if (!r) return false;
  await intentar(() => cajaSrv.registrarMovimiento({ tipo, ...r, monto: aMinimo(r.monto) }), 'guardar el movimiento');
  toast(`${t.nombre} registrado.`);
  return true;
}

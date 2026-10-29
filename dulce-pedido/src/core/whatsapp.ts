import { copConMoneda } from './dinero';
import { fechaLarga } from './fechas';
import type { DatosPedido, ResumenPedido, Zona } from './tipos';

/** Deja solo dígitos: "+57 300 123 4567" → "573001234567". */
export function soloDigitos(numero: string): string {
  return numero.replace(/\D/g, '');
}

/** Número de WhatsApp válido: código de país + número, entre 8 y 15 dígitos. */
export function whatsappValido(numero: string): boolean {
  const d = soloDigitos(numero);
  return d.length >= 8 && d.length <= 15 && !d.startsWith('0');
}

/** Enlace oficial de WhatsApp con el texto ya preparado (no envía nada por sí solo). */
export function enlaceWhatsApp(numero: string, texto?: string): string {
  const base = `https://wa.me/${soloDigitos(numero)}`;
  return texto ? `${base}?text=${encodeURIComponent(texto)}` : base;
}

export function mensajePedido(datos: DatosPedido, resumen: ResumenPedido, zona: Zona | undefined, demo = false): string {
  const l: string[] = [];
  l.push('Hola, quiero realizar un pedido.');
  if (resumen.codigo) l.push(`Solicitud N.º ${resumen.codigo}`);
  if (demo) l.push('(Pedido de prueba — tienda de demostración)');
  l.push('');
  l.push(`Nombre: ${datos.nombre.trim()}`);
  l.push(`Teléfono: ${datos.telefono.trim()}`);
  l.push(`Fecha deseada: ${fechaLarga(datos.fecha)}${datos.franja ? ` (${datos.franja})` : ''}`);
  l.push(`Entrega: ${datos.modalidad === 'recogida' ? 'Recogida en el punto de entrega' : 'Domicilio'}`);
  if (datos.modalidad === 'domicilio') {
    const lugar = [datos.direccion.trim(), datos.barrio.trim() && `barrio ${datos.barrio.trim()}`, zona?.nombre]
      .filter(Boolean)
      .join(', ');
    l.push(`Dirección: ${lugar}`);
  }
  l.push('');
  l.push('PRODUCTOS:');
  for (const it of resumen.items) {
    const detalle = it.detalle ? ` (${it.detalle})` : '';
    l.push(`- ${it.nombre}${detalle} x ${it.cantidad} = ${copConMoneda(it.subtotal)}`);
  }
  l.push('');
  l.push(`Subtotal: ${copConMoneda(resumen.subtotal)}`);
  if (datos.modalidad === 'domicilio') {
    l.push(`Domicilio: ${resumen.domicilio_pendiente || resumen.domicilio === null ? 'pendiente de confirmar' : copConMoneda(resumen.domicilio)}`);
    l.push(
      resumen.domicilio_pendiente
        ? `Total estimado: ${copConMoneda(resumen.total)} + domicilio por confirmar`
        : `Total estimado: ${copConMoneda(resumen.total)}`,
    );
  } else {
    l.push(`Total estimado: ${copConMoneda(resumen.total)}`);
  }
  if (datos.observaciones.trim()) {
    l.push('');
    l.push(`Observaciones: ${datos.observaciones.trim()}`);
  }
  l.push('');
  l.push('Por favor, confírmame la disponibilidad y las instrucciones para finalizar mi pedido.');
  return l.join('\n');
}

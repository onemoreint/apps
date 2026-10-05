import { html, montar } from '../ui/html.js';
import { encabezado, seccion, badge } from '../ui/componentes.js';
import { TIPOS_INTERES } from '../domain/interes.js';
import { ESTADOS } from '../domain/estados.js';
import { AVISO_RIESGO } from '../domain/riesgo.js';

const pregunta = (titulo, cuerpo) => html`<details class="faq"><summary>${titulo}</summary><div class="faq-cuerpo">${cuerpo}</div></details>`;

export function render(el) {
  montar(el, html`
    ${encabezado('Ayuda', { atras: '#/mas', subtitulo: 'Cómo funciona CarteraPro' })}
    <div class="formulario">
      ${seccion('Preguntas frecuentes', html`<div class="tarjeta faqs">
        ${pregunta('¿Cómo se calcula el interés?', html`<ul>${Object.values(TIPOS_INTERES).map(t => html`<li><strong>${t.nombre}:</strong> ${t.explicacion} <em>${t.ejemplo}</em></li>`)}</ul>
          <p>En todos los casos el interés se reparte en partes iguales entre las cuotas. Si la división no es exacta, la última cuota ajusta la diferencia.</p>`)}
        ${pregunta('¿Cómo se aplica un pago?', html`<p>El dinero se aplica primero a la cuota más antigua que tenga saldo. Si sobra, pasa a la siguiente. Dentro de cada cuota, el pago se reparte entre capital e interés en la misma proporción de la cuota. Antes de guardar verás exactamente cómo quedará.</p>
          <p>Un pago no puede ser mayor que lo que se debe en el crédito. Si te equivocas, abre el crédito y toca "Anular" en el pago: se descuenta de las cuotas y el recibo queda marcado como anulado.</p>`)}
        ${pregunta('¿Qué significa cada color?', html`<ul class="lista-estados">${['AL_DIA', 'PROXIMO', 'PENDIENTE', 'VENCIDO', 'PAGADO'].map(k => html`<li>${badge(k)} <span>${{
          AL_DIA: 'Sin cuotas atrasadas y sin vencimientos en los próximos 3 días.',
          PROXIMO: 'Una cuota vence hoy o en los próximos 3 días.',
          PENDIENTE: 'Cuota con un abono parcial que aún no vence.',
          VENCIDO: 'La cuota pasó su fecha (más los días de gracia) sin pagarse completa.',
          PAGADO: 'Cuota o crédito pagado por completo.' }[k]}</span></li>`)}</ul>`)}
        ${pregunta('¿Qué son los días de gracia?', html`<p>Son los días que esperas después del vencimiento antes de considerar una cuota como vencida. Con 2 días de gracia, una cuota del lunes se marca vencida a partir del jueves.</p>`)}
        ${pregunta('¿Dónde se guardan mis datos?', html`<p>Solo en este dispositivo, dentro del navegador. No se envían a ningún servidor. Por eso es importante hacer copias de seguridad (Más → Copia de seguridad) y guardarlas fuera del teléfono.</p>`)}
        ${pregunta('¿Puedo usarla en varios dispositivos?', html`<p>Sí, pero los datos no se sincronizan solos todavía. Exporta una copia en un dispositivo y restáurala en el otro.</p>`)}
        ${pregunta('¿Qué es el perfil de riesgo del cliente?', html`<p>${AVISO_RIESGO} Se calcula únicamente con los pagos registrados en esta app: atrasos, cuotas vencidas y abonos parciales.</p>`)}
      </div>`)}

      ${seccion('Aviso legal', html`<div class="tarjeta">
        <p class="nota-legal">CarteraPro es una herramienta administrativa para organizar información. No es una entidad financiera, no es un sistema oficial de calificación crediticia y no afirma que un cliente sea confiable o insolvente ni recomienda a quién prestar.</p>
        <p class="nota-legal">El usuario es el único responsable de cumplir las leyes y regulaciones de su país sobre actividades de crédito, tasas máximas de interés (usura), obligaciones tributarias, protección de datos personales de sus clientes (incluida su autorización para tratarlos) y prácticas de cobranza. CarteraPro no admite ni promueve la cobranza abusiva: los mensajes deben ser respetuosos y enviarse en horarios razonables.</p>
      </div>`)}
    </div>`);
}

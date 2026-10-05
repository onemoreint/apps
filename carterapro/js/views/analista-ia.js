import { html, montar, acciones } from '../ui/html.js';
import { icono } from '../ui/icons.js';
import { encabezado, seccion } from '../ui/componentes.js';
import { toast } from '../ui/dialogos.js';
import { obtener } from '../services/datos.js';
import * as ia from '../services/ia.js';
import { diagnosticar } from '../domain/diagnostico.js';
import { formatear as dinero } from '../core/money.js';

const ICONOS = { alerta: 'alerta', atencion: 'reloj', bien: 'check' };

export async function render(el) {
  const fuente = await obtener();
  const hallazgos = diagnosticar(fuente, fuente.hoy, v => dinero(v, { ocultable: false }));
  const { resumen, prompt } = await ia.prepararPrompt();

  montar(el, html`
    ${encabezado('Analista IA', { atras: '#/mas', subtitulo: 'Diagnóstico de tu cartera' })}
    ${seccion('Diagnóstico automático', html`<ul class="hallazgos">${hallazgos.map(h => html`<li class="hallazgo hallazgo-${h.nivel}">
      <span class="hallazgo-ico">${icono(ICONOS[h.nivel])}</span>
      <div><strong>${h.titulo}</strong><p>${h.detalle}</p>${h.accion ? html`<a class="enlace" href="${h.accion.href}">${h.accion.texto} ${icono('derecha')}</a>` : ''}</div>
    </li>`)}</ul>
    <p class="nota-legal">Calculado en tu dispositivo con reglas fijas a partir de tus datos. Es una referencia administrativa: no evalúa la solvencia de nadie ni recomienda a quién prestar.</p>`)}

    ${seccion('Analizar con un asistente de IA', html`<div class="tarjeta">
      <p>Copia un resumen de tu cartera y pégalo en ChatGPT, Claude o Gemini para pedir un análisis más detallado. El resumen es <strong>anónimo</strong>: no incluye nombres, teléfonos ni documentos (los clientes aparecen como C1, C2…).</p>
      <button type="button" class="btn btn-pri" data-accion="copiar">${icono('copia')}<span>Copiar resumen para la IA</span></button>
      <details class="detalles">
        <summary>Ver exactamente qué se copia (${resumen.creditos.length} ${resumen.creditos.length === 1 ? 'crédito' : 'créditos'})</summary>
        <pre class="pre-codigo" tabindex="0">${prompt}</pre>
      </details>
      <p class="nota-legal">Próximamente: el análisis se podrá pedir aquí mismo, sin copiar y pegar.</p>
    </div>`)}`);

  return acciones(el, {
    async copiar() {
      try {
        await navigator.clipboard.writeText(prompt);
        toast('Resumen copiado. Pégalo en tu asistente de IA.');
      } catch {
        el.querySelector('details').open = true;
        const pre = el.querySelector('.pre-codigo');
        const r = document.createRange(); r.selectNodeContents(pre);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        toast('Selecciona el texto y cópialo manualmente.', 'info');
      }
    },
  });
}

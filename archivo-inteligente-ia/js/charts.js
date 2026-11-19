/* Gráficos SVG/HTML ligeros, sin librerías externas. */
(function () {
  'use strict';
  const AI = (window.AI = window.AI || {});
  const { html } = AI;

  /** Barras agrupadas por mes. series: [{nombre,color,valores[]}], labels[] */
  function groupedBars(labels, series, { height = 230 } = {}) {
    const W = 720, H = height, pl = 34, pr = 10, pt = 14, pb = 28;
    const max = Math.max(4, ...series.flatMap((s) => s.valores));
    const step = Math.ceil(max / 4);
    const top = step * 4;
    const cw = (W - pl - pr) / labels.length;
    const bw = Math.min(16, (cw - 8) / series.length);
    const y = (v) => pt + (H - pt - pb) * (1 - v / top);
    const grid = [0, 1, 2, 3, 4].map((i) => html`<line x1="${pl}" x2="${W - pr}" y1="${y(i * step)}" y2="${y(i * step)}" stroke="#E6ECEF" stroke-dasharray="${i ? '3 4' : ''}"/><text x="${pl - 8}" y="${y(i * step) + 4}" text-anchor="end">${i * step}</text>`);
    const bars = labels.map((lb, i) => {
      const x0 = pl + i * cw + (cw - bw * series.length - 3 * (series.length - 1)) / 2;
      return html`<g>${series.map((s, j) => { const v = s.valores[i]; const yy = y(v); return html`<rect x="${x0 + j * (bw + 3)}" y="${yy}" width="${bw}" height="${Math.max(0, H - pb - yy)}" rx="3" fill="${s.color}"><title>${s.nombre} · ${lb}: ${v}</title></rect>`; })}<text x="${pl + i * cw + cw / 2}" y="${H - 9}" text-anchor="middle">${lb}</text></g>`;
    });
    return html`<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución mensual">${grid}${bars}</svg>`;
  }
  const legend = (series) => html`<div class="legend">${series.map((s) => html`<span><i style="background:${s.color}"></i>${s.nombre}</span>`)}</div>`;

  /** Barras horizontales apiladas. rows: [{label, segs:[{v,color,title}]}] */
  function hbars(rows) {
    const max = Math.max(1, ...rows.map((r) => r.segs.reduce((a, s) => a + s.v, 0)));
    return html`<div class="hbars">${rows.map((r) => { const tot = r.segs.reduce((a, s) => a + s.v, 0); return html`<div class="hbar"><span class="lbl" title="${r.label}">${r.label}</span><span class="track" role="img" aria-label="${r.label}: ${tot}">${r.segs.map((s) => html`<span class="seg" style="width:${(s.v / max) * 100}%;background:${s.color}" title="${s.title}: ${s.v}"></span>`)}</span><span class="n">${tot}</span></div>`; })}</div>`;
  }

  AI.charts = { groupedBars, legend, hbars };
})();

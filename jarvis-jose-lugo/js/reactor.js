// Reactor holográfico: representa el estado real de JARVIS. Diseño propio basado en un iris de doce hojas.

const NS = 'http://www.w3.org/2000/svg';
const CX = 200;
const CY = 200;

export const STATE_LABELS = {
  idle: 'En espera',
  listening: 'Escuchando',
  processing: 'Procesando',
  speaking: 'Respondiendo',
  executing: 'Ejecutando una tarea',
  error: 'Error de conexión',
};

function bladePath(i, count) {
  const step = (Math.PI * 2) / count;
  const a0 = i * step - Math.PI / 2 + 0.05;
  const a1 = a0 + step - 0.1;
  const skew = 0.2; // las hojas giran como un diafragma
  const pt = (r, a) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
  return `M${pt(74, a0 + skew)} L${pt(74, a1 + skew)} L${pt(122, a1)} L${pt(122, a0)} Z`;
}

function wavePath(amp, t) {
  const pts = [];
  const steps = 96;
  for (let i = 0; i <= steps; i += 1) {
    const a = (i / steps) * Math.PI * 2;
    const r = 141
      + amp * (Math.sin(a * 6 + t * 2.6) * 0.55 + Math.sin(a * 11 - t * 3.7) * 0.3 + Math.sin(a * 3 + t * 1.3) * 0.15);
    pts.push(`${(CX + r * Math.cos(a)).toFixed(1)} ${(CY + r * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function createReactor(host) {
  const blades = Array.from({ length: 12 }, (_, i) => `<path class="r-blade" style="--i:${i}" d="${bladePath(i, 12)}"/>`).join('');
  host.innerHTML = `
    <svg xmlns="${NS}" viewBox="0 0 400 400" aria-hidden="true">
      <defs>
        <radialGradient id="halo"><stop offset="0" class="r-stop-a" stop-opacity=".34"/><stop offset=".62" class="r-stop-b" stop-opacity=".1"/><stop offset="1" class="r-stop-b" stop-opacity="0"/></radialGradient>
        <radialGradient id="coreGlow"><stop offset="0" class="r-stop-a" stop-opacity=".95"/><stop offset=".75" class="r-stop-b" stop-opacity=".22"/><stop offset="1" class="r-stop-b" stop-opacity="0"/></radialGradient>
        <radialGradient id="coreDisc"><stop offset="0" stop-color="#fff"/><stop offset=".55" class="r-stop-a"/><stop offset="1" class="r-stop-b"/></radialGradient>
      </defs>
      <circle class="r-halo" cx="200" cy="200" r="198"/>
      <circle class="r-ticks" cx="200" cy="200" r="188"/>
      <circle class="r-ring" cx="200" cy="200" r="176"/>
      <circle class="r-arcs r-arcs-a" cx="200" cy="200" r="163"/>
      <circle class="r-arcs r-arcs-b" cx="200" cy="200" r="152"/>
      <path class="r-wave"/>
      <circle class="r-ring" cx="200" cy="200" r="129"/>
      <g class="r-iris">${blades}</g>
      <g class="r-core">
        <circle class="r-core-glow" cx="200" cy="200" r="68"/>
        <circle class="r-core-ring" cx="200" cy="200" r="45"/>
        <circle class="r-core-disc" cx="200" cy="200" r="30"/>
      </g>
    </svg>`;

  const wave = host.querySelector('.r-wave');
  const core = host.querySelector('.r-core');
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let state = 'idle';
  let raf = 0;
  let amp = 0;
  let spike = 0;
  let lastPulse = 0;

  function frame(ms) {
    const t = ms / 1000;
    // Muchas voces en línea no avisan cada palabra: se mantiene el pulso mientras habla.
    if (state === 'speaking' && ms - lastPulse > 280) {
      spike = Math.max(spike, 0.4 + Math.random() * 0.4);
      lastPulse = ms;
    }
    const target = state === 'listening' ? 7 + Math.sin(t * 2.1) * 3 : 5 + spike * 16;
    amp += (target - amp) * 0.14;
    spike *= 0.93;
    wave.setAttribute('d', wavePath(amp, t));
    if (state === 'speaking') core.style.setProperty('--pulse', (1 + spike * 0.14).toFixed(3));
    raf = requestAnimationFrame(frame);
  }

  function syncLoop() {
    const active = (state === 'listening' || state === 'speaking') && !reduced;
    if (active && !raf) raf = requestAnimationFrame(frame);
    if (!active && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  return {
    setState(next) {
      state = next;
      syncLoop();
    },
    /** La síntesis de voz avisa en cada palabra: el reactor reacciona a la voz real. */
    pulse() {
      spike = 1;
      lastPulse = performance.now();
    },
    pause(hidden) {
      if (hidden && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!hidden) {
        syncLoop();
      }
    },
  };
}

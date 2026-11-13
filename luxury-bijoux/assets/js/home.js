/* Portada: vista previa flotante en el índice de colecciones */
(() => {
  'use strict';
  const peek = document.getElementById('peek');
  if (!peek || matchMedia('(hover: none)').matches) return;
  const img = peek.querySelector('img');
  let x = 0, y = 0, tx = 0, ty = 0, raf;
  const loop = () => { x += (tx - x) * 0.18; y += (ty - y) * 0.18; peek.style.left = x + 'px'; peek.style.top = y + 'px'; raf = requestAnimationFrame(loop); };
  document.querySelectorAll('.index-row').forEach(row => {
    row.addEventListener('mouseenter', e => { img.src = row.dataset.peek; tx = x = e.clientX + 140; ty = y = e.clientY; peek.classList.add('on'); cancelAnimationFrame(raf); loop(); });
    row.addEventListener('mousemove', e => { tx = e.clientX + 140; ty = e.clientY; });
    row.addEventListener('mouseleave', () => { peek.classList.remove('on'); cancelAnimationFrame(raf); });
  });
})();

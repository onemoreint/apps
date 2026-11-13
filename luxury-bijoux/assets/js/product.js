/* Ficha de producto: galería, lightbox con zoom y gestos, compartir y copiar enlace */
(() => {
  'use strict';
  const LB = window.LB;
  const data = JSON.parse(document.getElementById('pdata')?.textContent || '{}');
  const imgs = data.imgs || [];
  const mainBox = document.getElementById('main-img');
  const mainImg = mainBox?.querySelector('img');
  let cur = 0;

  const show = i => {
    cur = (i + imgs.length) % imgs.length;
    mainImg.style.opacity = 0;
    setTimeout(() => { mainImg.src = imgs[cur]; mainImg.onload = () => (mainImg.style.opacity = 1); }, 160);
    document.querySelectorAll('.thumbs button').forEach((b, k) => b.setAttribute('aria-current', String(k === cur)));
  };
  document.querySelectorAll('.thumbs button').forEach(b => b.addEventListener('click', () => show(+b.dataset.i)));

  /* lightbox */
  const lb = document.getElementById('lightbox'), lbImg = lb?.querySelector('img'), lbCount = lb?.querySelector('.count');
  const prevBtn = lb?.querySelector('[data-lb-prev]'), nextBtn = lb?.querySelector('[data-lb-next]');
  const lbShow = i => { cur = (i + imgs.length) % imgs.length; lbImg.src = imgs[cur]; lb.classList.remove('zoomed'); lbCount.textContent = imgs.length > 1 ? `${cur + 1} / ${imgs.length}` : ''; };
  const open = () => { if (!imgs.length) return; lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; lbShow(cur); lb.querySelector('[data-lb-close]').focus(); };
  const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; mainBox.focus(); show(cur); };
  if (imgs.length < 2) { prevBtn?.setAttribute('hidden', ''); nextBtn?.setAttribute('hidden', ''); }
  mainBox?.addEventListener('click', open);
  mainBox?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  lb?.querySelector('[data-lb-close]').addEventListener('click', close);
  prevBtn?.addEventListener('click', () => lbShow(cur - 1));
  nextBtn?.addEventListener('click', () => lbShow(cur + 1));
  lbImg?.addEventListener('click', e => {
    const r = lbImg.getBoundingClientRect();
    lbImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    lb.classList.toggle('zoomed');
  });
  lb?.addEventListener('click', e => { if (e.target === lb) close(); });
  addEventListener('keydown', e => {
    if (!lb?.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') lbShow(cur - 1);
    if (e.key === 'ArrowRight') lbShow(cur + 1);
  });
  let sx = null;
  lb?.addEventListener('touchstart', e => (sx = e.touches[0].clientX), { passive: true });
  lb?.addEventListener('touchend', e => {
    if (sx === null || lb.classList.contains('zoomed')) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) lbShow(cur + (dx < 0 ? 1 : -1));
    sx = null;
  });

  /* compartir */
  const url = location.href.split('#')[0].split('?')[0];
  const title = document.title;
  const text = data.referencia ? `${data.nombre} (Ref. ${data.referencia})` : data.nombre;
  const targets = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&media=${encodeURIComponent(new URL(imgs[0] || '', location.href).href)}&description=${encodeURIComponent(text)}`,
  };
  document.querySelectorAll('[data-share-to]').forEach(a => (a.href = targets[a.dataset.shareTo]));
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); LB.toast('Enlace copiado'); }
    catch (_) { prompt('Copia el enlace:', url); }
  };
  document.querySelector('[data-copy]')?.addEventListener('click', copy);
  document.querySelector('[data-share]')?.addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title, text, url }); } catch (_) {} }
    else copy();
  });
})();

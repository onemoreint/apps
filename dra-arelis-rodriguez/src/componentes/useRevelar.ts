import { useEffect } from 'react';

/** Hace aparecer suavemente los elementos con la clase .revelar al entrar en pantalla. */
export function useRevelar(): void {
  useEffect(() => {
    const elementos = document.querySelectorAll<HTMLElement>('.revelar');
    if (!('IntersectionObserver' in window)) {
      elementos.forEach((el) => el.classList.add('visible'));
      return;
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            observador.unobserve(entrada.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);
}

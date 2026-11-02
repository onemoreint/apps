/** Aplica los colores de la tienda y elige texto claro u oscuro según el contraste. */
export function colorValido(c: string | undefined): c is string {
  return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);
}

export function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

export const COLORES_BASE = { primario: '#43102f', acento: '#d11f4a' };

/** Las tiendas que nunca eligieron colores guardaron la pareja de la primera versión: pasan a la nueva. */
export function coloresTienda(colores: { primario?: string; acento?: string } | undefined): { primario: string; acento: string } {
  const anterior = colores?.primario?.toLowerCase() === '#5a3222' && colores?.acento?.toLowerCase() === '#c4673f';
  if (anterior) return COLORES_BASE;
  return {
    primario: colorValido(colores?.primario) ? colores.primario : COLORES_BASE.primario,
    acento: colorValido(colores?.acento) ? colores.acento : COLORES_BASE.acento,
  };
}

export function aplicarTema(colores: { primario?: string; acento?: string } | undefined): void {
  const raiz = document.documentElement;
  const { primario, acento } = coloresTienda(colores);
  raiz.style.setProperty('--primario', primario);
  raiz.style.setProperty('--acento', acento);
  raiz.style.setProperty('--en-primario', luminancia(primario) > 0.45 ? '#2a1420' : '#fff5f6');
  raiz.style.setProperty('--en-acento', luminancia(acento) > 0.45 ? '#2a1420' : '#ffffff');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primario);
}

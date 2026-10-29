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

export function aplicarTema(colores: { primario?: string; acento?: string } | undefined): void {
  const raiz = document.documentElement;
  const primario = colorValido(colores?.primario) ? colores.primario : '#5a3222';
  const acento = colorValido(colores?.acento) ? colores.acento : '#c4673f';
  raiz.style.setProperty('--primario', primario);
  raiz.style.setProperty('--acento', acento);
  raiz.style.setProperty('--en-primario', luminancia(primario) > 0.45 ? '#2e1d15' : '#fffaf3');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primario);
}

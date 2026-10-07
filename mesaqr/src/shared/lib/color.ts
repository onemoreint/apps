/** Color de marca configurable: elige texto blanco u oscuro según contraste. */
export function readableOn(hex: string): '#FFFFFF' | '#1A1714' {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#FFFFFF';
  const n = parseInt(m[1]!, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
  return lum > 0.4 ? '#1A1714' : '#FFFFFF';
}

export function applyBrand(hex: string | null | undefined): void {
  const color = hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#D62828';
  const root = document.documentElement;
  root.style.setProperty('--brand', color);
  root.style.setProperty('--brand-ink', readableOn(color));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

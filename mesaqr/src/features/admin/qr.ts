import { tableUrl } from './lib';

// La librería de QR solo se descarga al usarla.
const loadQr = () => import('qrcode');

const QR_OPTS = { errorCorrectionLevel: 'M' as const, margin: 1, color: { dark: '#1A1714', light: '#FFFFFF' } };

export async function qrSvg(token: string): Promise<string> {
  const QR = await loadQr();
  return QR.toString(tableUrl(token), { ...QR_OPTS, type: 'svg' });
}

export async function qrDataUrl(token: string, width = 512): Promise<string> {
  const QR = await loadQr();
  return QR.toDataURL(tableUrl(token), { ...QR_OPTS, width });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Tarjeta PNG lista para imprimir: nombre del negocio, QR y número de mesa. */
export async function qrCardPng(opts: { token: string; tableNumber: number; label: string | null; businessName: string; brand: string }): Promise<string> {
  const W = 1000;
  const H = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  await document.fonts?.load('800 64px Bricolage').catch(() => undefined);
  const display = '"Bricolage", system-ui, sans-serif';

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = opts.brand;
  ctx.fillRect(0, 0, W, 190);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 64px ${display}`;
  ctx.fillText(opts.businessName.slice(0, 26), W / 2, 120, W - 80);

  ctx.fillStyle = '#1A1714';
  ctx.font = `700 52px ${display}`;
  ctx.fillText('Escanea para ver el menú', W / 2, 300);

  const img = new Image();
  img.src = await qrDataUrl(opts.token, 680);
  await img.decode();
  ctx.drawImage(img, (W - 680) / 2, 350, 680, 680);

  // Ticket mostaza con el número de mesa
  ctx.fillStyle = '#FFC530';
  roundRect(ctx, 250, 1080, 500, 170, 28);
  ctx.fill();
  ctx.fillStyle = '#1A1714';
  ctx.font = `800 120px ${display}`;
  ctx.fillText(`Mesa ${opts.tableNumber}`, W / 2, 1210, 460);

  ctx.font = `500 40px ${display}`;
  ctx.fillStyle = '#5B554F';
  ctx.fillText(opts.label ? opts.label : 'Pide desde tu teléfono por WhatsApp', W / 2, 1330, W - 120);

  return canvas.toDataURL('image/png');
}

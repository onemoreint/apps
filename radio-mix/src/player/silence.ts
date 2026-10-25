/**
 * WAV de silencio de 0,1 s generado al vuelo. Se reproduce dentro del mismo toque del usuario
 * para "desbloquear" el elemento de audio en iOS/Safari antes de descargar la programación;
 * así el audio real puede empezar después aunque haya una espera de red.
 */
let cached: string | null = null;

export function silentWavDataUri(): string {
  if (cached) return cached;
  const sampleRate = 8000;
  const samples = 800;
  const buf = new ArrayBuffer(44 + samples);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, 36 + samples, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate, true);
  v.setUint16(32, 1, true);
  v.setUint16(34, 8, true); // 8 bits
  str(36, 'data');
  v.setUint32(40, samples, true);
  for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128); // silencio en PCM de 8 bits
  let bin = '';
  new Uint8Array(buf).forEach((b) => (bin += String.fromCharCode(b)));
  cached = `data:audio/wav;base64,${btoa(bin)}`;
  return cached;
}

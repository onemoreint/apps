import { expect, it } from 'vitest';
import { LAND_MASK_B64, LAND_W } from '../src/components/landMask';
const bytes = Uint8Array.from(Buffer.from(LAND_MASK_B64, 'base64'));
const isLand = (lat: number, lon: number) => { const i = Math.floor(90 - lat) * LAND_W + Math.floor(lon + 180); return ((bytes[i >> 3] >> (i & 7)) & 1) === 1; };
it('máscara de tierra ubica bien los continentes', () => {
  expect(isLand(4.7, -74)).toBe(true); // Bogotá
  expect(isLand(-15, -60)).toBe(true); // Brasil
  expect(isLand(0, -100)).toBe(false); // Pacífico
  expect(isLand(40.4, -3.7)).toBe(true); // Madrid
  expect(isLand(0, -30)).toBe(false); // Atlántico
  expect(isLand(-12.5, -76)).toBe(true); // costa de Perú
});

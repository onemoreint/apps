// PIN de acceso opcional. Se guarda solo un hash PBKDF2 (nunca el PIN en texto plano).
// Nota: el PIN evita miradas casuales; no cifra los datos del navegador.

import { settingsRepo } from '../data/repositories';
import { SETTINGS } from './dataService';

interface PinRecord {
  salt: string;
  hash: string;
  iterations: number;
}

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, key, 256);
  return b64(bits);
}

export async function setPin(pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 150_000;
  const hash = await derive(pin, salt, iterations);
  await settingsRepo.set(SETTINGS.pinHash, { salt: b64(salt), hash, iterations } satisfies PinRecord);
}

export async function clearPin(): Promise<void> {
  await settingsRepo.set(SETTINGS.pinHash, null);
}

export async function hasPin(): Promise<boolean> {
  return !!(await settingsRepo.get<PinRecord | null>(SETTINGS.pinHash, null));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const rec = await settingsRepo.get<PinRecord | null>(SETTINGS.pinHash, null);
  if (!rec) return true;
  const hash = await derive(pin, fromB64(rec.salt), rec.iterations);
  return hash === rec.hash;
}

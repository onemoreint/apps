import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/shared/lib/supabase';
import { adminMessage } from '@/shared/lib/errors';
import { appUrl } from '@/shared/lib/asset';
import { menuPath } from '@/shared/lib/env';

/** Desenvuelve una respuesta de Supabase o lanza su error. */
export function must<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

/** Carga datos con estado de carga/error y recarga manual. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(adminMessage(e));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** URL pública del menú de una mesa (lo que va dentro del QR). */
export function tableUrl(token: string): string {
  return appUrl(menuPath(token));
}

/** Token aleatorio de 10 caracteres hex (mismo formato que genera la base de datos). */
export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Reduce la foto a 900 px como máximo y la convierte a WebP (JPEG si el navegador
 * no puede codificar WebP). Así el menú carga rápido con datos móviles.
 */
export async function compressImage(file: File, max = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const toBlob = (type: string, q: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, q));
  const webp = await toBlob('image/webp', 0.8);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob('image/jpeg', 0.82);
  if (!jpeg) throw new Error('No se pudo procesar la imagen');
  return jpeg;
}

export async function uploadImage(businessId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen');
  const blob = await compressImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const storage = db().storage.from('menu-images');
  must(await storage.upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false }));
  return storage.getPublicUrl(path).data.publicUrl;
}

export function timeAgo(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

export function clockTime(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Caracas' }).format(new Date(iso));
}

/** Inicio del día de hoy en Maracay, como ISO (para "pedidos de hoy"). */
export function startOfTodayCaracas(): string {
  const now = new Date();
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas' }).format(now); // 2026-10-07
  return new Date(`${ymd}T00:00:00-04:00`).toISOString();
}

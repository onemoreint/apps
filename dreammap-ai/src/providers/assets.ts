import type { ImageAsset, ImageSource, LicenseInfo } from '../core/types';

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Blobs originales (para persistir y exportar sin pérdida). */
export const blobStore = new Map<string, Blob>();

function dims(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
    img.src = src;
  });
}

export async function assetFromBlob(
  blob: Blob,
  meta: { source: ImageSource; title: string; tags?: string[]; category?: string; origin?: ImageAsset['origin']; license?: LicenseInfo; id?: string },
): Promise<ImageAsset> {
  if (!blob.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  const src = URL.createObjectURL(blob);
  const { width, height } = await dims(src);
  const id = meta.id ?? uid('img');
  blobStore.set(id, blob);
  return {
    id,
    source: meta.source,
    src,
    title: meta.title,
    width,
    height,
    vector: blob.type === 'image/svg+xml',
    tags: meta.tags ?? [],
    category: meta.category ?? 'otro',
    origin: meta.origin,
    license: meta.license,
    createdAt: Date.now(),
  };
}

export async function assetFromFile(file: File): Promise<ImageAsset> {
  const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  return assetFromBlob(file, {
    source: 'device',
    title,
    tags: ['mi imagen'],
    license: { name: 'Imagen propia del usuario', commercialUse: 'unknown' },
  });
}

export const SOURCE_LABELS: Record<ImageSource, string> = {
  device: '📁 Mi dispositivo',
  library: '🖼️ Biblioteca',
  web: '🌐 Web',
  ai: '✨ IA',
  pinterest: '📌 Pinterest (referencia)',
};

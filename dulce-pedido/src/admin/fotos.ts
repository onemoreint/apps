/**
 * Fotos: se reducen y convierten a WebP en el celular de la propietaria antes de
 * subirlas (cargan rápido con datos móviles y ocupan poco espacio).
 */
import { BUCKET, db } from './cliente';

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function comprimir(archivo: File, ladoMax = 1400, calidad = 0.82): Promise<Blob> {
  if (!TIPOS.includes(archivo.type) && !archivo.type.startsWith('image/')) {
    throw new Error('Elige una imagen (JPG, PNG o WebP).');
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo);
  } catch {
    throw new Error('No pudimos leer esta imagen. Prueba con una foto JPG o PNG.');
  }
  const escala = Math.min(1, ladoMax / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * escala);
  const h = Math.round(bitmap.height * escala);
  const lienzo = document.createElement('canvas');
  lienzo.width = w;
  lienzo.height = h;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Tu navegador no permite procesar imágenes.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/webp', calidad));
  if (blob && blob.type === 'image/webp') return blob;
  // Safari antiguo no genera WebP: se usa JPEG.
  const jpg = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', calidad));
  if (!jpg) throw new Error('No pudimos procesar la imagen.');
  return jpg;
}

/** Sube la imagen a la carpeta de la tienda y devuelve su URL pública. */
export async function subirFoto(tiendaId: string, archivo: File, carpeta = 'productos', ladoMax?: number): Promise<string> {
  const blob = await comprimir(archivo, ladoMax);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const ruta = `${tiendaId}/${carpeta}/${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from(BUCKET).upload(ruta, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return db().storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

/** Borra del almacenamiento una foto que ya no se usa (si es de esta tienda). */
export async function borrarFoto(url: string): Promise<void> {
  const marca = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marca);
  if (i < 0) return;
  const ruta = decodeURIComponent(url.slice(i + marca.length));
  await db().storage.from(BUCKET).remove([ruta]);
}

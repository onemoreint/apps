/** Reduce una imagen a máx. `max` px y la convierte a JPEG (data URL) para no saturar el almacenamiento demo. */
export async function fileToDataUrl(file: File, max = 900, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('El archivo debe ser una imagen.')
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen supera 8 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('No se pudo leer la imagen.'))
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale)
    c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

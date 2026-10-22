// Shrinks a picked image in the browser before it is uploaded.
//
// This only makes the UPLOAD small and fast (a 7 MB phone photo on mobile data is
// slow and can fail). The backend makes the final stored file -- 640 px WebP for a
// profile photo, 2,000 px JPEG for a document -- and removes hidden data such as
// GPS, so nothing here has to match it exactly, and nothing here is a guarantee.
//
// Never throws: if anything goes wrong the ORIGINAL file is returned and the
// server shrinks it anyway. An upload must never break because of this step.

export type ImageKind = 'profilePhoto' | 'document'

const TARGETS: Record<ImageKind, { maxSide: number; quality: number }> = {
  profilePhoto: { maxSide: 800, quality: 0.8 },
  document: { maxSide: 2000, quality: 0.82 },
}

// Below this a re-encode saves little and costs quality; the server shrinks it anyway.
const SKIP_BELOW_BYTES = 500 * 1024

async function encodeJpeg(bitmap: ImageBitmap, width: number, height: number, quality: number): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // JPEG has no transparency: without this a transparent PNG goes black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** Returns a smaller JPEG for a big image, or the same file for anything else (PDF, Word, small images, any failure). */
export async function shrinkImage(file: File, kind: ImageKind): Promise<File> {
  try {
    if (!file.type.startsWith('image/') || file.size <= SKIP_BELOW_BYTES) return file
    if (typeof createImageBitmap === 'undefined') return file

    const { maxSide, quality } = TARGETS[kind]
    // 'from-image' applies the phone's rotation, so a sideways photo is drawn upright.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    try {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const width = Math.max(1, Math.round(bitmap.width * scale))
      const height = Math.max(1, Math.round(bitmap.height * scale))

      const blob = await encodeJpeg(bitmap, width, height, quality)
      // No gain (or no result): keep what the user picked.
      if (!blob || blob.size === 0 || blob.size >= file.size) return file

      // Keep the name's base; the type changed, so the extension does too.
      const base = file.name.replace(/\.[^./\\]+$/, '') || 'photo'
      return new File([blob], `${base}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    } finally {
      bitmap.close()
    }
  } catch {
    return file
  }
}

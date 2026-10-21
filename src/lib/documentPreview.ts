/**
 * What the profile documents list may show inline. PDF, JPEG and PNG only —
 * never HTML, SVG, Word or anything else, which stay download-only.
 */
export type PreviewType = 'application/pdf' | 'image/jpeg' | 'image/png'

const PREVIEW_MIME = new Set<string>(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'])
const PREVIEW_EXT = new Set<string>(['pdf', 'jpg', 'jpeg', 'png'])

/**
 * Whether to offer a View button, judged from the stored row. Only a hint: the
 * real decision is made on the downloaded bytes by sniffPreviewType().
 */
export function isPreviewable(doc: { mimeType?: string; fileName?: string }): boolean {
  if (doc.mimeType && PREVIEW_MIME.has(doc.mimeType.toLowerCase())) return true
  const ext = doc.fileName?.split('.').pop()?.toLowerCase()
  return !!ext && PREVIEW_EXT.has(ext)
}

/**
 * The type a file's first bytes prove it to be, or null. The Blob is re-typed from
 * THIS, never from the server's Content-Type (which is `application/octet-stream`
 * for every document) or the file name, so a mislabelled file cannot be rendered.
 */
export function sniffPreviewType(head: Uint8Array): PreviewType | null {
  const at = (i: number) => head[i]
  if (head.length >= 5 && at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46 && at(4) === 0x2d) {
    return 'application/pdf' // %PDF-
  }
  if (head.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if (
    head.length >= 8 &&
    at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 &&
    at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a
  ) {
    return 'image/png'
  }
  return null
}

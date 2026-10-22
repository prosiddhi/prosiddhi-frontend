import type { TFunction } from 'i18next'
import { shrinkImage, type ImageKind } from '@/lib/shrinkImage'

// Everything a file goes through on its way to an upload endpoint:
//   1. documents (PDF / Word) over the limit are refused BEFORE anything is sent;
//   2. images are shrunk (lib/shrinkImage), so a phone photo uploads in a blink;
//   3. a refusal from the backend is turned into a message in the user's language.
//
// The backend limits are in prosiddhi-backend src/config/multer.ts: documents
// 5 MB, photos 10 MB (the server shrinks photos itself, so photos are not
// size-checked here).

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024

/**
 * What the backend takes as a profile photo (its imageFileFilter). A file input's
 * `accept` is only a hint: the file dialog's "All files" overrides it, so a PDF can
 * still be chosen. Check this before uploading.
 */
export const PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export const isProfilePhotoType = (file: File): boolean => PROFILE_PHOTO_TYPES.includes(file.type)

/** The backend's stable upload error codes (docs: "Smaller, safer uploads", shared contract). */
export type UploadErrorCode = 'FILE_TOO_LARGE' | 'FILE_TYPE_NOT_ALLOWED' | 'FILE_UNREADABLE'

const UPLOAD_ERROR_KEYS: Record<UploadErrorCode, string> = {
  FILE_TOO_LARGE: 'common:uploadErrors.fileTooLarge',
  FILE_TYPE_NOT_ALLOWED: 'common:uploadErrors.fileTypeNotAllowed',
  FILE_UNREADABLE: 'common:uploadErrors.fileUnreadable',
}

/** Thrown before upload; carries the same `code` the backend would have sent. */
export class UploadFileError extends Error {
  readonly code: UploadErrorCode
  constructor(code: UploadErrorCode, message: string) {
    super(message)
    this.name = 'UploadFileError'
    this.code = code
  }
}

const isImage = (file: File) => file.type.startsWith('image/')

/** Throws UploadFileError('FILE_TOO_LARGE') for a PDF / Word file over the document limit. Images pass (they are shrunk). */
export function assertDocumentSize(file: File): void {
  if (!isImage(file) && file.size > MAX_DOCUMENT_BYTES) {
    throw new UploadFileError('FILE_TOO_LARGE', 'This file is too big. Documents can be up to 5 MB.')
  }
}

/** The file to put in the FormData: size-checked, and shrunk when it is a big image. */
export async function prepareUpload(file: File, kind: ImageKind): Promise<File> {
  assertDocumentSize(file)
  return shrinkImage(file, kind)
}

/** The translated message for one of the three upload codes, or null for any other error. */
export function knownUploadErrorMessage(err: unknown, t: TFunction): string | null {
  const code = (err as { code?: unknown } | null)?.code
  if (typeof code === 'string' && code in UPLOAD_ERROR_KEYS) {
    return t(UPLOAD_ERROR_KEYS[code as UploadErrorCode])
  }
  return null
}

/**
 * What to show for a failed upload: the translated message for an upload code,
 * otherwise what was shown before (the backend's message, or `fallback`).
 */
export function uploadErrorMessage(err: unknown, t: TFunction, fallback: string): string {
  return knownUploadErrorMessage(err, t) ?? (err instanceof Error ? err.message : fallback)
}

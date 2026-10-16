/**
 * Save a downloaded Blob as a file in the browser: a temporary object URL behind a
 * hidden link. The URL is revoked a little later, not at once — some browsers
 * start the download asynchronously after the click.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30000)
}

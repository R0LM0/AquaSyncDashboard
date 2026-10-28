export function downloadBlob(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1_000)
  } catch {
    /* the file cannot be downloaded here (tests, private mode) */
  }
}

export const downloadBlob = (blob: Blob, filename: string): boolean => {
  if (typeof window === 'undefined') {
    return false
  }

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.style.display = 'none'
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()

  // Small delay ensures the browser has time to hand off the file before revocation
  // This is a known workaround for compatibility with older Firefox/Safari versions
  setTimeout(() => {
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }, 100)

  return true
}

/**
 * Client ID generation with insecure-context fallback.
 *
 * `crypto.randomUUID()` requires a secure context (https:// or localhost),
 * so plain-http origins (e.g. direct container-IP access) would crash any
 * caller. `crypto.getRandomValues()` is available everywhere, so use it to
 * mint an equivalent UUIDv4 when `randomUUID` is missing.
 */
export const generateClientId = (): string => {
  if (typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  // Set UUID version (4) and variant (10xxxxxx) bits.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return (
    `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20)}`
  )
}

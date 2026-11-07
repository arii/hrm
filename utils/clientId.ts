/**
 * Client ID generation with insecure-context fallback.
 *
 * `crypto.randomUUID()` requires a secure context (https:// or localhost),
 * so plain-http origins (e.g. direct container-IP access) would crash any
 * caller. `crypto.getRandomValues()` is available everywhere, so use it to
 * mint an equivalent UUIDv4 when `randomUUID` is missing.
 */
/**
 * Routes served by the mock HRM client. Mock tabs must each own a
 * distinct device session, so identity here is tab-scoped. Suffix
 * matching keeps this working under any basePath (e.g. `/hrm/...`).
 */
/**
 * Only the mock client route is tab-scoped. The suffix form covers any
 * basePath (e.g. `/hrm/client/mock`); the bare `/mock` exact match is
 * kept for short-link use. Anything else ending in `/mock` (e.g.
 * `/other/mock`) stays on the stable browser id.
 */
export const isTabScopedIdPath = (pathname: string): boolean =>
  pathname === '/mock' || pathname.endsWith('/client/mock')

interface ClientIdStores {
  local: Pick<Storage, 'getItem' | 'setItem'>
  session: Pick<Storage, 'getItem' | 'setItem'>
}

/**
 * Resolve the WebSocket client id for a page load. Mock pages get a
 * tab-scoped id (sessionStorage: one device per tab); every other page
 * keeps the stable browser id (localStorage) so reconnects and reloads
 * preserve the session. A storage failure falls back to an ephemeral id
 * rather than crashing the connection setup.
 */
export const resolveClientId = (
  stores: ClientIdStores,
  pathname: string
): string => {
  const store = isTabScopedIdPath(pathname) ? stores.session : stores.local
  let id: string | null = null
  try {
    id = store.getItem('clientId')
  } catch {
    id = null
  }
  if (!id) {
    id = generateClientId()
    try {
      store.setItem('clientId', id)
    } catch {
      // Ephemeral id: the session lasts as long as the page.
    }
  }
  return id
}

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

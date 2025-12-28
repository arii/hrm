// utils/cookie.ts
'use client'

/**
 * @function getCookie
 * @description Retrieves a cookie value by its name from the document's cookies.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string | undefined} The cookie value if found, otherwise undefined.
 */
export function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') {
    return undefined
  }
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

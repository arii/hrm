/**
 * @function setCookie
 * @description Sets a browser cookie with a specified name, value, and expiration.
 * This function is a no-op in non-browser environments.
 * @param {string} name - The name of the cookie.
 * @param {string} value - The value to store in the cookie.
 * @param {number} [days=365] - The number of days until the cookie expires.
 * @sideeffect Creates or updates a cookie in `document.cookie`.
 */
export const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/; SameSite=Strict; Secure`
  }
}

/**
 * @function getCookie
 * @description Retrieves the value of a cookie by its name.
 * Returns an empty string if the cookie is not found or in a non-browser environment.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string} The decoded value of the cookie.
 */
export const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

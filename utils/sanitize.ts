// utils/sanitize.ts

/**
 * A simple HTML escaper function.
 * @param str The string to escape.
 * @returns The escaped string.
 */
export const sanitize = (str: string): string => {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }

  const reg = /[&<>"'/]/gi
  return str.replace(reg, (match) => map[match])
}

/**
 * Checks if the current environment is production.
 *
 * @returns {boolean} True if NODE_ENV is 'production', false otherwise.
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

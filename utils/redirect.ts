// utils/redirect.ts
/**
 * Redirects the browser to the specified URL.
 * This is a wrapper around window.location.href to make it testable.
 * @param url The URL to redirect to.
 */
export const redirectTo = (url: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = url
  }
}

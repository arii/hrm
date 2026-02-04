// utils/redirect.ts
/**
 * Wrapper for window.location.href (testable).
 */
export const redirectTo = (url: string) => {
  if (typeof window !== 'undefined') {
    window.location.href = url
  }
}

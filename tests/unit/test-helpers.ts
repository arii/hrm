import {
  generateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from '@/lib/csrf'

/**
 * A type representing a simplified, plain object version of a NextRequest
 * for use in unit tests. This avoids the complexity and potential flakiness
 * of mocking the full NextRequest class.
 */
export type MockRequestLike = {
  headers: { get: (key: string) => string | null }
  cookies: { get: (key: string) => { value: string } | undefined }
  json: () => Promise<any>
  [key: string]: any // Allow other properties for flexibility
}

/**
 * Creates a plain JavaScript object that mimics a NextRequest for testing purposes,
 * including a valid CSRF token, header, and cookie.
 * This is designed to work with the refactored `withCsrfProtection` middleware.
 *
 * @param {any} [body={}] - The request body.
 * @returns {MockRequestLike} A request-like object for testing.
 */
export const createMockRequestWithCsrf = (body: any = {}): MockRequestLike => {
  const staticSecret = 'test_secret_key_for_jest_environment'
  const { token, secret } = generateCsrfToken(staticSecret)

  // Use Maps for a closer approximation of the Headers and Cookies objects
  const headers = new Map<string, string>()
  headers.set('content-type', 'application/json')
  headers.set(CSRF_HEADER_NAME, token)

  const cookies = new Map<string, { value: string }>()
  cookies.set(CSRF_COOKIE_NAME, { value: secret })

  return {
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) || null,
    },
    cookies: {
      get: (key: string) => cookies.get(key),
    },
    json: async () => body,
  }
}

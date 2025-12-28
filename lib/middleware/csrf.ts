// lib/middleware/csrf.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf'

// Define a more specific type for App Router handlers
type AppRouterHandler = (
  req: NextRequest,
  // Using a flexible yet typed approach for handler arguments
  ...args: { params?: Record<string, string | string[]> }[]
) => Promise<NextResponse | Response>

/**
 * A higher-order function to protect App Router routes from CSRF attacks.
 *
 * @param handler The App Router route handler to protect.
 * @returns A new handler that first validates the CSRF token before executing the original handler.
 */
export const withCsrf = (handler: AppRouterHandler) => {
  return async (
    req: NextRequest,
    ...args: { params?: Record<string, string | string[]> }[]
  ): Promise<NextResponse | Response> => {
    // Only validate for state-changing methods
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.method !== 'OPTIONS'
    ) {
      const headerToken = req.headers.get('x-csrf-token')
      const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value

      if (!headerToken) {
        return NextResponse.json(
          { message: 'Forbidden: CSRF token missing from headers' },
          { status: 403 }
        )
      }
      if (!cookieToken) {
        return NextResponse.json(
          { message: 'Forbidden: CSRF token missing from cookies' },
          { status: 403 }
        )
      }

      if (!validateCsrfToken(cookieToken, headerToken)) {
        return NextResponse.json(
          { message: 'Forbidden: Invalid CSRF token' },
          { status: 403 }
        )
      }
    }

    // If the token is valid or the method doesn't require a check, proceed to the handler
    return handler(req, ...args)
  }
}

// lib/middleware/csrf.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateCsrfToken } from '@/lib/csrf'

// Define a generic handler type for App Router routes
type AppRouterHandler = (
  req: NextRequest,
  ...args: any[]
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
    ...args: any[]
  ): Promise<NextResponse | Response> => {
    // Only validate for state-changing methods
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.method !== 'OPTIONS'
    ) {
      const csrfToken = req.headers.get('x-csrf-token')
      if (!csrfToken) {
        return NextResponse.json(
          { message: 'Forbidden: CSRF token missing' },
          { status: 403 }
        )
      }

      // Convert ReadonlyRequestCookies to a plain object for the validation function
      const requestCookies: Record<string, string> = {}
      for (const cookie of req.cookies.getAll()) {
        requestCookies[cookie.name] = cookie.value
      }

      if (!validateCsrfToken(csrfToken, requestCookies)) {
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

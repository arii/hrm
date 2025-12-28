import { NextRequest, NextResponse } from 'next/server'
import {
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
} from '@/lib/csrf'
import { nanoid } from 'nanoid'

// Define a type that represents the request-like object for flexibility in testing
type RequestLike = {
  headers: { get: (key: string) => string | null }
  cookies: { get: (key: string) => { value: string } | undefined }
}

/**
 * Higher-order function to protect API routes with CSRF validation.
 *
 * @template T - The context type for the handler.
 * @param {(req: NextRequest, context: T) => Promise<NextResponse>} handler - The API route handler to protect.
 * @returns {(req: NextRequest, context: T) => Promise<NextResponse>} The wrapped handler with CSRF protection.
 */
export const withCsrfProtection =
  <T>(handler: (req: NextRequest, context: T) => Promise<NextResponse>) =>
  async (req: NextRequest, context: T): Promise<NextResponse> => {
    // In a test environment, it's easier to pass a plain object.
    // This allows us to accommodate that without breaking the real NextRequest usage.
    const request: RequestLike = req as any

    const csrfToken = request.headers.get(CSRF_HEADER_NAME)
    if (!csrfToken) {
      return NextResponse.json(
        { message: 'Forbidden: CSRF token missing from headers' },
        { status: 403 }
      )
    }

    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value
    if (!csrfCookie) {
      return NextResponse.json(
        { message: 'Forbidden: CSRF token missing from cookies' },
        { status: 403 }
      )
    }

    if (!validateCsrfToken(csrfToken, csrfCookie)) {
      return NextResponse.json(
        { message: 'Forbidden: Invalid CSRF token' },
        { status: 403 }
      )
    }

    return handler(req, context)
  }

/**
 * App-wide middleware to set the CSRF cookie on initial page loads.
 *
 * @param {NextRequest} request - The incoming request.
 * @returns {NextResponse} The response with the CSRF cookie set, or the original response.
 */
export function csrfMiddleware(request: NextRequest): NextResponse {
  // Only process GET requests and page navigations
  if (request.method !== 'GET' || request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  const response = NextResponse.next()
  const secret = request.cookies.get(CSRF_COOKIE_NAME)?.value

  // Set a new cookie only if one doesn't already exist
  if (!secret) {
    const { secret: newSecret } = generateCsrfToken(nanoid())
    response.cookies.set({
      name: CSRF_COOKIE_NAME,
      value: newSecret,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })
  }

  return response
}

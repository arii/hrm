import { NextResponse, type NextRequest } from 'next/server';
import { createCsrfToken, getUnsignedToken, verifyCsrfToken } from './lib/csrf';

const PROTECTED_PATHS = ['/api/internal/', '/api/debug/'];
const API_AUTH_BASE = '/api/auth/';

export async function middleware(request: NextRequest) {
  // 1. Handle API CSRF validation first.
  if (PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const signedToken = request.cookies.get('csrf-token')?.value;
      const headerToken = request.headers.get('x-csrf-token');

      if (!signedToken || !headerToken || !(await verifyCsrfToken(signedToken, headerToken))) {
        return new NextResponse('Invalid CSRF token', { status: 403 });
      }
    }
  }

  // 2. Pass CSRF token to Server Components via request headers.
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const csrfCookie = request.cookies.get('csrf-token')?.value;

  if (csrfCookie) {
    // If cookie exists, unsign it and pass it in the request headers.
    const token = await getUnsignedToken(csrfCookie);
    if (token) {
      requestHeaders.set('x-csrf-token', token);
    }
  } else {
    // If cookie doesn't exist, generate a new token.
    const { token, signedToken } = await createCsrfToken();
    // Pass the raw token in the request headers for the current render.
    requestHeaders.set('x-csrf-token', token);
    // Set the signed token in the response cookie for subsequent requests.
    response.cookies.set('csrf-token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }

  // 3. Handle existing NextAuth reverse proxy logic.
  if (request.nextUrl.pathname.startsWith(API_AUTH_BASE)) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    if (forwardedHost && forwardedProto) {
      // Note: We modify the response headers here, which is correct for this logic.
      response.headers.set('x-forwarded-host', forwardedHost);
      response.headers.set('x-forwarded-proto', forwardedProto);
      if (forwardedProto === 'https') {
        response.headers.set('x-forwarded-ssl', 'on');
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

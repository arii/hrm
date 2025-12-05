import { NextResponse, type NextRequest } from 'next/server';
import { createCsrfToken, verifyCsrfToken } from './lib/csrf';

const PROTECTED_PATHS = ['/api/internal/', '/api/debug/'];
const API_AUTH_BASE = '/api/auth/';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Handle CSRF protection for protected API routes
  if (PROTECTED_PATHS.some(path => request.nextUrl.pathname.startsWith(path))) {
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const signedToken = request.cookies.get('csrf-token')?.value;
      const headerToken = request.headers.get('x-csrf-token');

      if (!signedToken || !headerToken || !(await verifyCsrfToken(signedToken, headerToken))) {
        return new NextResponse('Invalid CSRF token', { status: 403 });
      }
    }
  }
  
  // Set CSRF cookie if it doesn't exist
  if (!request.cookies.has('csrf-token')) {
    const { token, signedToken } = await createCsrfToken();
    response.cookies.set('csrf-token', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    response.headers.set('x-csrf-token', token)
  }

  // Handle reverse proxy headers for NextAuth
  if (request.nextUrl.pathname.startsWith(API_AUTH_BASE)) {
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    if (forwardedHost && forwardedProto) {
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
    '/api/auth/:path*',
    '/api/internal/:path*',
    '/api/debug/:path*',
  ],
};

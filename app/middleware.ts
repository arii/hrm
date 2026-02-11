// middleware.ts
import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    // SECURITY: Fail-Fast for Debug Routes in Production
    // This prevents exposure of sensitive debug endpoints (e.g., state resets, token dumps)
    // in production environments, as per the "Quality & Security First" principle.
    // Rejects requests to /api/debug/* in production mode.
    if (req.nextUrl.pathname.startsWith('/api/debug')) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Endpoint unavailable in production' },
          { status: 404 }
        )
      }
    }

    const url = req.nextUrl.clone()

    // If the user is being redirected to a page with an auth error,
    // we should let them land there to break any potential redirect loops caused
    // by the default `withAuth` behavior.
    if (url.searchParams.get('error') === 'SpotifyAuthFailed') {
      return NextResponse.next()
    }

    // Default behavior: allow the request to proceed.
    return NextResponse.next()
  },
  {
    callbacks: {
      // This configuration makes the middleware run on all matching paths,
      // regardless of whether the user is authenticated or not.
      // We return true to always execute the middleware function above.
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

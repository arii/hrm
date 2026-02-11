// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse, NextFetchEvent } from 'next/server'

const authMiddleware = withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextRequest) {
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

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // 1. Fail-Fast for Debug Routes in Production
  // This is outside withAuth to ensure it runs even for unauthenticated users,
  // effectively masking the routes.
  if (req.nextUrl.pathname.startsWith('/api/debug')) {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse(
        JSON.stringify({ error: 'Endpoint unavailable in production' }),
        { status: 404, headers: { 'content-type': 'application/json' } }
      )
    }
  }

  return (authMiddleware as any)(req, event)
}

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

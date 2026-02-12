import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    // Block debug endpoints in production to prevent state resets or token leaks.
    if (
      process.env.NODE_ENV === 'production' &&
      req.nextUrl.pathname.startsWith('/api/debug')
    ) {
      return NextResponse.json(
        { error: 'Endpoint unavailable in production' },
        { status: 404 }
      )
    }

    // Handle Spotify auth failure redirect loop
    if (req.nextUrl.searchParams.get('error') === 'SpotifyAuthFailed') {
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Ensure the middleware always runs, even for unauthenticated users,
      // to allow the production guard to execute.
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

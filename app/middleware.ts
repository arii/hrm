import { withAuth, NextRequestWithAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse, NextFetchEvent } from 'next/server'

const authMiddleware = withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true,
    },
  }
)

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent
) {
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

  return authMiddleware(req as NextRequestWithAuth, event)
}

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

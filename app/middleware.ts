// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req: NextRequest) {
    const url = req.nextUrl.clone()

    // Allow error=SpotifyAuthFailed to land (breaks auth loop)
    if (url.searchParams.get('error') === 'SpotifyAuthFailed') {
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      // Return true to run middleware on all paths
      authorized: () => true,
    },
  }
)

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

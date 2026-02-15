// middleware.ts
import { withAuth } from 'next-auth/middleware'
import { NextRequest, NextResponse } from 'next/server'

export default withAuth(
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

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

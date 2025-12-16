// middleware.ts
import { NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(_req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: () => true, // This allows all requests to pass through the middleware
    },
  }
)

export const config = {
  matcher: ['/api/internal/:path*', '/api/debug/:path*', '/api/users/:path*'],
}

// File: app/api/auth/sync/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import logger from '@/utils/logger'
import { env } from '@/lib/env'
import { getAPIURL } from '@/utils/urls'

/**
 * API route to synchronize the NextAuth session token with the backend services.
 *
 * This endpoint acts as a bridge between the Next.js authentication context and
 * the stateful Express server. It retrieves the full JWT from the user's session,
 * extracts the necessary token details, and securely forwards them to an internal
 * endpoint on the Express server.
 *
 * @param req The incoming Next.js API request.
 * @returns A NextResponse object indicating success or failure.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Get the raw JWT from the session cookie.
    const token = await getToken({ req, secret: env.NEXTAUTH_SECRET })

    // 2. Validate the token.
    if (
      !token ||
      !token.accessToken ||
      !token.refreshToken ||
      !token.providerAccountId
    ) {
      logger.error('API Sync: Invalid or missing token details in JWT.')
      return NextResponse.json(
        { error: 'Authentication token is invalid or missing details.' },
        { status: 401 }
      )
    }

    // 3. Construct the payload for the internal endpoint.
    const tokenPayload = {
      provider: 'spotify',
      sub: token.providerAccountId,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_in: token.accessTokenExpires
        ? Math.floor((token.accessTokenExpires - Date.now()) / 1000)
        : 3600,
      scope: token.scope || '',
      obtainedAt: Date.now(),
    }

    // 4. Securely forward the payload to the internal sync endpoint.
    const internalSyncUrl = getAPIURL('internal/sync-token')
    const response = await fetch(internalSyncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': env.NEXTAUTH_SECRET,
      },
      body: JSON.stringify(tokenPayload),
    })

    // 5. Handle the response from the internal endpoint.
    if (!response.ok) {
      const errorBody = await response.text()
      logger.error(
        {
          status: response.status,
          body: errorBody,
          url: internalSyncUrl,
        },
        'API Sync: Internal sync request failed.'
      )
      return NextResponse.json(
        { error: 'Failed to sync token with backend service.' },
        { status: response.status }
      )
    }

    logger.info(
      'API Sync: Token successfully forwarded to the internal backend service.'
    )

    // 6. Return a success response to the client.
    return NextResponse.json({ success: true, message: 'Token synced.' })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An unknown error occurred.'
    logger.error(
      { error: message },
      'API Sync: Unhandled Internal Server Error'
    )
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

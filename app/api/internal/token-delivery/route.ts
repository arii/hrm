// app/api/internal/token-delivery/route.ts
import { NextResponse } from 'next/server'
import logger from '@/utils/logger'
import { getBaseURL } from '@/utils/urls'

/**
 * Handles the POST request to deliver a new Spotify token.
 * This route is called by the NextAuth callback after a successful
 * Spotify authentication. It then forwards the token to the internal
 * Express server endpoint.
 *
 * @param {Request} req - The incoming request, containing the new token in its body.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function POST(req: Request): Promise<NextResponse> {
  try {
    const newTokens = await req.json()
    const internalUpdateUrl = `${getBaseURL()}/api/internal/server/token-update`

    const response = await fetch(internalUpdateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newTokens),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      logger.error(
        {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
        },
        'Internal token update failed.'
      )
      return NextResponse.json(
        { message: 'Internal server error: Failed to update token.' },
        { status: 500 }
      )
    }

    logger.info('Spotify tokens delivered and forwarded successfully.')
    return NextResponse.json(
      { message: 'Tokens delivered successfully' },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error }, 'Error processing token delivery.')
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { message: 'Invalid JSON in request body.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: 'An internal server error occurred.' },
      { status: 500 }
    )
  }
}

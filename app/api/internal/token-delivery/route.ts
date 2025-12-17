// app/api/internal/token-delivery/route.ts
import { NextResponse } from 'next/server'
import { spotifyService } from '@/utils/socketManager' // Assuming spotifyService is exported from socketManager
import logger from '@/utils/logger'

/**
 * Handles the POST request to deliver a new Spotify token.
 * This route is called by the NextAuth callback after a successful
 * Spotify authentication.
 *
 * @param {Request} req - The incoming request, containing the new token in its body.
 * @returns {Promise<NextResponse>} A promise that resolves to the response.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!spotifyService) {
    logger.error('Spotify service is not available on the server.')
    return NextResponse.json(
      { message: 'Internal server error: Spotify service not initialized.' },
      { status: 500 }
    )
  }

  try {
    const newTokens = await req.json()
    await spotifyService.handleTokenUpdate(newTokens)
    logger.info('Spotify tokens delivered and updated successfully.')
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

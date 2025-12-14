import { NextRequest, NextResponse } from 'next/server'
import { spotifyServiceInstance } from '@/utils/socketManager'
import { AccessToken } from '@spotify/web-api-ts-sdk'
import logger from '@/utils/logger'

export async function POST(request: NextRequest) {
  // Security check: Validate internal secret header
  const internalTokenSecret = process.env.INTERNAL_TOKEN_SECRET
  const requestSecret = request.headers.get('x-internal-token-secret')

  if (!internalTokenSecret || requestSecret !== internalTokenSecret) {
    logger.warn('[API-TOKEN-DELIVERY] Unauthorized attempt to deliver token')
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const newTokens = (await request.json()) as AccessToken
    if (spotifyServiceInstance) {
      // Directly update the service with the new tokens.
      await spotifyServiceInstance.setRefreshToken(newTokens)
      await spotifyServiceInstance.forcePollAndBroadcast()
      logger.info(
        '[API-TOKEN-DELIVERY] Spotify tokens delivered and service updated successfully'
      )
      return NextResponse.json({ message: 'Tokens delivered successfully' })
    } else {
      // This case should ideally not be reached if the server is running correctly.
      logger.error(
        '[API-TOKEN-DELIVERY] Spotify service not available for token delivery'
      )
      return NextResponse.json(
        { message: 'Spotify service not available' },
        { status: 503 }
      )
    }
  } catch (error) {
    logger.error('Error processing token delivery:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

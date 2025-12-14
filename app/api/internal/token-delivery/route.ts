import { NextRequest, NextResponse } from 'next/server'
import { spotifyServiceInstance } from '@/utils/socketManager'
import { AccessToken } from '@spotify/web-api-ts-sdk'

export async function POST(request: NextRequest) {
  try {
    const newTokens = (await request.json()) as AccessToken
    if (spotifyServiceInstance) {
      // Directly update the service with the new tokens.
      await spotifyServiceInstance.setRefreshToken(newTokens)
      await spotifyServiceInstance.forcePollAndBroadcast()
      return NextResponse.json({ message: 'Tokens delivered successfully' })
    } else {
      // This case should ideally not be reached if the server is running correctly.
      return NextResponse.json(
        { message: 'Spotify service not available' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Error processing token delivery:', error)
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

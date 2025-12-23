// File: app/api/internal/token-delivery/route.ts
import { NextResponse } from 'next/server'
import { serviceContainer } from '../../../../lib/serviceContainer'
import { SpotifyPolling } from '../../../../services/spotifyPolling'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const spotifyService = serviceContainer.get<SpotifyPolling>('spotifyService')
    await spotifyService.handleTokenUpdate(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error handling token delivery:', error)
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    )
  }
}

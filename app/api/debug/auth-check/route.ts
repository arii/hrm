import { NextResponse } from 'next/server'
import { getBaseURL, getSpotifyCallbackURL } from '@/utils/urls'
import { env } from '@/lib/env'

/**
 * Debug endpoint to verify Spotify OAuth configuration is loaded correctly.
 * This helps diagnose "Invalid Client" and redirect URI issues.
 */
export async function GET() {
  try {
    const {
      SPOTIFY_CLIENT_ID: clientId,
      SPOTIFY_CLIENT_SECRET: clientSecret,
      NEXTAUTH_SECRET: nextAuthSecret,
    } = env
    const nextAuthUrl = getBaseURL()

    return NextResponse.json({
      nextAuthConfigured: !!(nextAuthUrl && nextAuthSecret),
      spotifyConfigured: !!(clientId && clientSecret),
      clientId: clientId || undefined,
      hasClientSecret: !!clientSecret,
      redirectUri: getSpotifyCallbackURL(),
    })
  } catch (err) {
    console.error('Auth check failed:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

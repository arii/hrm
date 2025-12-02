import { NextResponse } from 'next/server'
import { getBaseURL, getSpotifyCallbackURL } from '@/utils/urls'
import { isProduction } from '@/utils/environment'

/**
 * Debug endpoint to verify Spotify OAuth configuration is loaded correctly.
 * This helps diagnose "Invalid Client" and redirect URI issues.
 */
export async function GET() {
  if (isProduction()) {
    return new NextResponse('Not Found', { status: 404 })
  }
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
    const nextAuthUrl = getBaseURL()
    const nextAuthSecret = process.env.NEXTAUTH_SECRET

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

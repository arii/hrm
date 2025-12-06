// app/api/auth/spotify/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getBaseURL } from '@/utils/urls'

const callbackQuerySchema = z.object({
  code: z.string(),
  state: z.string(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = Object.fromEntries(searchParams.entries())

  const validationResult = callbackQuerySchema.safeParse(query)

  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { code, state } = validationResult.data

  const storedState = request.cookies.get('spotify_auth_state')?.value

  if (!storedState || state !== storedState) {
    return NextResponse.json({ error: 'State mismatch' }, { status: 400 })
  }

  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('code', code)
    params.append('redirect_uri', `${getBaseURL()}/api/auth/spotify/callback`)

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: params,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to exchange code for tokens: ${errorText}`)
    }

    const tokens = await response.json()

    console.log('Received tokens:', tokens)

    const redirectUrl = getBaseURL()
    const nextResponse = NextResponse.redirect(redirectUrl)
    nextResponse.cookies.set('spotify_access_token', tokens.access_token, { path: '/' })
    nextResponse.cookies.set('spotify_refresh_token', tokens.refresh_token, { httpOnly: true, path: '/' })
    return nextResponse
  } catch (error) {
    console.error('Error exchanging code for tokens:', error)
    return NextResponse.json({ error: 'Failed to authenticate with Spotify' }, { status: 500 })
  }
}

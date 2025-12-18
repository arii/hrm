// File: lib/auth.ts (Auth.js v5 Configuration)
import NextAuth from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import logger from '@/utils/logger'
import { getAPIURL } from '../utils/urls'

const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-top-read',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming', // Required for Web Playback SDK
].join(',')

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = Date.now() + (account.expires_in ?? 3600) * 1000

        // --- CRITICAL STEP: Deliver Refresh Token to Persistent Service ---
        if (account.refresh_token) {
          try {
            const tokenPayload = {
              provider: account.provider,
              sub: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_in: account.expires_at
                ? Math.floor((account.expires_at * 1000 - Date.now()) / 1000)
                : 3600,
              scope: account.scope || '',
              obtainedAt: Date.now(),
            }

            const response = await fetch(getAPIURL('internal/token-delivery'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(tokenPayload),
            })
            const responseBody = await response.text()
            if (response.ok) {
              logger.info(
                { status: response.status, body: responseBody },
                'Internal token delivery successful'
              )
            } else {
              logger.warn(
                { status: response.status, body: responseBody },
                'Internal token delivery failed'
              )
            }
          } catch (e) {
            logger.error({ error: e }, 'Internal token delivery failed')
          }
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token.accessTokenExpires as number)) {
        return token
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken as string
      return session
    },
  },
})

async function refreshAccessToken(token: any) {
  try {
    const url = 'https://accounts.spotify.com/api/token'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ':' +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
      }),
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken, // Fall back to old refresh token
    }
  } catch (error) {
    logger.error({ error }, 'Failed to refresh access token')
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

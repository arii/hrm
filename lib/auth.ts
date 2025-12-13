import { AuthOptions } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import SpotifyProvider from 'next-auth/providers/spotify'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { db } from '@/lib/db'

// Extend the Session and User types to include properties used in the app
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }

  interface User {
    id: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
    error?: string
    sub: string
  }
}

/**
 * Safely extracts the hostname from the `NEXTAUTH_URL` environment variable to be used
 * as the domain for NextAuth cookies. This prevents cookie domain errors by returning
 * `undefined` for invalid URLs or for local development environments (`localhost`, `127.0.0.1`),
 * allowing the browser to default to the current domain.
 *
 * @returns {string | undefined} The hostname for the cookie domain, or `undefined` if it
 *                               should not be set.
 */
function getCookieDomain(): string | undefined {
  if (!process.env.NEXTAUTH_URL) {
    return undefined
  }
  try {
    const url = new URL(process.env.NEXTAUTH_URL)
    // For localhost and 127.0.0.1, don't set a domain (browsers will use current domain)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return undefined
    }
    return url.hostname
  } catch (e) {
    console.error(
      'Failed to parse NEXTAUTH_URL for cookie domain:',
      process.env.NEXTAUTH_URL,
      e
    )
    return undefined
  }
}

// Define the scopes required for the application's Spotify features.
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-top-read',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming', // Required for Web Playback SDK
].join(',')

/**
 * Refreshes an expired Spotify access token using the refresh token.
 * This function is critical for maintaining an active session and for
 * allowing background services to access the Spotify API.
 *
 * @param {JWT} token The JWT from NextAuth containing user and token info.
 * @returns {Promise<JWT>} The updated JWT with a new access token and expiry,
 *                         or the original token with an error if refresh fails.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = 'https://accounts.spotify.com/api/token'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
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

    // CRITICAL: Persist the newly refreshed tokens to the database.
    // This allows background workers (like the Spotify polling service)
    // to always have a fresh token.
    if (token.sub) {
      const account = await db.account.findFirst({
        where: { userId: token.sub, provider: 'spotify' },
      })

      if (account) {
        await db.account.update({
          where: { id: account.id },
          data: {
            access_token: refreshedTokens.access_token,
            expires_at: Math.floor(
              Date.now() / 1000 + refreshedTokens.expires_in
            ),
            refresh_token:
              refreshedTokens.refresh_token ?? account.refresh_token, // Spotify may not always return a new refresh token
          },
        })
        console.log(`[DB] Updated Spotify tokens for user ${token.sub}`)
      }
    }

    // Return the updated token for the client-side session.
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('[AUTH REFRESH ERROR]', error)
    return { ...token, error: 'RefreshAccessTokenError' }
  }
}

/**
 * Configuration options for NextAuth.js.
 * This object defines providers, callbacks, and the database adapter.
 */
export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: { params: { scope: SPOTIFY_SCOPES } },
    }),
  ],
  session: {
    // We use JWT for session management for performance and to hold tokens.
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: getCookieDomain(),
      },
    },
  },
  callbacks: {
    /**
     * The JWT callback is executed when a token is created or updated.
     * It's responsible for populating the JWT with the necessary data
     * from the user's account upon sign-in and for handling token rotation.
     */
    async jwt({ token, account, user }) {
      // 1. Initial sign-in:
      // The user and account objects are only available on the first login.
      // The Prisma adapter automatically saves the Account and User to the DB.
      // We just need to populate the JWT with the token information.
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at! * 1000
        token.sub = user.id // Ensure the JWT subject matches the User ID in the DB
        return token
      }

      // 2. Token is still valid:
      // If the access token has not expired yet (with a 60s buffer), return it.
      if (
        token.accessTokenExpires &&
        Date.now() < token.accessTokenExpires - 60000
      ) {
        return token
      }

      // 3. Token is expired:
      // If the token is expired, we need to refresh it.
      console.log('[AUTH] Access token expired, refreshing...')
      return await refreshAccessToken(token)
    },
    /**
     * The session callback is executed when a client checks its session.
     * It's responsible for exposing a subset of the JWT data to the client.
     */
    async session({ session, token }) {
      // Expose the User ID and any token errors to the client-side session object.
      session.user.id = token.sub
      session.accessToken = token.accessToken as string
      session.error = token.error as string
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

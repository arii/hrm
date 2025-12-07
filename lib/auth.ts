// File: lib/auth.ts (NextAuth Configuration - Shared)
import NextAuth, { Account, AuthOptions, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import SpotifyProvider from 'next-auth/providers/spotify'
import prisma from './prisma'

// Extend the Session type to include accessToken and error
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
  }
}

/**
 * @file NextAuth configuration for Spotify authentication.
 * @module lib/auth
 */

/**
 * Refreshes an expired Spotify access token using a refresh token.
 *
 * This function is invoked by the NextAuth JWT callback when an access token
 * is expired. It posts to Spotify's token endpoint to get a new access token
 * and updates the token object with the new credentials.
 *
 * @param {JWT} token The JWT from NextAuth containing the expired accessToken
 *                    and the valid refreshToken.
 * @returns {Promise<JWT>} The updated JWT with a new accessToken and expiry,
 *                         or the original token with an error flag if refresh fails.
 */
async function refreshAccessToken(token: JWT) {
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

    // Update the token object with new values from Spotify
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Note: Spotify might or might not send a new refresh token.
      // If it does, use it. If not, keep the old one.
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('[AUTH REFRESH ERROR]', error)
    // If refresh fails, return the original token and an error property
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

// Define scopes required: user-read-playback-state to poll the current track,
// user-modify-playback-state to control playback (play/pause/skip),
// streaming for Web Playback SDK (play music in browser).
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
 * Configuration options for NextAuth.js.
 *
 * This object defines the authentication providers, callbacks, and other settings
 * for managing user sessions and authentication flows. It is configured to use the
 * Spotify provider with specific scopes required for the application's features.
 *
 * @type {AuthOptions}
 */
export const authOptions: AuthOptions = {
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
  // Handle reverse proxy configuration
  ...(process.env.NODE_ENV === 'production' && {
    trustHost: true,
  }),
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Set domain based on environment
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
              ? new URL(process.env.NEXTAUTH_URL).hostname
              : undefined
            : undefined,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
              ? new URL(process.env.NEXTAUTH_URL).hostname
              : undefined
            : undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
              ? new URL(process.env.NEXTAUTH_URL).hostname
              : undefined
            : undefined,
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900, // 15 minutes
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
              ? new URL(process.env.NEXTAUTH_URL).hostname
              : undefined
            : undefined,
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 900, // 15 minutes
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL
              ? new URL(process.env.NEXTAUTH_URL).hostname
              : undefined
            : undefined,
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // 1. Initial sign-in
      if (account) {
        // --- CRITICAL STEP: Write Refresh Token to SECURE DATABASE ---
        if (account.refresh_token && account.expires_at) {
          try {
            await prisma.spotifyToken.upsert({
              where: { spotifyUserId: account.providerAccountId },
              update: {
                accessToken: account.access_token as string,
                refreshToken: account.refresh_token,
                accessTokenExpiresAt: new Date(account.expires_at * 1000),
                scope: account.scope || '',
              },
              create: {
                spotifyUserId: account.providerAccountId,
                accessToken: account.access_token as string,
                refreshToken: account.refresh_token,
                accessTokenExpiresAt: new Date(account.expires_at * 1000),
                scope: account.scope || '',
              },
            })
            console.log(
              `[NextAuth] Token persisted for user: ${account.providerAccountId}`
            )
          } catch (e) {
            console.error('[AUTH DB WRITE ERROR]', e)
          }
        }

        // Return the token as before (the in-memory JWT holds the necessary data for the session)
        return {
          accessToken: account.access_token,
          accessTokenExpires:
            Date.now() + (Number(account.expires_in) || 3600) * 1000,
          refreshToken: account.refresh_token,
          // ... other JWT fields
        }
      }

      // 2. Token is still valid - return it as-is
      // Add a 60-second buffer to be safe
      if (Date.now() < (token.accessTokenExpires as number) - 60000) {
        return token
      }

      // 3. Token is expired - try to refresh it
      console.log('[AUTH] Access token expired, refreshing...')
      return await refreshAccessToken(token)
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Pass the updated token and error info to the session object
      session.accessToken = token.accessToken as string
      session.error = token.error as string // Pass any refresh errors
      return session
    },
  },
  // Ensure the token can be accessed securely
  secret:
    process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
}

export default NextAuth(authOptions)

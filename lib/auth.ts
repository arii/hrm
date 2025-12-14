// File: lib/auth.ts (NextAuth Configuration - Shared)
import { Account, AuthOptions, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import SpotifyProvider from 'next-auth/providers/spotify'
import { getAPIURL } from '../utils/urls'
import { env } from './env'

// Extend the Session type to include accessToken and error
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
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
  if (!env.NEXTAUTH_URL) {
    return undefined
  }
  try {
    const url = new URL(env.NEXTAUTH_URL)
    // For localhost and 127.0.0.1, don't set a domain (browsers will use current domain)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return undefined
    }
    return url.hostname
  } catch (e) {
    console.error(
      'Failed to parse NEXTAUTH_URL for cookie domain:',
      env.NEXTAUTH_URL,
      e
    )
    return undefined
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
    // Use the standard Spotify accounts endpoint for token refresh
    const url = 'https://accounts.spotify.com/api/token'
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization:
          'Basic ' +
          Buffer.from(
            env.SPOTIFY_CLIENT_ID + ':' + env.SPOTIFY_CLIENT_SECRET
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
      id: 'spotify',
      name: 'Spotify',
      clientId: env.SPOTIFY_CLIENT_ID || '',
      clientSecret: env.SPOTIFY_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  // In NextAuth v4, URL is automatically detected from NEXTAUTH_URL env var
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        domain: getCookieDomain(),
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        domain: getCookieDomain(),
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        domain: getCookieDomain(),
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: 900, // 15 minutes
        domain: getCookieDomain(),
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: env.NODE_ENV === 'production',
        maxAge: 900, // 15 minutes
        domain: getCookieDomain(),
      },
    },
  },
  useSecureCookies: env.NODE_ENV === 'production',
  debug: env.NODE_ENV === 'development',
  callbacks: {
    /**
     * Callback executed on a successful sign-in.
     *
     * @returns {boolean} Always returns true to allow sign-in.
     */
    async signIn() {
      // Always allow Spotify sign-in
      return true
    },
    /**
     * Callback for creating and managing the JSON Web Token (JWT).
     *
     * This function is called whenever a JWT is created (i.e., at sign-in) or
     * updated (i.e., whenever a session is accessed in the client). It is
     * responsible for persisting the Spotify access token and refresh token
     * in the JWT.
     *
     * @param {object} params - The parameters for the JWT callback.
     * @param {JWT} params.token - The JWT token.
     * @param {Account | null} params.account - The account object from the provider.
     * @returns {Promise<JWT>} The updated JWT.
     */
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // 1. Initial sign-in
      if (account) {
        console.log('[AUTH JWT] Initial sign-in - Full account object:', {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          hasAccessToken: !!account.access_token,
          hasProfile: !!account.profile,
          profileKeys: account.profile
            ? Object.keys(account.profile)
            : 'NO PROFILE',
          profileEmail: (account.profile as Record<string, unknown>)?.email,
          profileDisplayName: (account.profile as Record<string, unknown>)
            ?.display_name,
        })
        console.log(
          '[AUTH JWT] Initial token before modification:',
          Object.keys(token)
        )

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
              console.log(
                'Internal token delivery successful. Status:',
                response.status,
                'Body:',
                responseBody
              )
            } else {
              console.error(
                'Internal token delivery failed. Status:',
                response.status,
                'Body:',
                responseBody
              )
            }
          } catch (e) {
            console.error('Internal token delivery failed:', e)
          }
        }

        // Return token with Spotify account data
        const updatedToken = {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires:
            Date.now() + (Number(account.expires_in) || 3600) * 1000,
          refreshToken: account.refresh_token,
        }
        console.log(
          '[AUTH JWT] Returning token with keys:',
          Object.keys(updatedToken),
          'has sub:',
          !!updatedToken.sub
        )
        return updatedToken
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
    /**
     * Callback for creating and managing the user session.
     *
     * This function is called whenever a session is checked. It passes the
     * access token from the JWT to the client-side session object.
     *
     * @param {object} params - The parameters for the session callback.
     * @param {Session} params.session - The session object.
     * @param {JWT} params.token - The JWT token.
     * @returns {Promise<Session>} The updated session object.
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      // Pass the updated token and error info to the session object
      console.log(
        '[AUTH SESSION] Creating session, token keys:',
        Object.keys(token)
      )
      session.accessToken = token.accessToken as string
      session.error = token.error as string // Pass any refresh errors
      console.log(
        '[AUTH SESSION] Session created with accessToken:',
        !!session.accessToken
      )
      return session
    },
  },
  // Ensure the token can be accessed securely
  secret: env.NEXTAUTH_SECRET || '',
}

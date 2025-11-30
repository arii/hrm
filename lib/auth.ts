// File: lib/auth.ts (NextAuth Configuration - Shared)
import NextAuth, { Account, AuthOptions, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import SpotifyProvider from 'next-auth/providers/spotify'
import { getSpotifyCallbackURL } from '../utils/urls'
import { SpotifyPolling } from '@/services/spotifyPolling'
import { SpotifyTokenInputPayload } from '@/services/spotifyTokenManager'

// Extend the Session type to include accessToken and error
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
  }
}

// A function to handle the token refresh logic
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

export const authOptions: AuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
          redirect_uri: getSpotifyCallbackURL(),
        },
      },
    }),
  ],
  // Handle reverse proxy configuration
  ...(process.env.NODE_ENV === 'production' && {
    trustHost: true
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
        domain: process.env.NODE_ENV === 'production' ? 
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined :
          undefined,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? 
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined :
          undefined,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? 
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined :
          undefined,
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
        domain: process.env.NODE_ENV === 'production' ? 
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined :
          undefined,
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
        domain: process.env.NODE_ENV === 'production' ? 
          process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined :
          undefined,
      },
    },
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  debug: process.env.NODE_ENV === 'development',
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // 1. Initial sign-in
      if (account) {
        const tokenData = {
          accessToken: account.access_token,
          accessTokenExpires:
            Date.now() + (Number(account.expires_in) || 3600) * 1000,
          refreshToken: account.refresh_token,
        }

        // Securely deliver the token to the singleton service instance
        if (account.refresh_token && account.access_token) {
          try {
            const tokenManager =
              SpotifyPolling.getInstance().getTokenManager()
            const tokenPayload: SpotifyTokenInputPayload = {
              provider: account.provider,
              sub: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_in: account.expires_at
                ? Math.floor((account.expires_at * 1000 - Date.now()) / 1000)
                : 3600,
              scope: account.scope || '',
            }
            tokenManager.setToken(tokenPayload)

            // Signal the polling service to re-initialize its SDK with the new token
            SpotifyPolling.getInstance().setRefreshToken('signal')
          } catch (e) {
            console.error(
              '[AUTH] Failed to deliver token to SpotifyTokenManager:',
              e
            )
          }
        }

        return tokenData
      }

      // 2. Token is still valid - return it as-is
      // Add a 60-second buffer to be safe
      if (Date.now() < (token.accessTokenExpires as number) - 60000) {
        return token
      }

      // 3. Token is expired - try to refresh it
      console.log('[AUTH] Access token expired, refreshing...')
      const refreshedToken = await refreshAccessToken(token)

      // 4. If refresh was successful, update the persistent token
      if (!refreshedToken.error) {
        try {
          const tokenManager = SpotifyPolling.getInstance().getTokenManager()
          const tokenPayload: SpotifyTokenInputPayload = {
            provider: 'spotify', // Assuming spotify, may need adjustment
            sub: token.sub || '', // `sub` should exist on the JWT
            access_token: refreshedToken.accessToken as string,
            refresh_token: refreshedToken.refreshToken as string,
            expires_in: refreshedToken.accessTokenExpires
              ? Math.floor(
                  (refreshedToken.accessTokenExpires - Date.now()) / 1000
                )
              : 3600,
            scope: (token.scope as string) || '', // Scope might not be on refreshed token, carry over
          }
          tokenManager.setToken(tokenPayload)
          // Signal the polling service to re-initialize its SDK
          SpotifyPolling.getInstance().setRefreshToken('signal')
        } catch (e) {
          console.error(
            '[AUTH] Failed to deliver refreshed token to SpotifyTokenManager:',
            e
          )
        }
      }

      return refreshedToken
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // Pass the updated token and error info to the session object
      session.accessToken = token.accessToken as string
      session.error = token.error as string // Pass any refresh errors
      return session
    },
  },
  // Ensure the token can be accessed securely
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
}

export default NextAuth(authOptions)

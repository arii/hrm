// File: lib/auth.ts (Authentication Configuration)
/**
 * Configuration for NextAuth.js, including providers and session management.
 */

import { NextAuthOptions, Awaitable, User, Session } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import { env } from './env'
import { JWT } from 'next-auth/jwt'
import {
  ExtendedJWT,
  refreshAccessToken,
} from './spotify/spotifyAuth'

// Helper to check if the environment is configured for production
const isProduction = env.NODE_ENV === 'production'

// Verify that the NEXTAUTH_URL is set in the environment
if (!env.NEXTAUTH_URL) {
  throw new Error(
    'FATAL: NEXTAUTH_URL environment variable is not set. This is required for authentication to work.'
  )
}
try {
  const url = new URL(env.NEXTAUTH_URL)
  if (isProduction && url.protocol !== 'https:') {
    console.warn(
      'WARN: NEXTAUTH_URL is not HTTPS. In production, this is a security risk.'
    )
  }
} catch (e) {
  throw new Error(
    'FATAL: NEXTAUTH_URL is not a valid URL. Please check your environment variables.'
  )
}

// Scopes required for Spotify API access
const spotifyScopes = [
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'streaming',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
  'user-top-read',
].join(',')

// Spotify authorization URL with defined scopes
const spotifyAuthorizationUrl = `https://accounts.spotify.com/authorize?scope=${spotifyScopes}`

// Secret for signing JWTs
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID as string,
      clientSecret: env.SPOTIFY_CLIENT_SECRET as string,
      authorization: spotifyAuthorizationUrl,
    }),
  ],
  secret: NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, user }): Promise<ExtendedJWT> {
      // Initial sign in
      if (account && user) {
        return {
          accessToken: account.access_token,
          accessTokenExpires: Date.now() + (account.expires_at ?? 0) * 1000,
          refreshToken: account.refresh_token,
          user,
        }
      }

      // Return previous token if the access token has not expired yet
      if (Date.now() < (token as ExtendedJWT).accessTokenExpires) {
        return token as ExtendedJWT
      }

      // Access token has expired, try to update it
      return refreshAccessToken(token as ExtendedJWT)
    },
    async session({
      session,
      token,
    }: {
      session: Session
      token: JWT
    }): Promise<Session> {
      if (session.user && token.user) {
        session.user = (token as ExtendedJWT).user
        session.accessToken = (token as ExtendedJWT).accessToken
        session.error = (token as ExtendedJWT).error
      }
      return session
    },
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: isProduction,
      },
    },
  },
  useSecureCookies: isProduction,
  debug: !isProduction,
}

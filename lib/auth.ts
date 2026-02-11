// File: lib/auth.ts (NextAuth Configuration - Shared)
import { Account, AuthOptions, Session } from 'next-auth'
import { JWT } from 'next-auth/jwt'
import SpotifyProviderModule from 'next-auth/providers/spotify'
import logger from '../utils/logger.js' // Explicit .js extension for ESM build
import { getAPIURL } from '../utils/urls.js' // Explicit .js extension for ESM build
import { env } from './env.js'
import { refreshSpotifyToken } from './spotify.js'

// Extend the Session type to include accessToken and error
declare module 'next-auth' {
  interface Session {
    accessToken?: string
    error?: string
    scope?: string
  }
}

// Extend the JWT type to include custom properties
declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    accessTokenExpires?: number
    refreshToken?: string
    error?: string
    providerAccountId?: string
    scope?: string
  }
}

// Helper to sync token with backend
async function syncTokenWithBackend(token: JWT) {
  try {
    const tokenPayload = {
      provider: 'spotify',
      sub: token.providerAccountId, // providerAccountId is mapped to sub in JWT usually
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_in: Math.floor(
        ((token.accessTokenExpires as number) - Date.now()) / 1000
      ),
      scope: token.scope || '', // Ensure scope is preserved in JWT if needed
      obtainedAt: Date.now(),
    }
    // Only sync if we have valid data
    if (!tokenPayload.access_token || !tokenPayload.refresh_token) return

    const response = await fetch(getAPIURL('internal/token-delivery'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token-secret': env.NEXTAUTH_SECRET,
      },
      body: JSON.stringify(tokenPayload),
    })

    if (response.ok) {
      logger.debug('Token successfully synced with the backend.')
    } else {
      logger.warn(
        {
          status: response.status,
          body: await response.text(),
        },
        'Failed to sync token with the backend.'
      )
    }
  } catch (e) {
    logger.error({ error: e }, 'Failed to sync refreshed token with backend')
  }
}

/**
 * Safely extracts the hostname from `NEXTAUTH_URL` to set the cookie domain.
 * Returns `undefined` for localhost to allow the browser to use the current domain,
 * preventing cookie domain errors in local development.
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
    logger.error(
      { url: env.NEXTAUTH_URL, error: e },
      'Failed to parse NEXTAUTH_URL for cookie domain'
    )
    return undefined
  }
}

/**
 * Refreshes an expired Spotify access token using the refresh token.
 * Invoked by the NextAuth JWT callback when the access token is expired.
 */
async function refreshAccessToken(token: JWT) {
  try {
    const refreshedTokens = await refreshSpotifyToken(
      token.refreshToken as string
    )

    // Update the token object with new values from Spotify
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      // Note: Spotify might or might not send a new refresh token.
      // If it does, use it. If not, keep the old one.
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      scope: refreshedTokens.scope ?? token.scope, // Persist the scope
    }
  } catch (error) {
    logger.error({ error }, 'Failed to refresh access token')
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

// --- CRITICAL SECURITY CHECK ---
// Ensure NEXTAUTH_SECRET is explicitly checked before configuration.
const NEXTAUTH_SECRET = env.NEXTAUTH_SECRET

if (!NEXTAUTH_SECRET) {
  throw new Error(
    'NEXTAUTH_SECRET environment variable is not defined. This is a critical security requirement.'
  )
}

const providers = []

/**
 * SpotifyProvider Import Fix for ESM/CJS Interop:
 * NextAuth v4 exports providers as CJS modules. When running in an ESM environment (like this project),
 * the import `import SpotifyProvider from 'next-auth/providers/spotify'` might resolve to a Module Namespace Object
 * instead of the default export.
 *
 * We check for `.default` to handle both CJS (direct function) and ESM (module with default export) contexts.
 * The `@ts-expect-error` is necessary because TypeScript's static analysis might not perfectly align with
 * the runtime behavior of this specific interop scenario across different build tools (Next.js, Jest, ts-node).
 */
// @ts-expect-error: Handle CJS/ESM interop for SpotifyProvider
const SpotifyProvider = SpotifyProviderModule.default || SpotifyProviderModule

if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
  providers.push(
    SpotifyProvider({
      clientId: env.SPOTIFY_CLIENT_ID,
      clientSecret: env.SPOTIFY_CLIENT_SECRET,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    })
  )
}

export const authOptions: AuthOptions = {
  providers,
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
    async signIn() {
      return true
    },
    async jwt({ token, account }: { token: JWT; account: Account | null }) {
      // 1. Initial sign-in: Augment the token with provider-specific details.
      if (account) {
        // Ensure you preserve the 'sub' or providerAccountId for future syncs
        const initialToken = {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires:
            Date.now() + (Number(account.expires_in) || 3600) * 1000,
          refreshToken: account.refresh_token,
          providerAccountId: account.providerAccountId, // Store ID for reference
          scope: account.scope,
        }

        syncTokenWithBackend(initialToken).catch((err) =>
          logger.error({ err }, 'Background token sync failed on initial login')
        )

        return initialToken
      }

      // 2. Token still valid: Return the token without modification.
      if (Date.now() < (token.accessTokenExpires as number) - 60000) {
        return token
      }

      // 3. Token expired: Refresh the token and sync with the backend.
      logger.info('[AUTH] Access token expired, refreshing...')

      const refreshedToken = await refreshAccessToken(token)

      // CRITICAL FIX: Sync the NEW refreshed token to the backend in the background.
      if (!refreshedToken.error) {
        syncTokenWithBackend(refreshedToken).catch((err) =>
          logger.error({ err }, 'Background token sync failed')
        )
      }

      return refreshedToken
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      logger.debug({ tokenKeys: Object.keys(token) }, 'Creating session')
      if (typeof token.accessToken === 'string') {
        session.accessToken = token.accessToken
      }
      if (typeof token.error === 'string') {
        session.error = token.error
      }
      if (typeof token.scope === 'string') {
        session.scope = token.scope
      }
      logger.debug({ hasAccessToken: !!session.accessToken }, 'Session created')
      return session
    },
  },
  // Ensure the token can be accessed securely
  secret: NEXTAUTH_SECRET,
}

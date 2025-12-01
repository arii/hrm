// File: lib/api/spotify.ts
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { Session } from 'next-auth'
import { UnauthorizedError } from '@/lib/errors'

/**
 * Creates a Spotify API client instance from a validated NextAuth.js session.
 * @param {Session} session - The user's session object.
 * @returns {SpotifyApi} An initialized Spotify API client.
 */
export function getSpotifyClient(session: Session): SpotifyApi {
  if (!session.accessToken) {
    throw new UnauthorizedError('Spotify access token not found in session')
  }
  return SpotifyApi.withAccessToken(
    process.env.SPOTIFY_CLIENT_ID as string,
    { access_token: session.accessToken }
  )
}

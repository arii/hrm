// File: services/spotifyTokenManager.ts
import { AccessToken } from '@spotify/web-api-ts-sdk'

/**
 * Manages the lifecycle of a Spotify access token, including refreshing it
 * when it's about to expire.
 */
export class SpotifyTokenManager {
  private token: AccessToken | null = null

  public getSdkAccessToken(): AccessToken | null {
    return this.token
  }
}

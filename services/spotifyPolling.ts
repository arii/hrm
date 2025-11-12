// File: services/spotifyPolling.ts (Spotify Polling Service - Multi-User)
/**
 * Spotify Polling Service: Handles per-user state and orchestrates calls to the Spotify API.
 * Bridges the REST API data to the real-time WebSocket broadcast.
 */

import { SpotifyData, UnifiedStateMessage } from '../types/websocket.js'
import { UserTokenManager } from './userTokenManager.js'
import { getCurrentlyPlaying } from './spotify/spotifyApi.js'
import { handleCommand } from './spotify/spotifyCommandHandler.js'

// This type is duplicated from spotifyCommandHandler.ts for use in this file.
// In a larger refactor, this might move to a shared types file.
type SpotifyCommand =
  | 'PLAY'
  | 'PAUSE'
  | 'NEXT'
  | 'PREVIOUS'
  | 'TRANSFER_PLAYBACK'
  | 'SET_VOLUME'

export class SpotifyPolling {
  private tokenManager: UserTokenManager
  public broadcastState: (
    data: Partial<UnifiedStateMessage>,
    userId?: string
  ) => void

  // Per-user state management to avoid unnecessary broadcasts
  private userStates: Map<
    string,
    {
      lastTrackId: string | null
      lastPlaybackState: boolean | null
      state: SpotifyData
    }
  > = new Map()

  constructor(
    broadcastState: (
      data: Partial<UnifiedStateMessage>,
      userId?: string
    ) => void
  ) {
    this.broadcastState = broadcastState
    console.log('Spotify Polling Service Initialized (Multi-User Mode).')

    // Initialize the token manager, which handles all auth logic.
    this.tokenManager = new UserTokenManager(
      process.env.SPOTIFY_CLIENT_ID || '',
      process.env.SPOTIFY_CLIENT_SECRET || ''
    )
  }

  /**
   * Retrieves or initializes the state for a given user.
   */
  private getUserState(userId: string) {
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        lastTrackId: null,
        lastPlaybackState: null,
        state: {
          trackName: 'Connecting...',
          artist: '',
          isPlaying: false,
        },
      })
    }
    return this.userStates.get(userId)!
  }

  /**
   * Fetches the currently playing track for a specific user and broadcasts the state
   * if it has changed. This is the core polling function.
   */
  public async pollUser(userId: string, encryptedRefreshToken: string) {
    const accessToken = await this.tokenManager.getValidAccessTokenForUser(
      userId,
      encryptedRefreshToken
    )

    if (!accessToken) {
      this.broadcastState(
        {
          spotifyData: {
            trackName: 'Login Required',
            artist: 'Please log in via the client.',
            isPlaying: false,
          },
        },
        userId
      )
      return
    }

    try {
      const data = await getCurrentlyPlaying(accessToken)
      const userState = this.getUserState(userId)

      // Case: Nothing is playing
      if (!data) {
        if (userState.lastPlaybackState !== false) {
          userState.lastPlaybackState = false
          userState.state = {
            trackName: 'Nothing is currently playing.',
            artist: '',
            isPlaying: false,
          }
          this.broadcastState({ spotifyData: userState.state }, userId)
        }
        return
      }

      // Case: Track or playback state has changed, broadcast the new state
      if (
        data.item?.id !== userState.lastTrackId ||
        data.is_playing !== userState.lastPlaybackState
      ) {
        userState.lastTrackId = data.item?.id
        userState.lastPlaybackState = data.is_playing
        userState.state = {
          trackName: data.item?.name || 'Unknown Track',
          artist: data.item?.artists?.[0]?.name || 'Unknown Artist',
          isPlaying: data.is_playing,
        }
        this.broadcastState({ spotifyData: userState.state }, userId)
      }
    } catch (error) {
      console.error(
        `Error fetching currently playing track for user ${userId}:`,
        error
      )
      // Potentially handle token errors here by broadcasting a "re-login needed" state
    }
  }

  /**
   * Handles incoming commands from the WebSocket, delegates to the command handler,
   * and triggers an immediate poll to reflect the state change.
   */
  public async handleCommand(
    userId: string,
    encryptedRefreshToken: string,
    command: SpotifyCommand,
    deviceId?: string,
    volume?: number
  ) {
    await handleCommand(
      this.tokenManager,
      userId,
      encryptedRefreshToken,
      command,
      deviceId,
      volume
    )

    // Immediately poll after a command to update the dashboard faster
    setTimeout(() => this.pollUser(userId, encryptedRefreshToken), 500)
  }
}

export default SpotifyPolling

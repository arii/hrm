import {
  AccessToken,
  SpotifyApi,
  Device,
  Track,
  Episode,
} from '@spotify/web-api-ts-sdk'
import { ServerMessage } from '../../types/websocket'
import { SpotifyDevice, SpotifyPlaybackState } from '../../types/core'
import {
  SpotifyTokenManager,
  SpotifyTokenPayload,
} from '../../services/spotifyTokenManager.js'
import logger from '../../utils/logger.js'
import {
  handleSpotifyApiError,
  logSpotifyCommandError,
} from '../../services/spotifyApiErrorHandling.js'
import { SpotifyCommand, SpotifyService } from '../../types/interfaces.js'
import {
  SafeSpotifyApi,
  createSafeSpotifyApi,
} from '../../services/safeSpotifyApi.js'
import { env } from '../../lib/env.js'
import { SpotifyPolling } from '../../services/spotifyPolling'

// This constant is defined at the top of the file to ensure it's easily accessible
// and to avoid magic strings in the code.
const UNEXPECTED_END_OF_JSON_INPUT_ERROR_MESSAGE =
  'Unexpected end of JSON input'

// We use SDK types now, but keep internal state types as needed.
// Removed manual SpotifyCurrentlyPlayingResponse, SpotifyDevice, etc.

export interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}
describe('SpotifyPolling', () => {
  let broadcastUpdate: jest.Mock
  let spotifyPolling: SpotifyPolling

  beforeEach(async () => {
    broadcastUpdate = jest.fn()
    spotifyPolling = await SpotifyPolling.create(broadcastUpdate)
  })

  afterEach(() => {
    spotifyPolling.cleanup()
  })

  it('should be created', () => {
    expect(spotifyPolling).toBeTruthy()
  })
})

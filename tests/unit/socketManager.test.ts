/**
 * Unit tests for WebSocket manager
 * Tests state broadcasting and command routing through services
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage, UnifiedStateMessage } from '../../types/websocket'
import fs from 'fs'

// Mock the 'fs' module to prevent state persistence during tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

const mockedFs = fs as jest.Mocked<typeof fs>

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: Partial<ServerMessage>[]
  let broadcastFn: (data: Partial<UnifiedStateMessage>) => void
  let mockSdk: {
    player: {
      getCurrentlyPlayingTrack: jest.Mock<Promise<null>>
      startResumePlayback: jest.Mock<Promise<void>>
      pausePlayback: jest.Mock<Promise<void>>
      skipToNext: jest.Mock<Promise<void>>
      skipToPrevious: jest.Mock<Promise<void>>
      transferPlayback: jest.Mock<Promise<void>>
      setPlaybackVolume: jest.Mock<Promise<void>>
      getAvailableDevices: jest.Mock<Promise<{ devices: unknown[] }>>
    }
  }

  beforeEach(async () => {
    // Ensure a clean slate for each test by resetting mocks
    jest.clearAllMocks()
    mockedFs.existsSync.mockReturnValue(false) // Simulate no pre-existing state file

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'))
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (message: Partial<UnifiedStateMessage>) => {
      if (message.timerData) {
        broadcastedMessages.push({
          type: 'TIMER_UPDATE',
          payload: message.timerData,
        } as ServerMessage)
      }
    }

    // Mock TokenManager to return a valid token
    ;(SpotifyTokenManager as unknown as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest
        .fn()
        .mockResolvedValue('test_access_token') as jest.Mock,
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }) as jest.Mock,
      stopPolling: jest.fn() as jest.Mock,
      cleanup: jest.fn() as jest.Mock,
    }))

    // Mock SDK instance
    mockSdk = {
      player: {
        getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
        startResumePlayback: jest.fn().mockResolvedValue(undefined),
        pausePlayback: jest.fn().mockResolvedValue(undefined),
        skipToNext: jest.fn().mockResolvedValue(undefined),
        skipToPrevious: jest.fn().mockResolvedValue(undefined),
        transferPlayback: jest.fn().mockResolvedValue(undefined),
        setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
        getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
      },
    }

    // Mock SpotifyApi.withAccessToken to return our mock SDK
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

    tabataTimer = new TabataTimer(broadcastFn)
    // Initialize service (which will trigger async token load)
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    if (spotifyService) {
      spotifyService.stopPolling()
      spotifyService.cleanup()
    }
  })

  it('should broadcast timer state during phase transitions', () => {
    broadcastedMessages = []
    tabataTimer.start()
    jest.advanceTimersByTime(5000) // Complete PREPARE phase

    // Manually trigger a tick to ensure the last state is broadcasted
    tabataTimer['tick']()

    const phases = broadcastedMessages
      .filter((m) => m.type === 'TIMER_UPDATE')
      .map((m) => m.payload?.currentPhase)
    expect(phases).toEqual(expect.arrayContaining(['PREPARE', 'WORK']))
  })

  it('should handle complete workout workflow', () => {
    broadcastedMessages = []
    tabataTimer.start({ workDuration: 30, restDuration: 10, totalCycles: 1 })
    jest.advanceTimersByTime(5000) // PREPARE
    jest.advanceTimersByTime(30000) // WORK
    jest.advanceTimersByTime(10000) // REST

    // Manually trigger a tick to ensure the last state is broadcasted
    tabataTimer['tick']()

    const phases = broadcastedMessages
      .filter((m) => m.type === 'TIMER_UPDATE')
      .map((m) => m.payload?.currentPhase)
    expect(phases).toContain('PREPARE')
    expect(phases).toContain('WORK')
    expect(phases).toContain('REST')
  })
})

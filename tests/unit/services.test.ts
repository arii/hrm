/**
 * Unit tests for services
 * Tests state broadcasting and command routing through services
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ServerMessage, UnifiedStateMessage } from '../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
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

describe('Services Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (message: Partial<UnifiedStateMessage>) => void
  let mockSdk: {
    player: {
      getCurrentlyPlayingTrack: jest.Mock
      startResumePlayback: jest.Mock
      pausePlayback: jest.Mock
      skipToNext: jest.Mock
      skipToPrevious: jest.Mock
      transferPlayback: jest.Mock
      setPlaybackVolume: jest.Mock
      getAvailableDevices: jest.Mock
    }
  }

  beforeEach(async () => {
    // Ensure a clean slate for each test by resetting mocks
    jest.clearAllMocks()
    mockedFs.existsSync.mockReturnValue(false) // Simulate no pre-existing state file

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z'))
    broadcastedMessages = []

    // Create broadcast function that collects messages, simulating how server.ts would wrap the state
    broadcastFn = (message: Partial<UnifiedStateMessage>) => {
      if (message.timerData) {
        broadcastedMessages.push({
          type: 'TIMER_UPDATE',
          payload: message.timerData,
        } as ServerMessage)
      }
    }

    // Mock TokenManager to return a valid token
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest.fn().mockResolvedValue('test_access_token'),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }),
      stopPolling: jest.fn(),
      cleanup: jest.fn(),
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
    spotifyService.stopPolling()
    spotifyService.cleanup()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      broadcastedMessages = []
      tabataTimer.startStopwatch()

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('STOPWATCH')
      } else {
        fail('No TIMER_UPDATE message was broadcasted')
      }
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []
      tabataTimer.start()

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
        expect(lastMessage.payload.currentPhase).toBe('PREPARE')
      } else {
        fail('No TIMER_UPDATE message was broadcasted')
      }
    })
  })

  describe('State-Dependent UI Updates', () => {
    it('should indicate timer as inactive when in IDLE phase', () => {
      const state = tabataTimer.getDerivedState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should indicate timer as active after START command', () => {
      tabataTimer.start()
      const state = tabataTimer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      broadcastedMessages = []
      tabataTimer.start({ workDuration: 30, restDuration: 10, totalCycles: 1 })
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST

      // Manually trigger a tick to ensure the last state is broadcasted
      tabataTimer['tick']()

      const phases = broadcastedMessages
        .map((m) => (m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null))
        .filter(Boolean)

      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
      expect(phases).toContain('REST')
    })
  })
})

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
import { UnifiedStateMessage } from '../../types/websocket'

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
  let broadcastedMessages: Partial<UnifiedStateMessage>[]
  let broadcastFn: (data: Partial<UnifiedStateMessage>) => void
  let mockSdk: {
    player: {
      getCurrentlyPlayingTrack: jest.Mock<() => Promise<null>>
      startResumePlayback: jest.Mock<(deviceId?: string) => Promise<void>>
      pausePlayback: jest.Mock<(deviceId?: string) => Promise<void>>
      skipToNext: jest.Mock<(deviceId?: string) => Promise<void>>
      skipToPrevious: jest.Mock<(deviceId?: string) => Promise<void>>
      transferPlayback: jest.Mock<(deviceIds: string[]) => Promise<void>>
      setPlaybackVolume: jest.Mock<(volume: number) => Promise<void>>
      getAvailableDevices: jest.Mock<() => Promise<{ devices: never[] }>>
    }
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (data: Partial<UnifiedStateMessage>) => {
      broadcastedMessages.push(data)
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

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      broadcastedMessages = []
      tabataTimer.setMode('STOPWATCH')
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.mode).toBe('STOPWATCH')
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastedMessages = []
      tabataTimer.setMode('TABATA')
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.mode).toBe('TABATA')
    })

    it('should broadcast timer state when work duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.workDuration).toBe(45)
    })

    it('should broadcast timer state when rest duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.restDuration).toBe(12)
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.isRunning).toBe(true)
      expect(lastMessage?.timerData?.currentPhase).toBe('PREPARE')
    })

    it('should broadcast timer state during phase transitions', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      const phases = broadcastedMessages.map((m) => m.timerData?.currentPhase)
      expect(phases).toEqual(expect.arrayContaining(['PREPARE', 'WORK']))
    })

    it('should broadcast timer state every second while running', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      // Only check the last broadcast for isRunning
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.isRunning).toBe(true)
    })
  })

  describe('State-Dependent UI Updates', () => {
    it('should indicate timer as inactive when in IDLE phase', () => {
      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should indicate timer as active after START command', () => {
      tabataTimer.handleCommand('START')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })

    it('should indicate timer as inactive after PAUSE command', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)

      tabataTimer.handleCommand('PAUSE')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
    })

    it('should indicate timer as inactive after STOP command', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)

      tabataTimer.handleCommand('STOP')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })
  })

  describe('Volume Changes', () => {
    it('should handle beep volume through timer state', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000)

      const broadcasts = broadcastedMessages.filter(
        (m) => m.timerData?.soundToPlay
      )

      expect(broadcasts.length).toBeGreaterThan(0)
      expect(broadcasts[0].timerData?.soundEventId).toBeGreaterThan(0)
    })

    it('should support Spotify volume commands', async () => {
      // The service now manages SDK internally, no need to set accessToken manually if mocks are set up

      spotifyService.handleCommand('SET_VOLUME', undefined, 75)

      // Verify mock called
      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalled()
    })
  })

  describe('Service Integration', () => {
    it('should maintain separate timer and Spotify state', async () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')

      const timerState = tabataTimer.getState()
      const spotifyState = spotifyService.getState()

      expect(timerState.mode).toBe('STOPWATCH')
      expect(timerState.isRunning).toBe(true)
      expect(spotifyState).toHaveProperty('trackName')
      expect(spotifyState).toHaveProperty('isPlaying')
    })

    it('should allow timer and Spotify commands independently', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalled()
    })

    it('should broadcast updates from both services', () => {
      broadcastedMessages = []

      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = broadcastedMessages.find(
        (m) => m.timerData?.mode === 'STOPWATCH'
      )

      expect(timerBroadcast).toBeDefined()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      broadcastedMessages = []

      // Configure timer
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })

      // Start timer
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST

      const phases = broadcastedMessages.map((m) => m.timerData?.currentPhase)

      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
      expect(phases).toContain('REST')
    })

    it('should maintain state consistency across multiple operations', () => {
      // Multiple operations
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('PAUSE')
      tabataTimer.setMode('TABATA')

      const state = tabataTimer.getState()

      // Should end in consistent state
      expect(state.mode).toBe('TABATA')
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should support timer start with Spotify skip command', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })

    it('should support timer stop with Spotify pause command', async () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('STOP')
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(false)
      expect(mockSdk.player.pausePlayback).toHaveBeenCalled()
    })
  })
})

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
import { ServerMessage } from '../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import { Account } from '@prisma/client'

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
  let broadcastFn: (message: ServerMessage) => void
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
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (message: ServerMessage) => {
      broadcastedMessages.push(message)
    }

    // NEW: Mock the static method directly to return a mock Account object
    const mockAccount: Partial<Account> = {
      access_token: 'test_access_token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test_refresh_token',
      token_type: 'Bearer',
    }
    ;(SpotifyTokenManager.getSystemAccount as jest.Mock).mockResolvedValue(
      mockAccount
    )

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

      tabataTimer.setMode('STOPWATCH')

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('STOPWATCH')
      } else {
        expect(lastMessage?.type).toBe('TIMER_UPDATE')
      }
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastedMessages = []

      tabataTimer.setMode('TABATA')

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('TABATA')
      } else {
        expect(lastMessage?.type).toBe('TIMER_UPDATE')
      }
    })

    it('should broadcast timer state when work duration changes', () => {
      broadcastedMessages = []

      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.workDuration).toBe(45)
      } else {
        expect(lastMessage?.type).toBe('TIMER_UPDATE')
      }
    })

    it('should broadcast timer state when rest duration changes', () => {
      broadcastedMessages = []

      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.restDuration).toBe(12)
      } else {
        expect(lastMessage?.type).toBe('TIMER_UPDATE')
      }
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []

      tabataTimer.handleCommand('START')

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
        expect(lastMessage.payload.currentPhase).toBe('PREPARE')
      } else {
        expect(lastMessage?.type).toBe('TIMER_UPDATE')
      }
    })

    it('should broadcast timer state during phase transitions', () => {
      broadcastedMessages = []

      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase

      const phases = broadcastedMessages
        .map((m) => (m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null))
        .filter(Boolean)

      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
    })

    it('should broadcast timer state every second while running', () => {
      broadcastedMessages = []

      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)

      // Should have at least 3 broadcasts (one per second)
      expect(broadcastedMessages.length).toBeGreaterThanOrEqual(3)
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
        (m) => m.type === 'TIMER_UPDATE' && m.payload.soundToPlay
      )

      expect(broadcasts.length).toBeGreaterThan(0)
      const firstBroadcast = broadcasts[0]
      if (firstBroadcast?.type === 'TIMER_UPDATE') {
        expect(firstBroadcast.payload.soundEventId).toBeGreaterThan(0)
      } else {
        expect(firstBroadcast?.type).toBe('TIMER_UPDATE')
      }
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
      // Timer command
      tabataTimer.handleCommand('START')

      // Spotify command
      await spotifyService.handleCommand('PLAY', 'test_device_id')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalled()
    })

    it('should broadcast updates from both services', () => {
      broadcastedMessages = []

      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = broadcastedMessages.find(
        (m) => m.type === 'TIMER_UPDATE' && m.payload.mode === 'STOPWATCH'
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

      const phases = broadcastedMessages
        .map((m) => (m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null))
        .filter(Boolean)

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
      // Simulate timer start triggering Spotify next
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('NEXT', 'test_device_id')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })

    it('should support timer stop with Spotify pause command', async () => {
      // Start then stop timer with Spotify pause
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

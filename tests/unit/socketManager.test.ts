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
  let onStateChange: jest.Mock<() => void>
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
    jest.useFakeTimers()
    jest.clearAllMocks()

    onStateChange = jest.fn()

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

    tabataTimer = new TabataTimer(onStateChange)
    // Initialize service (which will trigger async token load)
    spotifyService = await SpotifyPolling.create(onStateChange)
  })

  afterEach(() => {
    jest.useRealTimers()
    if (spotifyService) {
      spotifyService.stopPolling()
      spotifyService.cleanup()
    }
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should trigger state change when mode changes to STOPWATCH', () => {
      onStateChange.mockClear()
      tabataTimer.setMode('STOPWATCH')
      expect(onStateChange).toHaveBeenCalled()
      expect(tabataTimer.getState().mode).toBe('STOPWATCH')
    })

    it('should trigger state change when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      onStateChange.mockClear()
      tabataTimer.setMode('TABATA')
      expect(onStateChange).toHaveBeenCalled()
      expect(tabataTimer.getState().mode).toBe('TABATA')
    })

    it('should trigger state change when work duration changes', () => {
      onStateChange.mockClear()
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      expect(onStateChange).toHaveBeenCalled()
      expect(tabataTimer.getState().workDuration).toBe(45)
    })

    it('should trigger state change when rest duration changes', () => {
      onStateChange.mockClear()
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      expect(onStateChange).toHaveBeenCalled()
      expect(tabataTimer.getState().restDuration).toBe(12)
    })

    it('should trigger state change when timer starts', () => {
      onStateChange.mockClear()
      tabataTimer.handleCommand('START')
      expect(onStateChange).toHaveBeenCalled()
      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })

    it('should trigger state change during phase transitions', () => {
      onStateChange.mockClear()
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      expect(onStateChange).toHaveBeenCalledTimes(10) // 1 start + 5 ticks + 4 sound cues
      const state = tabataTimer.getState()
      expect(state.currentPhase).toBe('WORK')
    })

    it('should trigger state change every second while running', () => {
      onStateChange.mockClear()
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      expect(onStateChange).toHaveBeenCalledTimes(6) // 1 start + 3 ticks + 2 sound cues
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
      onStateChange.mockClear()
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000)
      expect(onStateChange).toHaveBeenCalled()
      const state = tabataTimer.getState()
      expect(state.soundEventId).toBeGreaterThan(0)
    })

    it('should support Spotify volume commands', async () => {
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
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

    it('should trigger state change from both services', async () => {
      onStateChange.mockClear()
      tabataTimer.setMode('STOPWATCH')
      expect(onStateChange).toHaveBeenCalled()

      onStateChange.mockClear()
      await spotifyService.forcePollAndBroadcast()
      expect(onStateChange).toHaveBeenCalled()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      onStateChange.mockClear()
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      expect(tabataTimer.getState().currentPhase).toBe('WORK')
      jest.advanceTimersByTime(30000) // WORK
      expect(tabataTimer.getState().currentPhase).toBe('REST')
      jest.advanceTimersByTime(10000) // REST
      expect(tabataTimer.getState().currentPhase).toBe('WORK')
      expect(onStateChange).toHaveBeenCalled()
    })

    it('should maintain state consistency across multiple operations', () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('PAUSE')
      tabataTimer.setMode('TABATA')
      const state = tabataTimer.getState()
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

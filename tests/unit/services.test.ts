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
import { TimerData } from '../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'

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
  let broadcastFn: jest.Mock
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
    broadcastFn = jest.fn()

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
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.stopPolling()
    spotifyService.cleanup()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      tabataTimer.setMode('STOPWATCH')
      const lastMessage: TimerData = broadcastFn.mock.lastCall[0]
      expect(lastMessage.mode).toBe('STOPWATCH')
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastFn.mockClear()
      tabataTimer.setMode('TABATA')
      const lastMessage: TimerData = broadcastFn.mock.lastCall[0]
      expect(lastMessage.mode).toBe('TABATA')
    })

    it('should broadcast timer state when work duration changes', () => {
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      const lastMessage: TimerData = broadcastFn.mock.lastCall[0]
      expect(lastMessage.workDuration).toBe(45)
    })

    it('should broadcast timer state when rest duration changes', () => {
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      const lastMessage: TimerData = broadcastFn.mock.lastCall[0]
      expect(lastMessage.restDuration).toBe(12)
    })

    it('should broadcast timer state when timer starts', () => {
      tabataTimer.handleCommand('START')
      const lastMessage: TimerData = broadcastFn.mock.lastCall[0]
      expect(lastMessage.isRunning).toBe(true)
      expect(lastMessage.currentPhase).toBe('PREPARE')
    })

    it('should broadcast timer state during phase transitions', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      const phases = broadcastFn.mock.calls.map((call) => call[0].currentPhase)
      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
    })

    it('should broadcast timer state every second while running', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      expect(broadcastFn.mock.calls.length).toBeGreaterThanOrEqual(3)
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
      const broadcasts = broadcastFn.mock.calls
        .map((call) => call[0])
        .filter((m) => m.soundToPlay)
      expect(broadcasts.length).toBeGreaterThan(0)
      expect(broadcasts[0].soundEventId).toBeGreaterThan(0)
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

    it('should broadcast updates from both services', () => {
      broadcastFn.mockClear()
      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = broadcastFn.mock.calls.find(
        (call) => call[0].mode === 'STOPWATCH'
      )
      expect(timerBroadcast).toBeDefined()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST
      const phases = broadcastFn.mock.calls.map((call) => call[0].currentPhase)
      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
      expect(phases).toContain('REST')
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

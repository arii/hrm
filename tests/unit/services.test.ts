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
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import * as socketManager from '../../utils/socketManager'

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

jest.mock('../../utils/socketManager', () => ({
  broadcastHrmUpdate: jest.fn(),
  broadcastTimerUpdate: jest.fn(),
  broadcastSpotifyUpdate: jest.fn(),
}))

describe('Services Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
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

    // Mock TokenManager to return a valid token
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest
        .fn()
        .mockResolvedValue('test_access_token' as any),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      } as any),
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

    tabataTimer = new TabataTimer()
    spotifyService = await SpotifyPolling.create()
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.stopPolling()
    spotifyService.cleanup()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      tabataTimer.setMode('STOPWATCH')
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.setMode('TABATA')
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })

    it('should broadcast timer state when work duration changes', () => {
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })

    it('should broadcast timer state when rest duration changes', () => {
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })

    it('should broadcast timer state when timer starts', () => {
      tabataTimer.handleCommand('START')
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })

    it('should broadcast timer state during phase transitions', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 'WORK' })
      )
    })

    it('should broadcast timer state every second while running', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalledTimes(4) // Start + 3 ticks
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
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ soundToPlay: 'WORK' })
      )
    })

    it('should support Spotify volume commands', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75)
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
      tabataTimer.setMode('STOPWATCH')
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalled()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 'WORK' })
      )
      expect(socketManager.broadcastTimerUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ currentPhase: 'REST' })
      )
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

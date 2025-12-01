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
import { spotifyApi } from '../../services/spotifyApi'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'

// Mock the entire spotifyApi service
jest.mock('../../services/spotifyApi', () => ({
  spotifyApi: {
    getSdk: jest.fn(),
    isReady: jest.fn(),
    signalTokenRefresh: jest.fn(),
  },
}))

const mockedSpotifyApi = spotifyApi as jest.Mocked<typeof spotifyApi>

describe('Services Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (message: ServerMessage) => void
  let mockPlayer: { [key: string]: jest.Mock }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    broadcastFn = (message: ServerMessage) => {
      broadcastedMessages.push(message)
    }

    mockPlayer = {
      getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
      startResumePlayback: jest.fn().mockResolvedValue(undefined),
      pausePlayback: jest.fn().mockResolvedValue(undefined),
      skipToNext: jest.fn().mockResolvedValue(undefined),
      skipToPrevious: jest.fn().mockResolvedValue(undefined),
      transferPlayback: jest.fn().mockResolvedValue(undefined),
      setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
      getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
    }

    mockedSpotifyApi.getSdk.mockResolvedValue({
      player: mockPlayer,
    } as unknown as SpotifyApi)
    mockedSpotifyApi.isReady.mockReturnValue(true)

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
      await spotifyService.handleCommand('SET_VOLUME', undefined, 75)
      expect(mockPlayer.setPlaybackVolume).toHaveBeenCalled()
    })
  })

  describe('Service Integration', () => {
    it('should maintain separate timer and Spotify state', () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')

      const timerState = tabataTimer.getState()
      const spotifyState = spotifyService.getState()

      expect(timerState.mode).toBe('STOPWATCH')
      expect(timerState.isRunning).toBe(true)
      expect(spotifyState).toHaveProperty('trackName')
    })

    it('should allow timer and Spotify commands independently', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('PLAY', 'test_device_id')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockPlayer.startResumePlayback).toHaveBeenCalled()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should support timer start with Spotify skip command', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('NEXT', 'test_device_id')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockPlayer.skipToNext).toHaveBeenCalled()
    })

    it('should support timer stop with Spotify pause command', async () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('STOP')
      await spotifyService.handleCommand('PAUSE', 'test_device_id')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(false)
      expect(mockPlayer.pausePlayback).toHaveBeenCalled()
    })
  })
})

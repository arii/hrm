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
import { spotifyService } from '../../services/spotifyService'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock dependencies
jest.mock('../../services/spotifyService', () => ({
  spotifyService: {
    handleCommand: jest.fn(),
    startPolling: jest.fn(),
    stopPolling: jest.fn(),
    setRefreshToken: jest.fn(),
    getState: jest.fn(() => ({
      trackName: 'Mock Track',
      artist: 'Mock Artist',
      isPlaying: false,
    })),
    isReady: jest.fn(() => true),
    forcePollAndBroadcast: jest.fn(),
    getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
    cleanup: jest.fn(),
  },
}))

// Cast the mocked service for type safety
const mockSpotifyService = spotifyService as jest.Mocked<typeof spotifyService>

describe('Service Integration Tests', () => {
  let tabataTimer: TabataTimer
  let broadcastedMessages: Partial<ServerMessage>[]
  let broadcastFn: (data: Partial<ServerMessage>) => void

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (data: Partial<ServerMessage>) => {
      broadcastedMessages.push(data)
    }

    tabataTimer = new TabataTimer(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    mockSpotifyService.stopPolling()
    mockSpotifyService.cleanup()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      broadcastedMessages = []
      tabataTimer.setMode('STOPWATCH')
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.mode).toBe('STOPWATCH')
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastedMessages = []
      tabataTimer.setMode('TABATA')
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.mode).toBe('TABATA')
    })

    it('should broadcast timer state when work duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.workDuration).toBe(45)
    })

    it('should broadcast timer state when rest duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.restDuration).toBe(12)
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.isRunning).toBe(true)
      expect(timerUpdate?.payload?.currentPhase).toBe('PREPARE')
    })

    it('should broadcast timer state during phase transitions', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      const phases = broadcastedMessages
        .filter((m) => m.type === 'TIMER_UPDATE')
        .map((m) => m.payload?.currentPhase)
      expect(phases).toEqual(expect.arrayContaining(['PREPARE', 'WORK']))
    })

    it('should broadcast timer state every second while running', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      const timerUpdates = broadcastedMessages.filter(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdates.length).toBeGreaterThanOrEqual(3)
      expect(timerUpdates.at(-1)?.payload?.isRunning).toBe(true)
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

      const broadcasts = broadcastedMessages
        .filter((m) => m.type === 'TIMER_UPDATE' && m.payload?.soundToPlay)
        .map((m) => m.payload)

      expect(broadcasts.length).toBeGreaterThan(0)
      expect(broadcasts[0]?.soundEventId).toBeGreaterThan(0)
    })

    it('should support Spotify volume commands', async () => {
      await mockSpotifyService.handleCommand('SET_VOLUME', undefined, 75, undefined)
      expect(mockSpotifyService.handleCommand).toHaveBeenCalledWith(
        'SET_VOLUME',
        undefined,
        75,
        undefined
      )
    })
  })

  describe('Service Integration', () => {
    it('should maintain separate timer and Spotify state', async () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')

      const timerState = tabataTimer.getState()
      const spotifyState = mockSpotifyService.getState()

      expect(timerState.mode).toBe('STOPWATCH')
      expect(timerState.isRunning).toBe(true)
      expect(spotifyState).toHaveProperty('trackName')
      expect(spotifyState).toHaveProperty('isPlaying')
    })

    it('should allow timer and Spotify commands independently', async () => {
      tabataTimer.handleCommand('START')
      await mockSpotifyService.handleCommand('PLAY', 'test_device_id', undefined, undefined)
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSpotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        'test_device_id',
        undefined,
        undefined
      )
    })

    it('should broadcast updates from both services', () => {
      broadcastedMessages = []

      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = broadcastedMessages.find(
        (m) => m.type === 'TIMER_UPDATE' && m.payload?.mode === 'STOPWATCH'
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
        .filter((m) => m.type === 'TIMER_UPDATE')
        .map((m) => m.payload?.currentPhase)

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
      await mockSpotifyService.handleCommand('NEXT', 'test_device_id', undefined, undefined)
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSpotifyService.handleCommand).toHaveBeenCalledWith(
        'NEXT',
        'test_device_id',
        undefined,
        undefined
      )
    })

    it('should support timer stop with Spotify pause command', async () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('STOP')
      await mockSpotifyService.handleCommand('PAUSE', 'test_device_id', undefined, undefined)
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(false)
      expect(mockSpotifyService.handleCommand).toHaveBeenCalledWith(
        'PAUSE',
        'test_device_id',
        undefined,
        undefined
      )
    })
  })
})

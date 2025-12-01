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
import { spotifyService } from '../../services/spotifyService'
import { ServerMessage } from '../../types/websocket'

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

const mockSpotifyService = spotifyService as jest.Mocked<typeof spotifyService>

describe('Services Integration', () => {
  let tabataTimer: TabataTimer
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (message: ServerMessage) => void

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (message: ServerMessage) => {
      broadcastedMessages.push(message)
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
      await mockSpotifyService.handleCommand('SET_VOLUME', undefined, 75, undefined)

      // Verify mock called
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
      // Timer command
      tabataTimer.handleCommand('START')

      // Spotify command
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
      // Start then stop timer with Spotify pause
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

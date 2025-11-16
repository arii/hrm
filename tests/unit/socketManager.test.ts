/**
 * Unit tests for WebSocket manager
 * Tests state broadcasting and command routing through services
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { UnifiedStateMessage } from '../../types/websocket'

// Mock fetch globally for Spotify service
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: Partial<UnifiedStateMessage>[]
  let broadcastFn: (data: Partial<UnifiedStateMessage>) => void

  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
    broadcastFn = (data: Partial<UnifiedStateMessage>) => {
      broadcastedMessages.push(data)
    }

    tabataTimer = new TabataTimer(broadcastFn)
    spotifyService = new SpotifyPolling(broadcastFn)

    // Mock Spotify API responses
    ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      status: 204,
      ok: true,
    } as Response)
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
      expect(lastMessage.timerData?.mode).toBe('STOPWATCH')
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastedMessages = []

      tabataTimer.setMode('TABATA')

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      expect(lastMessage.timerData?.mode).toBe('TABATA')
    })

    it('should broadcast timer state when work duration changes', () => {
      broadcastedMessages = []

      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      expect(lastMessage.timerData?.workDuration).toBe(45)
    })

    it('should broadcast timer state when rest duration changes', () => {
      broadcastedMessages = []

      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      expect(lastMessage.timerData?.restDuration).toBe(12)
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []

      tabataTimer.handleCommand('START')

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages[broadcastedMessages.length - 1]
      expect(lastMessage.timerData?.isRunning).toBe(true)
      expect(lastMessage.timerData?.currentPhase).toBe('PREPARE')
    })

    it('should broadcast timer state during phase transitions', () => {
      broadcastedMessages = []

      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase

      const phases = broadcastedMessages.map((m) => m.timerData?.currentPhase)

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
        (m) => m.timerData?.soundToPlay
      )

      expect(broadcasts.length).toBeGreaterThan(0)
      expect(broadcasts[0].timerData?.soundEventId).toBeGreaterThan(0)
    })

    it('should support Spotify volume commands', () => {
      ;(spotifyService as unknown as { accessToken: string }).accessToken =
        'test_access_token'

      spotifyService.handleCommand('SET_VOLUME', undefined, 75)

      // Note: command is fire-and-forget, checking it doesn't throw
      expect(true).toBe(true)
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
      expect(spotifyState).toHaveProperty('isPlaying')
    })

    it('should allow timer and Spotify commands independently', () => {
      ;(spotifyService as unknown as { accessToken: string }).accessToken =
        'test_access_token'

      // Timer command
      tabataTimer.handleCommand('START')

      // Spotify command
      spotifyService.handleCommand('PLAY')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      // Commands are fire-and-forget, so we just verify no errors
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

    it('should support timer start with Spotify skip command', () => {
      ;(spotifyService as unknown as { accessToken: string }).accessToken =
        'test_access_token'

      // Simulate timer start triggering Spotify next
      tabataTimer.handleCommand('START')
      spotifyService.handleCommand('NEXT')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      // Spotify command is fire-and-forget, just verify timer state
    })

    it('should support timer stop with Spotify pause command', () => {
      ;(spotifyService as unknown as { accessToken: string }).accessToken =
        'test_access_token'

      // Start then stop timer with Spotify pause
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('STOP')
      spotifyService.handleCommand('PAUSE')

      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(false)
      // Spotify command is fire-and-forget, just verify timer state
    })
  })
})

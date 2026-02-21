// File: tests/unit/services/tabataTimer.test.ts
/**
 * @file Unit tests for the refactored TabataTimer service.
 */

import { jest } from '@jest/globals'
import TabataTimer from '../../../services/tabataTimer'
import { ConfigurationError } from '../../../types/errors'

// Mock the broadcast function
const broadcastUpdate = jest.fn()

// Use fake timers to control setInterval
jest.useFakeTimers()

describe('TabataTimer (Refactored)', () => {
  let timer: TabataTimer

  beforeEach(() => {
    // Clear any previous mocks and timers
    broadcastUpdate.mockClear()
    jest.clearAllTimers()
<<<<<<< HEAD
    jest.setSystemTime(1000000) // Set a fixed start time
=======

    // Mock performance.now to use Date.now() so it syncs with jest.advanceTimersByTime
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now())

>>>>>>> origin/leader
    timer = new TabataTimer(broadcastUpdate)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  // Test initial state
  it('should initialize with the correct default state', () => {
    const state = timer.getState()
    expect(state.mode).toBe('TABATA')
    expect(state.isRunning).toBe(false)
    expect(state.currentPhase).toBe('IDLE')
    expect(state.timeRemaining).toBe(20) // Default work duration
    expect(state.timeElapsed).toBe(0)
  })

  // Test mode switching
  it('should switch modes correctly', () => {
    timer.setMode('STOPWATCH')
    let state = timer.getState()
    expect(state.mode).toBe('STOPWATCH')
    expect(state.currentPhase).toBe('IDLE')
    expect(state.timeRemaining).toBe(0)

    timer.setMode('TABATA')
    state = timer.getState()
    expect(state.mode).toBe('TABATA')
    expect(state.timeRemaining).toBe(20) // Resets to work duration
  })

  // Test configuration
  it('should update configuration correctly', () => {
    timer.setConfig({ workDuration: 30, restDuration: 15 })
    const state = timer.getState()
    expect(state.workDuration).toBe(30)
    expect(state.restDuration).toBe(15)
    // If idle, timeRemaining should update
    expect(state.timeRemaining).toBe(30)
  })

  it('should throw a ConfigurationError for invalid durations', () => {
    expect(() => {
      timer.setConfig({ workDuration: -10, restDuration: 15 })
    }).toThrow(ConfigurationError)
    expect(() => {
      timer.setConfig({ workDuration: -10, restDuration: 15 })
    }).toThrow(
      'Invalid timer configuration: workDuration must be positive, and restDuration must be non-negative. Received workDuration: -10, restDuration: 15'
    )

    // Additional boundary tests
    expect(() => {
      timer.setConfig({ workDuration: 0, restDuration: 15 })
    }).toThrow(ConfigurationError)
    expect(() => {
      timer.setConfig({ workDuration: 30, restDuration: -1 })
    }).toThrow(ConfigurationError)
  })

  // --- STOPWATCH MODE TESTS ---
  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH')
    })

    it('should go through PREPARE and then start counting up', () => {
      timer.start()

      // Should be in PREPARE phase for 5 seconds
      let state = timer.getState()
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(5)

      // Advance time by 5 seconds to get past PREPARE
      jest.advanceTimersByTime(5000)
      state = timer.getState()
      expect(state.currentPhase).toBe('RUNNING')

      // Advance another 3 seconds
      jest.advanceTimersByTime(3000)
      state = timer.getState()
      expect(state.timeElapsed).toBe(3)
    })

    it('should pause and resume correctly', () => {
      timer.start()
      jest.advanceTimersByTime(8000) // 5s PREPARE + 3s RUNNING

      timer.pause()
      let state = timer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('RUNNING')
      expect(state.timeElapsed).toBe(3)

      // Time should not advance while paused
      jest.advanceTimersByTime(5000)
      expect(timer.getState().timeElapsed).toBe(3)

      timer.start() // Resume
      jest.advanceTimersByTime(4000)
      state = timer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.timeElapsed).toBe(7)
    })

    it('should stop and reset', () => {
      timer.start()
      jest.advanceTimersByTime(10000) // 5s PREPARE + 5s RUNNING

      timer.stop()
      const state = timer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
      expect(state.timeElapsed).toBe(0)
    })
  })

  // --- TABATA MODE TESTS ---
  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer.setMode('TABATA')
      timer.setConfig({ workDuration: 10, restDuration: 5 })
    })

    it('should transition from PREPARE to WORK to REST', () => {
      timer.start()

      // PREPARE (5s)
      expect(timer.getState().currentPhase).toBe('PREPARE')
      jest.advanceTimersByTime(5000)

      // WORK (10s)
      let state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(10)
      jest.advanceTimersByTime(10000)

      // REST (5s)
      state = timer.getState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(5)
      jest.advanceTimersByTime(5000)

      // Back to WORK
      state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(10)
    })

    it('should handle pause and resume', () => {
      timer.start()
      jest.advanceTimersByTime(7000) // 5s PREPARE + 2s WORK

      timer.pause()
      let state = timer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.timeRemaining).toBe(8) // 10 - 2 = 8

      jest.advanceTimersByTime(3000) // Should not advance
      expect(timer.getState().timeRemaining).toBe(8)

      timer.start() // Resume
      jest.advanceTimersByTime(8000) // Finish the WORK phase

      state = timer.getState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(5)
    })
  })

  // --- Sound Tests ---
  it('should queue sounds at appropriate times', () => {
    timer.setConfig({ workDuration: 3, restDuration: 3 })
    timer.start()

    // Countdown sounds
    jest.advanceTimersByTime(2000) // 3s left in PREPARE
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'COUNTDOWN' }),
      })
    )

    jest.advanceTimersByTime(3000) // End of PREPARE
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'WORK' }),
      })
    )

    jest.advanceTimersByTime(3000) // End of WORK
    expect(broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ soundToPlay: 'REST' }),
      })
    )
  })

  // --- Extended State Verification ---
  describe('Extended State Verification', () => {
    it('should increment soundEventId on every sound queue', () => {
      timer.setConfig({ workDuration: 10, restDuration: 10 })
      timer.start()

      // PREPARE -> WORK transition
      jest.advanceTimersByTime(5000)
      let state = timer.getState()
      const id1 = state.soundEventId
      expect(state.soundToPlay).toBe('WORK')
      expect(id1).toBeGreaterThan(0)

      // WORK -> REST transition
      jest.advanceTimersByTime(10000)
      state = timer.getState()
      const id2 = state.soundEventId
      expect(state.soundToPlay).toBe('REST')
      expect(id2).toBeGreaterThan(id1)
    })

    it('should handle setConfig during active run without interrupting current phase', () => {
      timer.setMode('TABATA')
      timer.setConfig({ workDuration: 10, restDuration: 10 })
      timer.start()

      jest.advanceTimersByTime(2000)
      expect(timer.getState().currentPhase).toBe('PREPARE')
      expect(timer.getState().timeRemaining).toBe(3)

      timer.setConfig({ workDuration: 30, restDuration: 30 })
      expect(timer.getState().timeRemaining).toBe(3)

      jest.advanceTimersByTime(3000)
      expect(timer.getState().currentPhase).toBe('WORK')
      expect(timer.getState().timeRemaining).toBe(30)
    })
  })

  // Test dispose method
  it('should clear the interval on dispose', () => {
    timer.start()
    expect(jest.getTimerCount()).toBe(1)
    timer.dispose()
    expect(jest.getTimerCount()).toBe(0)
  })
})

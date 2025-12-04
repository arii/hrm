// File: tests/unit/services/genericTimer.test.ts
/**
 * @file Unit tests for the GenericTimer service.
 * @author Jules
 */

import GenericTimer from '../../../services/genericTimer'
import { GenericTimerState } from '../../../types/genericTimer'

// Use fake timers to control time-based operations like setTimeout
jest.useFakeTimers()

describe('GenericTimer', () => {
  // Test case for constructor validation
  it('should throw an error if created in COUNTDOWN mode without a positive duration', () => {
    expect(
      () => new GenericTimer({ mode: 'COUNTDOWN', durationMs: 0 })
    ).toThrow('Countdown mode requires a positive durationMs.')
    expect(() => new GenericTimer({ mode: 'COUNTDOWN' })).toThrow(
      'Countdown mode requires a positive durationMs.'
    )
  })

  // Test suite for STOPWATCH mode
  describe('Stopwatch Mode', () => {
    let timer: GenericTimer
    let onUpdateSpy: jest.Mock

    beforeEach(() => {
      onUpdateSpy = jest.fn()
      timer = new GenericTimer({ mode: 'STOPWATCH', onUpdate: onUpdateSpy })
    })

    it('should start and tick correctly', () => {
      timer.start()
      expect(timer.getState().phase).toBe('RUNNING')

      // Advance time by 5 seconds
      jest.advanceTimersByTime(5000)
      const state = timer.getState()
      expect(state.elapsedMs).toBeGreaterThanOrEqual(5000)
      expect(state.elapsedMs).toBeLessThan(5100) // Allow for slight inaccuracies
      expect(onUpdateSpy).toHaveBeenCalled()
    })

    it('should pause and resume correctly', () => {
      timer.start()
      jest.advanceTimersByTime(2000) // Run for 2s
      timer.pause()

      let state = timer.getState()
      expect(state.phase).toBe('PAUSED')
      expect(state.elapsedMs).toBeGreaterThanOrEqual(2000)
      expect(state.elapsedMs).toBeLessThan(2100)

      const elapsedAtPause = state.elapsedMs

      // Time shouldn't advance while paused
      jest.advanceTimersByTime(3000)
      expect(timer.getState().elapsedMs).toBe(elapsedAtPause)

      timer.start() // Resume
      expect(timer.getState().phase).toBe('RUNNING')
      jest.advanceTimersByTime(2000) // Run for another 2s
      state = timer.getState()
      expect(state.elapsedMs).toBeGreaterThanOrEqual(elapsedAtPause + 2000)
    })

    it('should stop and reset correctly', () => {
      timer.start()
      jest.advanceTimersByTime(5000)
      timer.stop()

      const state = timer.getState()
      expect(state.phase).toBe('IDLE')
      expect(state.elapsedMs).toBe(0)
      expect(state.startTime).toBeNull()
    })
  })

  // Test suite for COUNTDOWN mode
  describe('Countdown Mode', () => {
    let timer: GenericTimer
    let onUpdateSpy: jest.Mock

    beforeEach(() => {
      onUpdateSpy = jest.fn()
      timer = new GenericTimer({
        mode: 'COUNTDOWN',
        durationMs: 10000, // 10s
        onUpdate: onUpdateSpy,
      })
    })

    it('should start and count down', () => {
      timer.start()
      expect(timer.getState().phase).toBe('RUNNING')

      jest.advanceTimersByTime(3000)
      const state = timer.getState()
      expect(state.remainingMs).toBeLessThanOrEqual(7000)
      expect(state.remainingMs).toBeGreaterThan(6900)
      expect(state.elapsedMs).toBeGreaterThanOrEqual(3000)
    })

    it('should finish when the countdown completes', () => {
      timer.start()
      jest.advanceTimersByTime(10000)

      const state = timer.getState()
      expect(state.phase).toBe('FINISHED')
      expect(state.remainingMs).toBe(0)
      expect(state.elapsedMs).toBe(10000)

      // It should not tick further
      const lastCallCount = onUpdateSpy.mock.calls.length
      jest.advanceTimersByTime(2000)
      expect(onUpdateSpy.mock.calls.length).toBe(lastCallCount)
    })

    it('should pause and resume the countdown correctly', () => {
      timer.start()
      jest.advanceTimersByTime(4000) // 4s elapsed, 6s remaining
      timer.pause()

      const stateAtPause = timer.getState()
      expect(stateAtPause.phase).toBe('PAUSED')
      expect(stateAtPause.remainingMs).toBeLessThanOrEqual(6000)

      // Time shouldn't advance while paused
      jest.advanceTimersByTime(2000)
      expect(timer.getState().remainingMs).toBe(stateAtPause.remainingMs)

      timer.start() // Resume
      jest.advanceTimersByTime(6000) // Finish the timer
      const finalState = timer.getState()
      expect(finalState.phase).toBe('FINISHED')
      expect(finalState.remainingMs).toBe(0)
    })
  })

  // Test suite for the onUpdate callback
  describe('onUpdate Callback', () => {
    it('should be called on state changes and ticks', () => {
      const onUpdateSpy = jest.fn((_state: GenericTimerState) => {
        // You can add assertions here about the state at each update
      })

      const timer = new GenericTimer({
        mode: 'COUNTDOWN',
        durationMs: 3000,
        onUpdate: onUpdateSpy,
      })

      // on start
      timer.start()
      expect(onUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'RUNNING' })
      )

      // on tick
      jest.advanceTimersByTime(1000)
      expect(onUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ remainingMs: expect.any(Number) })
      )

      // on pause
      timer.pause()
      expect(onUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'PAUSED' })
      )

      // on stop
      timer.stop()
      expect(onUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ phase: 'IDLE', elapsedMs: 0 })
      )
    })
  })
})

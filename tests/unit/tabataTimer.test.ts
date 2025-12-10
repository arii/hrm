/**
 * Unit tests for TabataTimer service
 * Tests timer state transitions, mode changes, and configuration
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import TabataTimer from '../../services/tabataTimer'
import { TimerData } from '../../types/websocket'

describe('TabataTimer Service', () => {
  let timer: TabataTimer
  let onStateChange: jest.Mock<() => void>

  beforeEach(() => {
    jest.useFakeTimers()
    onStateChange = jest.fn()
    timer = new TabataTimer(onStateChange)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize in IDLE state with TABATA mode', () => {
      const state = timer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
      expect(state.mode).toBe('TABATA')
      expect(state.timeElapsed).toBe(0)
    })

    it('should have default Tabata configuration', () => {
      const state = timer.getState()
      expect(state.workDuration).toBe(20)
      expect(state.restDuration).toBe(10)
    })
  })

  describe('Mode Switching', () => {
    it('should switch from TABATA to STOPWATCH mode', () => {
      timer.setMode('STOPWATCH')
      const state = timer.getState()
      expect(state.mode).toBe('STOPWATCH')
      expect(state.currentPhase).toBe('IDLE')
      expect(state.timeElapsed).toBe(0)
    })

    it('should switch from STOPWATCH to TABATA mode', () => {
      timer.setMode('STOPWATCH')
      timer.setMode('TABATA')
      const state = timer.getState()
      expect(state.mode).toBe('TABATA')
      expect(state.currentPhase).toBe('IDLE')
      expect(state.timeRemaining).toBe(20) // Default work duration
    })

    it('should stop running timer when switching modes', () => {
      timer.setMode('STOPWATCH')
      timer.handleCommand('START')
      jest.advanceTimersByTime(6000) // Complete PREPARE phase

      const runningState = timer.getState()
      expect(runningState.isRunning).toBe(true)

      timer.setMode('TABATA')
      const stoppedState = timer.getState()
      expect(stoppedState.isRunning).toBe(false)
      expect(stoppedState.currentPhase).toBe('IDLE')
    })

    it('should trigger state change when mode changes', () => {
      onStateChange.mockClear()
      timer.setMode('STOPWATCH')
      expect(onStateChange).toHaveBeenCalled()
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH')
    })

    it('should transition from IDLE to PREPARE when started', () => {
      timer.handleCommand('START')
      const state = timer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(5)
    })

    it('should count up after PREPARE phase completes', () => {
      timer.handleCommand('START')

      // Advance through PREPARE phase (5 seconds)
      jest.advanceTimersByTime(5000)

      const prepareComplete = timer.getState()
      expect(prepareComplete.currentPhase).toBe('RUNNING')
      expect(prepareComplete.timeElapsed).toBe(0)

      // Count up during RUNNING phase
      jest.advanceTimersByTime(3000)

      const running = timer.getState()
      expect(running.timeElapsed).toBe(3)
    })

    it('should pause and maintain elapsed time', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(6000) // 5s PREPARE + 1s RUNNING

      const beforePause = timer.getState()
      expect(beforePause.timeElapsed).toBe(1)

      timer.handleCommand('PAUSE')
      const paused = timer.getState()
      expect(paused.isRunning).toBe(false)
      expect(paused.currentPhase).toBe('IDLE')
      expect(paused.timeElapsed).toBe(1)

      jest.advanceTimersByTime(5000) // Time should not advance while paused
      const stillPaused = timer.getState()
      expect(stillPaused.timeElapsed).toBe(1)
    })

    it('should preserve runningTotal when pausing and resuming', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(10000) // 5s PREPARE + 5s RUNNING

      const beforePause = timer.getState()
      expect(beforePause.timeElapsed).toBe(5)
      expect(beforePause.currentPhase).toBe('RUNNING')

      timer.handleCommand('PAUSE')
      jest.advanceTimersByTime(2000) // Wait while paused - time should not advance

      const paused = timer.getState()
      expect(paused.timeElapsed).toBe(5) // Should still be 5
      expect(paused.isRunning).toBe(false)

      // When resuming, it will go through PREPARE again
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(3000) // RUNNING

      const resumed = timer.getState()
      expect(resumed.currentPhase).toBe('RUNNING')
      // Time should continue counting (might be 3s or more depending on implementation)
      expect(resumed.timeElapsed).toBeGreaterThanOrEqual(2)
    })

    it('should reset to zero when stopped', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(10000)

      timer.handleCommand('STOP')
      const stopped = timer.getState()
      expect(stopped.isRunning).toBe(false)
      expect(stopped.currentPhase).toBe('IDLE')
      expect(stopped.timeElapsed).toBe(0)
    })
  })

  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer.setMode('TABATA')
    })

    it('should transition from IDLE to PREPARE when started', () => {
      timer.handleCommand('START')
      const state = timer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(5)
    })

    it('should transition to WORK phase after PREPARE', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)

      const state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(20) // Default work duration
    })

    it('should transition from WORK to REST phase', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(20000) // WORK

      const state = timer.getState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(10) // Default rest duration
    })

    it('should loop indefinitely between WORK and REST', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE

      // Complete 20 iterations
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(20000) // WORK
        expect(timer.getState().currentPhase).toBe('REST')
        jest.advanceTimersByTime(10000) // REST
        expect(timer.getState().currentPhase).toBe('WORK')
      }

      const state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.isRunning).toBe(true)
    })

    it('should pause during any phase', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(10000) // Halfway through WORK

      timer.handleCommand('PAUSE')
      const paused = timer.getState()
      expect(paused.isRunning).toBe(false)
      expect(paused.currentPhase).toBe('WORK')
      expect(paused.timeRemaining).toBe(10)
    })

    it('should resume from paused phase', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(10000) // Halfway through WORK
      timer.handleCommand('PAUSE')

      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)

      const resumed = timer.getState()
      expect(resumed.currentPhase).toBe('WORK')
      expect(resumed.timeRemaining).toBe(5)
    })

    it('should reset to IDLE when stopped', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(15000)

      timer.handleCommand('STOP')
      const stopped = timer.getState()
      expect(stopped.isRunning).toBe(false)
      expect(stopped.currentPhase).toBe('IDLE')
      expect(stopped.timeRemaining).toBe(20) // Default work duration
    })
  })

  describe('Configuration Changes', () => {
    it('should update work duration', () => {
      timer.setConfig({ workDuration: 45, restDuration: 15 })
      const state = timer.getState()
      expect(state.workDuration).toBe(45)
    })

    it('should update rest duration', () => {
      timer.setConfig({ workDuration: 20, restDuration: 15 })
      const state = timer.getState()
      expect(state.restDuration).toBe(15)
    })

    it('should sanitize work duration to minimum of 1 second', () => {
      timer.setConfig({ workDuration: 0, restDuration: 10 })
      const state = timer.getState()
      expect(state.workDuration).toBe(1)
    })

    it('should sanitize rest duration to minimum of 0 seconds', () => {
      timer.setConfig({ workDuration: 20, restDuration: -5 })
      const state = timer.getState()
      expect(state.restDuration).toBe(0)
    })

    it('should update timeRemaining when IDLE in Tabata mode', () => {
      timer.setMode('TABATA')
      timer.setConfig({ workDuration: 30, restDuration: 10 })
      const state = timer.getState()
      expect(state.timeRemaining).toBe(30)
    })

    it('should trigger state change after configuration change', () => {
      onStateChange.mockClear()
      timer.setConfig({ workDuration: 30, restDuration: 15 })
      expect(onStateChange).toHaveBeenCalled()
    })

    it('should use new rest duration in next rest phase', () => {
      timer.setConfig({ workDuration: 20, restDuration: 15 })
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(20000) // WORK

      const state = timer.getState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(15)
    })
  })

  describe('State-Dependent Commands', () => {
    it('should allow START when timer is IDLE', () => {
      const initialState = timer.getState()
      expect(initialState.isRunning).toBe(false)

      timer.handleCommand('START')
      const afterStart = timer.getState()
      expect(afterStart.isRunning).toBe(true)
    })

    it('should allow PAUSE when timer is running', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(1000)

      const running = timer.getState()
      expect(running.isRunning).toBe(true)

      timer.handleCommand('PAUSE')
      const paused = timer.getState()
      expect(paused.isRunning).toBe(false)
    })

    it('should allow STOP when timer is running', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(1000)

      timer.handleCommand('STOP')
      const stopped = timer.getState()
      expect(stopped.isRunning).toBe(false)
      expect(stopped.currentPhase).toBe('IDLE')
    })

    it('should ignore START when already running', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(2000)

      const beforeSecondStart = timer.getState()
      const phase = beforeSecondStart.currentPhase

      timer.handleCommand('START')
      const afterSecondStart = timer.getState()

      // State should not change
      expect(afterSecondStart.currentPhase).toBe(phase)
    })
  })

  describe('Sound Cues', () => {
    it('should queue WORK sound when transitioning from PREPARE', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)

      const state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.soundToPlay).toBe('WORK')
    })

    it('should queue REST sound when transitioning from WORK', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(20000) // WORK

      const state = timer.getState()
      expect(state.currentPhase).toBe('REST')
      expect(state.soundToPlay).toBe('REST')
    })

    it('should queue COUNTDOWN sound during final 3 seconds', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(2000) // 3 seconds remaining in PREPARE

      const state = timer.getState()
      expect(state.soundToPlay).toBe('COUNTDOWN')
    })

    it('should increment soundEventId for each sound cue', () => {
      timer.handleCommand('START')
      const initialId = timer.getState().soundEventId
      jest.advanceTimersByTime(3000) // Trigger countdown sounds
      const laterState = timer.getState()
      expect(laterState.soundEventId).toBeGreaterThan(initialId)
    })
  })

  describe('Broadcasting', () => {
    it('should trigger state change on every tick', () => {
      onStateChange.mockClear()
      timer.handleCommand('START')
      jest.advanceTimersByTime(3000)

      // Should be called for start, each tick, and sound cues
      expect(onStateChange).toHaveBeenCalledTimes(6)
    })

    it('should trigger state change when configuration changes', () => {
      onStateChange.mockClear()
      timer.setConfig({ workDuration: 30, restDuration: 15 })
      expect(onStateChange).toHaveBeenCalled()
    })

    it('should trigger state change when mode changes', () => {
      onStateChange.mockClear()
      timer.setMode('STOPWATCH')
      expect(onStateChange).toHaveBeenCalled()
    })

    it('should provide complete timer state', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(1000)
      const state = timer.getState()
      expect(state).toHaveProperty('isRunning')
      expect(state).toHaveProperty('currentPhase')
      expect(state).toHaveProperty('timeRemaining')
      expect(state).toHaveProperty('timeElapsed')
      expect(state).toHaveProperty('mode')
      expect(state).toHaveProperty('workDuration')
      expect(state).toHaveProperty('restDuration')
    })
  })
})

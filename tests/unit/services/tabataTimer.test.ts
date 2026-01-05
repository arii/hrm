/**
 * @jest-environment node
 */
import TabataTimer from '@/services/tabataTimer'
import { TimerMode, TimerPhase } from '@/types/core'
import {
  DEFAULT_REST_DURATION,
  DEFAULT_WORK_DURATION,
} from '@/utils/constants'

describe('TabataTimer', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock

  beforeEach(() => {
    broadcastMock = jest.fn()
    // Note: The service might have a default export now
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TimerModule = require('@/services/tabataTimer')
    timer = new TimerModule.default(broadcastMock)
    jest.useFakeTimers()
  })

  afterEach(() => {
    timer.dispose()
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const state = timer.getState()
      expect(state.phase).toBe('IDLE')
      expect(state.mode).toBe('TABATA')
      expect(state.totalRounds).toBe(8)
      expect(state.currentRound).toBe(0) // Starts at 0 before first round
      expect(state.workDuration).toBe(DEFAULT_WORK_DURATION)
      expect(state.restDuration).toBe(DEFAULT_REST_DURATION)
      expect(state.timeRemaining).toBe(DEFAULT_WORK_DURATION)
    })
  })

  describe('Commands', () => {
    it('should transition to PREPARE on START command', () => {
      timer.handleCommand('START')
      expect(timer.getState().phase).toBe('PREPARE')
      expect(broadcastMock).toHaveBeenCalledWith({
        type: 'TIMER_UPDATE',
        payload: expect.objectContaining({ phase: 'PREPARE' }),
      })
    })

    it('should pause the timer on PAUSE command', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(2000) // During PREPARE
      timer.handleCommand('PAUSE')
      expect(timer.getState().isRunning).toBe(false)
    })

    it('should stop and reset the timer on STOP command', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(7000) // PREPARE + 2s of WORK
      timer.handleCommand('STOP')
      const state = timer.getState()
      expect(state.phase).toBe('IDLE')
      expect(state.isRunning).toBe(false)
      expect(state.currentRound).toBe(0)
      expect(state.timeRemaining).toBe(DEFAULT_WORK_DURATION)
    })
  })

  describe('State Transitions (TABATA)', () => {
    it('should transition from PREPARE to WORK', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE duration
      expect(timer.getState().phase).toBe('WORK')
      expect(timer.getState().currentRound).toBe(1)
    })

    it('should transition from WORK to REST', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(DEFAULT_WORK_DURATION) // WORK
      expect(timer.getState().phase).toBe('REST')
    })

    it('should transition from REST to WORK for the next round', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(DEFAULT_WORK_DURATION) // WORK
      jest.advanceTimersByTime(DEFAULT_REST_DURATION) // REST
      expect(timer.getState().phase).toBe('WORK')
      expect(timer.getState().currentRound).toBe(2)
    })

    it('should transition to FINISHED after all rounds', () => {
      const workDuration = 20000
      const restDuration = 10000
      timer.setConfig({ workDuration, restDuration })
      timer.handleCommand('START')

      // PREPARE
      jest.advanceTimersByTime(5000)

      // Go through all 8 rounds
      for (let i = 1; i <= 8; i++) {
        expect(timer.getState().phase).toBe('WORK')
        expect(timer.getState().currentRound).toBe(i)
        jest.advanceTimersByTime(workDuration) // WORK

        if (i < 8) {
          expect(timer.getState().phase).toBe('REST')
          jest.advanceTimersByTime(restDuration) // REST
        }
      }
      expect(timer.getState().phase).toBe('FINISHED')
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH')
    })

    it('should start in PREPARE and transition to RUNNING', () => {
      timer.handleCommand('START')
      expect(timer.getState().phase).toBe('PREPARE')
      jest.advanceTimersByTime(5000) // PREPARE duration
      expect(timer.getState().phase).toBe('RUNNING')
    })

    it('should count up', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(10000)
      expect(timer.getState().elapsedTime).toBeGreaterThanOrEqual(10)
    })

    it('should pause and resume correctly', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(15000) // PREPARE + 10s running
      timer.handleCommand('PAUSE')
      const elapsedTimeOnPause = timer.getState().elapsedTime
      expect(timer.getState().isRunning).toBe(false)

      jest.advanceTimersByTime(5000) // Time should not advance
      expect(timer.getState().elapsedTime).toBe(elapsedTimeOnPause)

      timer.handleCommand('START') // Resume
      expect(timer.getState().isRunning).toBe(true)
      jest.advanceTimersByTime(2000)
      expect(timer.getState().elapsedTime).toBeGreaterThan(elapsedTimeOnPause)
    })

    it('should reset to IDLE state', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(15000)
      timer.handleCommand('STOP')
      expect(timer.getState().phase).toBe('IDLE')
      expect(timer.getState().elapsedTime).toBe(0)
    })
  })

  describe('Disposal', () => {
    it('should clear all timers on dispose', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      timer.handleCommand('START') // This will set up an interval
      timer.dispose()
      expect(clearIntervalSpy).toHaveBeenCalled()
    })
  })
})

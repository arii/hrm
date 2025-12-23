/**
 * Unit tests for TabataTimer service
 * Tests timer state transitions, mode changes, and configuration using EventEmitter
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
import { TimerData, TimerPhase } from '../../types/core'

describe('TabataTimer Service with EventEmitter', () => {
  let timer: TabataTimer
  let emittedStates: TimerData[]
  let lastEmittedState: TimerData | null
  let phaseChanges: TimerPhase[]

  beforeEach(() => {
    jest.useFakeTimers()
    emittedStates = []
    phaseChanges = []
    lastEmittedState = null

    timer = new TabataTimer()
    timer.on('update', (state: TimerData) => {
      emittedStates.push(state)
      lastEmittedState = state
    })
    timer.on('phaseChange', (phase: TimerPhase) => {
      phaseChanges.push(phase)
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    timer.removeAllListeners()
  })

  describe('Initialization', () => {
    it('should initialize in IDLE state with TABATA mode', () => {
      const state = timer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
      expect(state.mode).toBe('TABATA')
      expect(state.timeElapsed).toBe(0)
    })
  })

  describe('Event Emission', () => {
    it('should emit "update" on mode change', () => {
      timer.setMode('STOPWATCH')
      expect(emittedStates.length).toBeGreaterThan(0)
      expect(lastEmittedState?.mode).toBe('STOPWATCH')
    })

    it('should emit "update" on configuration change', () => {
      timer.setConfig({ workDuration: 30, restDuration: 15 })
      expect(emittedStates.length).toBeGreaterThan(0)
      expect(lastEmittedState?.workDuration).toBe(30)
    })

    it('should emit "update" on every tick', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      expect(emittedStates.length).toBeGreaterThanOrEqual(4) // Start + 3 ticks
    })

    it('should emit "phaseChange" when phase transitions', () => {
      timer.handleCommand('START') // IDLE -> PREPARE
      jest.advanceTimersByTime(5000) // PREPARE -> WORK
      jest.advanceTimersByTime(20000) // WORK -> REST

      expect(phaseChanges).toEqual(['PREPARE', 'WORK', 'REST'])
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH')
    })

    it('should count up after PREPARE phase', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      expect(lastEmittedState?.currentPhase).toBe('RUNNING')
      jest.advanceTimersByTime(3000) // RUNNING
      expect(lastEmittedState?.timeElapsed).toBe(3)
    })

    it('should pause and resume correctly', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(8000) // 5s PREPARE + 3s RUNNING
      expect(lastEmittedState?.timeElapsed).toBe(3)

      timer.handleCommand('PAUSE')
      expect(lastEmittedState?.isRunning).toBe(false)
      expect(lastEmittedState?.timeElapsed).toBe(3)

      jest.advanceTimersByTime(5000) // Time shouldn't pass
      expect(lastEmittedState?.timeElapsed).toBe(3)

      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(2000) // 2s RUNNING
      expect(lastEmittedState?.timeElapsed).toBe(2) // Elapsed time resets after pause in stopwatch
    })
  })

  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer.setMode('TABATA')
    })

    it('should cycle through PREPARE -> WORK -> REST', () => {
      timer.handleCommand('START')
      expect(lastEmittedState?.currentPhase).toBe('PREPARE')
      expect(lastEmittedState?.timeRemaining).toBe(5)

      jest.advanceTimersByTime(5000)
      expect(lastEmittedState?.currentPhase).toBe('WORK')
      expect(lastEmittedState?.timeRemaining).toBe(20)

      jest.advanceTimersByTime(20000)
      expect(lastEmittedState?.currentPhase).toBe('REST')
      expect(lastEmittedState?.timeRemaining).toBe(10)
    })
  })

  describe('Sound Cues', () => {
    it('should emit "update" with soundToPlay for phase transitions', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE -> WORK
      // The update for the sound itself comes first, then the phase transition
      const workSoundUpdate = emittedStates[emittedStates.length - 2]
      expect(workSoundUpdate.soundToPlay).toBe('WORK')

      jest.advanceTimersByTime(20000) // WORK -> REST
      const restSoundUpdate = emittedStates[emittedStates.length - 2]
      expect(restSoundUpdate.soundToPlay).toBe('REST')
    })

    it('should emit "update" with soundToPlay for countdown', () => {
      timer.handleCommand('START')
      emittedStates = []
      jest.advanceTimersByTime(2000) // 3s remaining in PREPARE
      expect(emittedStates.some((s) => s.soundToPlay === 'COUNTDOWN')).toBe(
        true
      )
    })

    it('should increment soundEventId with each sound', () => {
      timer.handleCommand('START')
      const initialId = lastEmittedState?.soundEventId ?? 0

      jest.advanceTimersByTime(3000) // Triggers countdown sounds
      const afterCountdownId = lastEmittedState?.soundEventId ?? 0
      expect(afterCountdownId).toBeGreaterThan(initialId)

      jest.advanceTimersByTime(2000) // Triggers WORK sound
      const afterWorkId = lastEmittedState?.soundEventId ?? 0
      expect(afterWorkId).toBeGreaterThan(afterCountdownId)
    })
  })
})

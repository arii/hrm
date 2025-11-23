/**
 * Unit tests for TabataTimer service
 * Tests timer state transitions, mode changes, and configuration
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
import { TimerData } from '../../types/websocket'

describe('TabataTimer Service', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    broadcastMock = jest.fn()
    timer = new TabataTimer(broadcastMock)
  })

  afterEach(() => {
    jest.useRealTimers()
    timer.dispose()
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

    it('should broadcast state update when mode changes', () => {
      timer.setMode('STOPWATCH')
      expect(broadcastMock).toHaveBeenCalled()
      const lastCall = broadcastMock.mock.lastCall[0]
      expect(lastCall.mode).toBe('STOPWATCH')
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer.setMode('STOPWATCH')
    })

    it('should count up after PREPARE phase completes', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(3000) // RUNNING
      const running = timer.getState()
      expect(running.timeElapsed).toBe(3)
    })

    it('should pause and maintain elapsed time', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(6000)
      timer.handleCommand('PAUSE')
      const paused = timer.getState()
      expect(paused.isRunning).toBe(false)
      expect(paused.timeElapsed).toBe(1)
    })
  })

  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer.setMode('TABATA')
    })

    it('should transition to WORK phase after PREPARE', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)
      const state = timer.getState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(20)
    })

    it('should loop indefinitely between WORK and REST', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)
      for (let i = 0; i < 20; i++) {
        jest.advanceTimersByTime(20000)
        expect(timer.getState().currentPhase).toBe('REST')
        jest.advanceTimersByTime(10000)
        expect(timer.getState().currentPhase).toBe('WORK')
      }
    })

    it('should pause and resume from paused phase', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(15000) // In WORK
      timer.handleCommand('PAUSE')
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)
      const resumed = timer.getState()
      expect(resumed.currentPhase).toBe('WORK')
      expect(resumed.timeRemaining).toBe(5)
    })
  })

  describe('Configuration Changes', () => {
    it('should update work and rest duration', () => {
      timer.setConfig({ workDuration: 45, restDuration: 15 })
      const state = timer.getState()
      expect(state.workDuration).toBe(45)
      expect(state.restDuration).toBe(15)
    })

    it('should broadcast state after configuration change', () => {
      timer.setConfig({ workDuration: 30, restDuration: 15 })
      expect(broadcastMock).toHaveBeenCalled()
      const lastState = broadcastMock.mock.lastCall[0] as TimerData
      expect(lastState.workDuration).toBe(30)
    })
  })

  describe('Sound Cues', () => {
    it('should queue WORK sound when transitioning from PREPARE', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(5000)
      const workTransitionBroadcast = broadcastMock.mock.calls.find(
        (call) =>
          call[0].currentPhase === 'WORK' && call[0].soundToPlay === 'WORK'
      )
      expect(workTransitionBroadcast).toBeDefined()
    })

    it('should increment soundEventId for each sound cue', () => {
      timer.handleCommand('START')
      const initialId = (broadcastMock.mock.lastCall[0] as TimerData)
        .soundEventId
      jest.advanceTimersByTime(3000)
      const laterId = (broadcastMock.mock.lastCall[0] as TimerData)
        .soundEventId
      expect(laterId).toBeGreaterThan(initialId)
    })
  })

  describe('Broadcasting', () => {
    it('should broadcast state on every tick', () => {
      broadcastMock.mockClear()
      timer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      expect(broadcastMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    })

    it('should broadcast complete timer state', () => {
      timer.handleCommand('START')
      jest.advanceTimersByTime(1000)
      const lastBroadcast = broadcastMock.mock.lastCall[0] as TimerData
      expect(lastBroadcast).toHaveProperty('isRunning')
      expect(lastBroadcast).toHaveProperty('currentPhase')
      expect(lastBroadcast).toHaveProperty('timeRemaining')
    })
  })
})

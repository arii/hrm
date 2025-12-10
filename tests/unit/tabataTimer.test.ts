/**
 * Unit tests for the refactored, persistent TabataTimer service.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage, TimerData } from '../../types/websocket'

// Mock the fs module to control file system interactions
jest.mock('fs')
const mockedFs = fs as jest.Mocked<typeof fs>

describe('Persistent TabataTimer Service', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let broadcastedStates: TimerData[]

  beforeEach(() => {
    jest.useFakeTimers()
    Date.now = jest.fn(() => 0) // Start time at 0 for predictable calculations

    broadcastedStates = []
    broadcastMock = jest.fn((message: ServerMessage) => {
      if (message.type === 'TIMER_UPDATE') {
        broadcastedStates.push(message.payload)
      }
    })

    // Reset all fs mocks before each test
    mockedFs.existsSync.mockReturnValue(false)
    mockedFs.readFileSync.mockReturnValue('')
    mockedFs.writeFileSync.mockClear()
    mockedFs.mkdirSync.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize in a clean IDLE state if no state file exists', () => {
      timer = new TabataTimer(broadcastMock)
      const state = timer.getDerivedState()
      expect(state.mode).toBe('IDLE')
      expect(state.isRunning).toBe(false)
    })

    it('should load and resume from a persisted running state', () => {
      const persistedState = {
        mode: 'TABATA',
        isRunning: true,
        startTime: -10000, // Pretend it started 10 seconds ago
        accumulatedElapsed: 5,
        config: { workDuration: 20, restDuration: 10, totalCycles: 8 },
      }
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(persistedState))

      timer = new TabataTimer(broadcastMock) // Constructor triggers load and resume
      jest.advanceTimersByTime(200) // Allow one tick to happen

      expect(broadcastMock).toHaveBeenCalled()
      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('TABATA')
    })
  })

  describe('Commands and State Transitions', () => {
    beforeEach(() => {
      timer = new TabataTimer(broadcastMock)
    })

    it('should start a TABATA timer, enter PREPARE phase, and save state', () => {
      timer.start({ workDuration: 30, restDuration: 15, totalCycles: 8 })

      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('TABATA')
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(5)

      expect(mockedFs.writeFileSync).toHaveBeenCalled()
    })

    it('should start a STOPWATCH timer and save state', () => {
      timer.startStopwatch()

      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('STOPWATCH')

      expect(mockedFs.writeFileSync).toHaveBeenCalled()
    })

    it('should pause a running timer and save the accumulated time', () => {
      Date.now = jest.fn(() => 0)
      timer.start()

      Date.now = jest.fn(() => 3000) // Advance time by 3 seconds
      timer.pause()

      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(false)
      // PREPARE phase is 5s, so 3s in, 2s remain.
      expect(state.timeRemaining).toBe(2)

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2) // Start and Pause
    })

    it('should stop a running timer, reset state to IDLE, and save', () => {
      timer.start()
      jest.advanceTimersByTime(2000)

      timer.stop()

      const state = timer.getDerivedState()
      expect(state.mode).toBe('IDLE')
      expect(state.isRunning).toBe(false)
      expect(state.timeElapsed).toBe(0)

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2) // Start and Stop
    })
  })

  describe('Derived State Calculation (Pure Logic)', () => {
    beforeEach(() => {
      timer = new TabataTimer(broadcastMock)
    })

    it('should correctly calculate WORK phase', () => {
      timer.start({ workDuration: 20, restDuration: 10, totalCycles: 8 })

      Date.now = jest.fn(() => 7000) // 5s PREPARE + 2s WORK

      const state = timer.getDerivedState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(18)
      expect(state.cycle).toBe(1)
    })

    it('should correctly calculate REST phase', () => {
      timer.start({ workDuration: 20, restDuration: 10, totalCycles: 8 })

      Date.now = jest.fn(() => 26000) // 5s PREPARE + 20s WORK + 1s REST

      const state = timer.getDerivedState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(9)
      expect(state.cycle).toBe(1)
    })

    it('should correctly calculate the FINISHED phase', () => {
      const config = { workDuration: 20, restDuration: 10, totalCycles: 1 }
      timer.start(config)

      // Total duration = 5s PREPARE + 1 * (20s WORK + 10s REST) = 35s
      Date.now = jest.fn(() => 36000)

      const state = timer.getDerivedState()
      expect(state.currentPhase).toBe('FINISHED')
      expect(state.isRunning).toBe(false)
    })

    it('should correctly calculate elapsed time for STOPWATCH', () => {
      timer.startStopwatch()

      Date.now = jest.fn(() => 15000) // 15 seconds have passed

      const state = timer.getDerivedState()
      expect(state.mode).toBe('STOPWATCH')
      expect(state.currentPhase).toBe('WORK') // After 5s PREPARE, it's in a generic "WORK"
      expect(state.timeElapsed).toBe(15)
    })
  })
})

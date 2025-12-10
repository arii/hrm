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
import { TimerData, UnifiedStateMessage } from '../../types/websocket'
import fs from 'fs'

// Mock the 'fs' module to prevent state persistence during tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

const mockedFs = fs as jest.Mocked<typeof fs>

describe('TabataTimer Service', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock<(message: Partial<UnifiedStateMessage>) => void>
  let broadcastedStates: TimerData[]

  beforeEach(() => {
    // Ensure a clean slate for each test by resetting mocks
    jest.clearAllMocks()
    mockedFs.existsSync.mockReturnValue(false) // Default to no pre-existing state file

    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z')) // Set a fixed start time

    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.timerData) {
        broadcastedStates.push(message.timerData)
      }
    })
    // Timer is initialized in each test block to allow for persistence testing
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initialization and Persistence', () => {
    it('should initialize in a clean IDLE state when no state file exists', () => {
      timer = new TabataTimer(broadcastMock)
      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
      expect(state.mode).toBe('IDLE')
    })

    it('should load and resume from a persisted state file if isRunning is true', () => {
      const persistedState = {
        mode: 'STOPWATCH',
        isRunning: true,
        startTime: new Date('2023-01-01T00:00:10.000Z').getTime(), // Started 10s ago
        accumulatedElapsed: 5, // Had already run for 5s before
        pausedAt: null,
        config: { workDuration: 20, restDuration: 10, totalCycles: 8 },
      }
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(persistedState))

      // Set current time to be later than the persisted start time
      jest.setSystemTime(new Date('2023-01-01T00:00:12.000Z'))

      timer = new TabataTimer(broadcastMock)

      // Advance the timer by one tick to ensure the broadcast is called
      jest.advanceTimersByTime(200)

      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('STOPWATCH')
      // elapsed = accumulated + (now - start) = 5s + (12s - 10s) = 7s (approx)
      expect(state.timeElapsed).toBe(7)
      expect(broadcastMock).toHaveBeenCalled()
    })

    it('should load state but not start ticking if isRunning is false', () => {
      const persistedState = {
        mode: 'TABATA',
        isRunning: false,
        accumulatedElapsed: 15, // Was paused after 15s
      }
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(persistedState))
      timer = new TabataTimer(broadcastMock)

      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(false)
      expect(state.mode).toBe('TABATA')
      expect(state.timeElapsed).toBe(15)
      // Should not start ticking on its own
      expect(broadcastMock).not.toHaveBeenCalled()
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(() => {
      timer = new TabataTimer(broadcastMock)
    })

    it('should start in PREPARE phase', () => {
      timer.startStopwatch()
      const state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('STOPWATCH')
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(0)
    })

    it('should count up time elapsed correctly after PREPARE', () => {
      timer.startStopwatch()
      jest.advanceTimersByTime(5000) // End of PREPARE
      let state = timer.getDerivedState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeElapsed).toBe(5)

      jest.advanceTimersByTime(3000) // 3 seconds into WORK
      state = timer.getDerivedState()
      expect(state.timeElapsed).toBe(8)
    })

    it('should pause and resume correctly', () => {
      timer.startStopwatch()
      jest.advanceTimersByTime(8000) // 5s PREPARE + 3s WORK
      timer.pause()

      let state = timer.getDerivedState()
      expect(state.isRunning).toBe(false)
      expect(state.timeElapsed).toBe(8)

      // Time shouldn't advance while paused
      jest.advanceTimersByTime(5000)
      state = timer.getDerivedState()
      expect(state.timeElapsed).toBe(8)

      // Resume
      timer.start()
      jest.advanceTimersByTime(2000)
      state = timer.getDerivedState()
      expect(state.isRunning).toBe(true)
      expect(state.timeElapsed).toBe(10) // 8s accumulated + 2s new
    })
  })

  describe('Tabata Mode', () => {
    beforeEach(() => {
      timer = new TabataTimer(broadcastMock)
    })

    it('should start with a custom configuration', () => {
      const config = { workDuration: 45, restDuration: 15, totalCycles: 4 }
      timer.start(config)
      jest.advanceTimersByTime(5000) // PREPARE

      const state = timer.getDerivedState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(45)
      expect(state.totalCycles).toBe(4)
    })

    it('should transition through PREPARE, WORK, and REST phases correctly', () => {
      timer.start()
      // At the boundary of PREPARE
      jest.advanceTimersByTime(4999)
      let state = timer.getDerivedState()
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(1)

      // Exactly at the transition to WORK
      jest.advanceTimersByTime(1)
      state = timer.getDerivedState()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBe(20)

      // Exactly at the transition to REST
      jest.advanceTimersByTime(20000)
      state = timer.getDerivedState()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBe(10)
    })

    it('should auto-stop and broadcast FINISHED after the last cycle', () => {
      const config = { workDuration: 10, restDuration: 5, totalCycles: 1 }
      timer.start(config)

      // Advance to the end of the last cycle
      const totalDuration = 5000 + (10 + 5) * 1000
      jest.advanceTimersByTime(totalDuration)

      // The 'tick' that processes the end of the workout should broadcast FINISHED
      const finishedBroadcast = broadcastedStates.find(
        (s) => s.currentPhase === 'FINISHED'
      )
      expect(finishedBroadcast).toBeDefined()
      if (finishedBroadcast) {
        expect(finishedBroadcast.isRunning).toBe(false)
      }

      // After the auto-stop, the final state should be IDLE
      const finalState = timer.getDerivedState()
      expect(finalState.currentPhase).toBe('IDLE')
    })
  })
})

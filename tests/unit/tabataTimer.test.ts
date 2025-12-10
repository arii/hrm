/**
 * Unit tests for the new, persistent TabataTimer service.
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import fs from 'fs'
import path from 'path'
import TabataTimer from '../../services/tabataTimer'
import { TimerData, UnifiedStateMessage } from '../../types/websocket'

// Mock the file system to prevent actual file I/O during tests
jest.mock('fs')
const mockedFs = fs as jest.Mocked<typeof fs>

const STATE_FILE = path.join(process.cwd(), 'logs', 'timer_state.json')

describe('Persistent TabataTimer Service', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock<(data: Partial<UnifiedStateMessage>) => void>
  let broadcastedStates: TimerData[]

  // Helper to advance time and trigger the timer's tick
  const advanceTime = (ms: number) => {
    jest.advanceTimersByTime(ms)
  }

  beforeEach(() => {
    jest.useFakeTimers()
    broadcastedStates = []
    broadcastMock = jest.fn((message) => {
      if (message.timerData) {
        broadcastedStates.push(message.timerData)
      }
    })

    // Reset mocks before each test
    mockedFs.writeFileSync.mockClear()
    mockedFs.readFileSync.mockClear()
    mockedFs.existsSync.mockReturnValue(false) // Default to no state file
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Initialization and State Loading', () => {
    it('should initialize in a clean IDLE state if no state file exists', () => {
      timer = new TabataTimer(broadcastMock)
      const state = timer.getDerivedState()

      expect(state.mode).toBe('IDLE')
      expect(state.isRunning).toBe(false)
      expect(fs.readFileSync).not.toHaveBeenCalled()
    })

    it('should load and resume from a persisted RUNNING state', () => {
      const persistedState = {
        mode: 'TABATA' as const,
        isRunning: true,
        startTime: Date.now() - 10000, // Started 10 seconds ago
        accumulatedElapsed: 0,
        config: { workDuration: 20, restDuration: 10, totalCycles: 8 },
      }
      mockedFs.existsSync.mockReturnValue(true)
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(persistedState))

      timer = new TabataTimer(broadcastMock)
      const state = timer.getDerivedState()

      expect(state.isRunning).toBe(true)
      expect(state.mode).toBe('TABATA')
      // 10s elapsed = 5s PREPARE + 5s WORK
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeElapsed).toBe(10)
      expect(state.timeRemaining).toBe(15) // 20 - 5
    })

    it('should load a PAUSED state and not start the tick loop', () => {
        const pausedState = {
            mode: 'STOPWATCH' as const,
            isRunning: false,
            startTime: null,
            accumulatedElapsed: 30, // Paused after 30 seconds
            config: { workDuration: 20, restDuration: 10, totalCycles: 8 },
        }
        mockedFs.existsSync.mockReturnValue(true)
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(pausedState))

        timer = new TabataTimer(broadcastMock)

        // Advance time to see if the tick loop is running
        advanceTime(5000)

        // The broadcast mock should not be called if the timer is paused
        expect(broadcastMock).not.toHaveBeenCalled()
        const state = timer.getDerivedState()
        expect(state.isRunning).toBe(false)
        expect(state.timeElapsed).toBe(30)
    })
  })

  describe('State Persistence', () => {
    it('should save state to file on start', () => {
      timer = new TabataTimer(broadcastMock)
      timer.start()
      expect(fs.writeFileSync).toHaveBeenCalledWith(STATE_FILE, expect.any(String))
      const savedState = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string)
      expect(savedState.isRunning).toBe(true)
    })

    it('should save state to file on pause', () => {
        timer = new TabataTimer(broadcastMock)
        timer.start()
        advanceTime(1000); // Advance time by 1 second
        mockedFs.writeFileSync.mockClear() // Clear the call from start()
        timer.pause()
        expect(fs.writeFileSync).toHaveBeenCalledWith(STATE_FILE, expect.any(String))
        const savedState = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string)
        expect(savedState.isRunning).toBe(false)
        expect(savedState.accumulatedElapsed).toBeGreaterThan(0)
    })

    it('should save state to file on stop', () => {
        timer = new TabataTimer(broadcastMock)
        timer.start()
        mockedFs.writeFileSync.mockClear()
        timer.stop()
        expect(fs.writeFileSync).toHaveBeenCalledWith(STATE_FILE, expect.any(String))
        const savedState = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string)
        expect(savedState.mode).toBe('IDLE')
    })
  })

  describe('Timestamp-based Logic', () => {
    beforeEach(() => {
        timer = new TabataTimer(broadcastMock)
    })

    it('should correctly calculate elapsed time after a delay', () => {
      timer.startStopwatch()

      const startTime = Date.now()

      // Simulate the passage of time without running setInterval
      jest.spyOn(Date, 'now').mockReturnValue(startTime + 15000) // 15 seconds pass

      const state = timer.getDerivedState()
      // 15s total = 5s PREPARE + 10s WORK
      expect(state.timeElapsed).toBe(15)
      expect(state.currentPhase).toBe('WORK')
    })

    it('should correctly calculate state after being paused', () => {
        timer.start()
        const time1 = Date.now()

        // Run for 12 seconds
        jest.spyOn(Date, 'now').mockReturnValue(time1 + 12000)
        timer.pause()

        const pausedState = timer.getDerivedState()
        // 12s total = 5s PREPARE + 7s WORK
        expect(pausedState.timeElapsed).toBe(12)
        expect(pausedState.timeRemaining).toBe(13) // 20 - 7

        // Resume after another 10 seconds of "real" time has passed
        const time2 = Date.now()
        jest.spyOn(Date, 'now').mockReturnValue(time2 + 10000)
        timer.start()

        // Elapse another 6 seconds in the running state
        const time3 = Date.now()
        jest.spyOn(Date, 'now').mockReturnValue(time3 + 6000)

        const resumedState = timer.getDerivedState()
        // 12s (accumulated) + 6s (new) = 18s total elapsed
        // 18s total = 5s PREPARE + 13s WORK
        expect(resumedState.timeElapsed).toBe(18)
        expect(resumedState.timeRemaining).toBe(7) // 20 - 13
    })

    it('should transition through TABATA phases correctly based on time', () => {
        timer.start({ workDuration: 10, restDuration: 5, totalCycles: 2 })

        // PREPARE phase
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 4000) // 4s elapsed
        let state = timer.getDerivedState()
        expect(state.currentPhase).toBe('PREPARE')
        expect(state.timeRemaining).toBe(1)

        // WORK phase 1
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 3000) // 7s elapsed
        state = timer.getDerivedState()
        expect(state.currentPhase).toBe('WORK')
        expect(state.timeRemaining).toBe(8) // 10 - (7-5)

        // REST phase 1
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 9000) // 16s elapsed
        state = timer.getDerivedState()
        expect(state.currentPhase).toBe('REST')
        expect(state.timeRemaining).toBe(4) // 15 - (16-5)

        // FINISHED phase
        jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 20000) // 36s elapsed
        state = timer.getDerivedState()
        expect(state.currentPhase).toBe('FINISHED')
    })
  })
})

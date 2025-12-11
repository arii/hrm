/**
 * @jest-environment jsdom
 */
// File: tests/unit/tabataTimer.test.ts
import { jest } from '@jest/globals'
import fs from 'fs/promises'
import { TabataTimer } from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'

// Mock the logger to suppress console output during tests
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

// Mock the file system to prevent tests from writing to disk
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(() => Promise.reject(new Error('ENOENT'))), // Simulate no existing file by default
}))

describe('TabataTimer (Event-Sourced)', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock<(message: ServerMessage) => void>
  let dateNowSpy: jest.Spied<() => number>
  let currentTime: number

  // Helper to advance time for both Date.now() and Jest's fake timers
  const advanceTime = (ms: number) => {
    currentTime += ms
    dateNowSpy.mockReturnValue(currentTime)
    jest.advanceTimersByTime(ms)
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    broadcastMock = jest.fn()

    // Reset mocks for a clean slate in each test
    ;(fs.writeFile as jest.Mock).mockClear()
    ;(fs.readFile as jest.Mock).mockClear().mockRejectedValue('ENOENT')

    // Mock Date.now() to control time
    currentTime = 1700000000000
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(currentTime)

    timer = await TabataTimer.create(broadcastMock)
  })

  afterEach(() => {
    timer.dispose()
    jest.useRealTimers()
    dateNowSpy.mockRestore()
  })

  describe('Initialization and State Restoration', () => {
    it('should initialize in IDLE state', () => {
      const state = timer.getTimerData()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should resume a running timer from persisted state', async () => {
      const runningStateEvents = {
        events: [
          {
            type: 'START',
            startTime: currentTime,
            timestamp: currentTime,
          },
        ],
      }
      ;(fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(runningStateEvents)
      )

      const restoredTimer = await TabataTimer.create(broadcastMock)
      advanceTime(1000)

      const state = restoredTimer.getTimerData()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBeCloseTo(4000)
      restoredTimer.dispose()
    })
  })

  describe('Core Timer Commands', () => {
    it('should start the timer and enter PREPARE phase', async () => {
      await timer.handleCommand('START')
      const state = timer.getTimerData()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBe(5000)
    })

    it('should pause the timer and capture remaining time', async () => {
      await timer.handleCommand('START')
      advanceTime(2000)

      await timer.handleCommand('PAUSE')
      const state = timer.getTimerData()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBeCloseTo(3000)
    })

    it('should resume from a paused state', async () => {
      await timer.handleCommand('START')
      advanceTime(2000)
      await timer.handleCommand('PAUSE')
      advanceTime(5000)

      await timer.handleCommand('START')
      advanceTime(1000)

      const state = timer.getTimerData()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
      expect(state.timeRemaining).toBeCloseTo(2000)
    })
  })

  describe('Phase Transitions (Tabata Mode)', () => {
    it('should transition from PREPARE to WORK', async () => {
      await timer.handleCommand('START')
      advanceTime(5000)
      const state = timer.getTimerData()
      expect(state.currentPhase).toBe('WORK')
      expect(state.timeRemaining).toBeCloseTo(20000)
    })

    it('should transition from WORK to REST', async () => {
      await timer.setConfig({ workDuration: 2000, restDuration: 1000 })
      await timer.handleCommand('START')
      advanceTime(5000) // PREPARE
      advanceTime(2000) // WORK
      const state = timer.getTimerData()
      expect(state.currentPhase).toBe('REST')
      expect(state.timeRemaining).toBeCloseTo(1000)
    })
  })

  describe('Stopwatch Mode', () => {
    beforeEach(async () => {
      await timer.setMode('STOPWATCH')
    })

    it('should resume counting up from the paused time', async () => {
      await timer.handleCommand('START')
      advanceTime(5000)
      await timer.handleCommand('PAUSE')
      advanceTime(10000)
      await timer.handleCommand('START')
      advanceTime(3000)
      const state = timer.getTimerData()
      expect(state.isRunning).toBe(true)
      expect(state.timeElapsed).toBeCloseTo(8000)
    })
  })

  describe('Sound Cues', () => {
    it('should produce a WORK sound on PREPARE -> WORK transition', async () => {
      await timer.handleCommand('START')
      advanceTime(5000)
      const state = timer.getTimerData()
      expect(state.soundToPlay).toBe('WORK')
    })

    it('should produce a REST sound on WORK -> REST transition', async () => {
      await timer.setConfig({ workDuration: 1000, restDuration: 1000 })
      await timer.handleCommand('START')
      advanceTime(5000) // PREPARE
      advanceTime(1000) // WORK
      const state = timer.getTimerData()
      expect(state.soundToPlay).toBe('REST')
    })

    it('should produce COUNTDOWN sounds for the last 3 seconds', async () => {
      await timer.handleCommand('START')
      advanceTime(2001) // 3s remaining
      expect(timer.getTimerData().soundToPlay).toBe('COUNTDOWN')
    })
  })
})

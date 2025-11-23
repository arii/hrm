// File: tests/unit/tabataTimer.test.ts
import TabataTimer from '../../services/tabataTimer'
import { jest } from '@jest/globals'

/**
 * @fileoverview Unit tests for the TabataTimer class, focusing on verifying
 * the behavior of the new event-sourcing implementation.
 */

describe('TabataTimer with Event Sourcing', () => {
  let timer: TabataTimer
  let broadcastState: jest.Mock

  beforeEach(() => {
    broadcastState = jest.fn()
    timer = new TabataTimer(broadcastState)
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize in IDLE state', () => {
    const state = timer.getState()
    expect(state.currentPhase).toBe('IDLE')
    expect(state.isRunning).toBe(false)
  })

  it('should transition to PREPARE phase on START', () => {
    timer.handleCommand('START')
    const state = timer.getState()
    expect(state.currentPhase).toBe('PREPARE')
    expect(state.isRunning).toBe(true)
    expect(state.timeRemaining).toBe(5) // PREPARE_DURATION
  })

  it('should transition from PREPARE to WORK after countdown', () => {
    timer.handleCommand('START')
    jest.advanceTimersByTime(5000)
    const state = timer.getState()
    expect(state.currentPhase).toBe('WORK')
    expect(state.timeRemaining).toBe(20) // DEFAULT_WORK_DURATION
  })

  it('should cycle through WORK and REST phases', () => {
    timer.setConfig({ workDuration: 5, restDuration: 3 })
    timer.handleCommand('START')

    // PREPARE phase
    jest.advanceTimersByTime(5000)
    let state = timer.getState()
    expect(state.currentPhase).toBe('WORK')
    expect(state.timeRemaining).toBe(5)

    // WORK phase
    jest.advanceTimersByTime(5000)
    state = timer.getState()
    expect(state.currentPhase).toBe('REST')
    expect(state.timeRemaining).toBe(3)

    // REST phase
    jest.advanceTimersByTime(3000)
    state = timer.getState()
    expect(state.currentPhase).toBe('WORK')
    expect(state.timeRemaining).toBe(5)
  })

  it('should handle PAUSE and RESUME commands', () => {
    timer.handleCommand('START')
    jest.advanceTimersByTime(2000)
    timer.handleCommand('PAUSE')
    let state = timer.getState()
    expect(state.isRunning).toBe(false)
    expect(state.timeRemaining).toBe(3)

    timer.handleCommand('START') // Resume
    state = timer.getState()
    expect(state.isRunning).toBe(true)
    jest.advanceTimersByTime(1000)
    state = timer.getState()
    expect(state.timeRemaining).toBe(2)
  })

  it('should handle STOP command and reset to initial state', () => {
    timer.handleCommand('START')
    jest.advanceTimersByTime(2000)
    timer.handleCommand('STOP')
    const state = timer.getState()
    expect(state.currentPhase).toBe('IDLE')
    expect(state.isRunning).toBe(false)
    expect(state.timeRemaining).toBe(20) // Resets to work duration
  })

  it('should switch mode to STOPWATCH', () => {
    timer.setMode('STOPWATCH')
    timer.handleCommand('START')
    jest.advanceTimersByTime(5000) // PREPARE phase
    const state = timer.getState()
    expect(state.currentPhase).toBe('RUNNING')
    expect(state.mode).toBe('STOPWATCH')
  })

  it('should count up in STOPWATCH mode', () => {
    timer.setMode('STOPWATCH')
    timer.handleCommand('START')
    jest.advanceTimersByTime(5000) // PREPARE phase
    jest.advanceTimersByTime(3000) // RUNNING phase
    const state = timer.getState()
    expect(state.timeElapsed).toBeCloseTo(3)
  })

  it('should correctly calculate elapsed time after pause in STOPWATCH mode', () => {
    timer.setMode('STOPWATCH')
    timer.handleCommand('START')
    jest.advanceTimersByTime(8000) // 5s PREPARE + 3s RUNNING
    timer.handleCommand('PAUSE')
    jest.advanceTimersByTime(10000) // Paused for 10s
    timer.handleCommand('START')
    jest.advanceTimersByTime(2000) // Run for 2 more seconds
    const state = timer.getState()
    expect(state.timeElapsed).toBeCloseTo(5)
  })

  it('should play countdown sounds', () => {
    timer.handleCommand('START')
    // After 1s, time remaining is 4. No sound.
    jest.advanceTimersByTime(1000)
    expect(timer.getState().soundToPlay).toBeUndefined()

    // After 2s, time remaining is 3. Countdown sound.
    jest.advanceTimersByTime(1000)
    expect(timer.getState().soundToPlay).toBe('COUNTDOWN')

    // After 3s, time remaining is 2. Countdown sound.
    jest.advanceTimersByTime(1000)
    expect(timer.getState().soundToPlay).toBe('COUNTDOWN')

    // After 4s, time remaining is 1. Countdown sound.
    jest.advanceTimersByTime(1000)
    expect(timer.getState().soundToPlay).toBe('COUNTDOWN')

    // After 5s, time remaining is 0. Transition to WORK. WORK sound.
    jest.advanceTimersByTime(1000)
    expect(timer.getState().soundToPlay).toBe('WORK')
  })

  it('should update configuration and sanitize inputs', () => {
    timer.setConfig({ workDuration: 30.5, restDuration: 15.2 })
    let state = timer.getState()
    expect(state.workDuration).toBe(30)
    expect(state.restDuration).toBe(15)
    expect(state.timeRemaining).toBe(30)

    timer.setConfig({ workDuration: 0, restDuration: -5 })
    state = timer.getState()
    expect(state.workDuration).toBe(1)
    expect(state.restDuration).toBe(0)
  })

  it('should ignore START command if already running', () => {
    timer.handleCommand('START')
    const state1 = timer.getState()
    timer.handleCommand('START')
    const state2 = timer.getState()
    expect(state1).toEqual(state2)
  })

  it('should not allow mode change while running', () => {
    timer.handleCommand('START')
    const initialState = timer.getState()
    timer.setMode('STOPWATCH')
    const finalState = timer.getState()
    expect(finalState.mode).toBe(initialState.mode)
  })
})

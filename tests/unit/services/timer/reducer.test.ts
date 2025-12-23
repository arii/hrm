// File: tests/unit/services/timer/reducer.test.ts
/**
 * @jest-environment node
 */
import { timerReducer, initialState } from '../../../../services/timer/reducer'
import { TimerState } from '../../../../services/timer/types'

describe('timerReducer', () => {
  let state: TimerState

  beforeEach(() => {
    state = { ...initialState }
    // Mock Date.now() to control time-based logic
    jest.spyOn(Date, 'now').mockReturnValue(10000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should handle START_TIMER from IDLE', () => {
    const newState = timerReducer(state, {
      type: 'START_TIMER',
      startTime: 10000,
    })
    expect(newState.isRunning).toBe(true)
    expect(newState.currentPhase).toBe('PREPARE')
    expect(newState.timeRemaining).toBe(5)
  })

  it('should handle PAUSE_TIMER', () => {
    state.isRunning = true
    const newState = timerReducer(state, { type: 'PAUSE_TIMER' })
    expect(newState.isRunning).toBe(false)
  })

  it('should handle STOP_TIMER', () => {
    state.isRunning = true
    state.timeElapsed = 10
    const newState = timerReducer(state, { type: 'STOP_TIMER' })
    expect(newState.isRunning).toBe(false)
    expect(newState.timeElapsed).toBe(0)
    expect(newState.currentPhase).toBe('IDLE')
  })

  it('should handle TICK in TABATA mode', () => {
    state.isRunning = true
    state.mode = 'TABATA'
    state.currentPhase = 'WORK'
    state.timeRemaining = 10
    const newState = timerReducer(state, { type: 'TICK' })
    expect(newState.timeRemaining).toBe(9)
  })

  it('should handle TICK in STOPWATCH mode', () => {
    state.isRunning = true
    state.mode = 'STOPWATCH'
    state.currentPhase = 'RUNNING'
    state.startTime = 10000
    state.pausedElapsedTime = 5

    jest.spyOn(Date, 'now').mockReturnValue(12000) // 2 seconds later

    const newState = timerReducer(state, { type: 'TICK' })
    expect(newState.timeElapsed).toBe(7) // 5 paused + 2 elapsed
  })

  it('should transition from PREPARE to WORK', () => {
    state.isRunning = true
    state.currentPhase = 'PREPARE'
    state.timeRemaining = 1
    const newState = timerReducer(state, { type: 'TICK' })
    expect(newState.currentPhase).toBe('WORK')
    expect(newState.timeRemaining).toBe(state.workDuration)
    expect(newState.soundToPlay).toBe('WORK')
  })

  it('should transition from WORK to REST', () => {
    state.isRunning = true
    state.currentPhase = 'WORK'
    state.timeRemaining = 1
    const newState = timerReducer(state, { type: 'TICK' })
    expect(newState.currentPhase).toBe('REST')
    expect(newState.timeRemaining).toBe(state.restDuration)
    expect(newState.soundToPlay).toBe('REST')
  })

  it('should handle CONFIGURE_TIMER', () => {
    const newState = timerReducer(state, {
      type: 'CONFIGURE_TIMER',
      payload: { workDuration: 30, restDuration: 15 },
    })
    expect(newState.workDuration).toBe(30)
    expect(newState.restDuration).toBe(15)
  })

  it('should handle SET_MODE', () => {
    const newState = timerReducer(state, {
      type: 'SET_MODE',
      mode: 'STOPWATCH',
    })
    expect(newState.mode).toBe('STOPWATCH')
    expect(newState.currentPhase).toBe('IDLE')
  })
})

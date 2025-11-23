import TabataTimer from '../../services/tabataTimer'

describe('TabataTimer', () => {
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

  test('Stopwatch should resume immediately without PREPARE countdown', () => {
    timer.setMode('STOPWATCH')
    timer.handleCommand('START')

    // 5 seconds PREPARE
    jest.advanceTimersByTime(5000)

    // Run for 10 seconds
    jest.advanceTimersByTime(10000)

    expect(timer.getState().timeElapsed).toBe(10)

    timer.handleCommand('PAUSE')
    expect(timer.getState().currentPhase).toBe('IDLE') // Stopwatch pause sets to IDLE

    // Wait 5 seconds while paused
    jest.advanceTimersByTime(5000)

    timer.handleCommand('START')

    // Should be RUNNING immediately, not PREPARE
    expect(timer.getState().currentPhase).toBe('RUNNING')

    // Run for another 5 seconds
    jest.advanceTimersByTime(5000)

    // Should be 15 seconds total (10 + 5)
    expect(timer.getState().timeElapsed).toBe(15)
  })
})

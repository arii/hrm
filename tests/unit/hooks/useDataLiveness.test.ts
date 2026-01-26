/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useDataLiveness from '@/hooks/useDataLiveness'

describe('useDataLiveness', () => {
  const RealDateNow = Date.now

  afterEach(() => {
    // Restore original Date.now after each test
    global.Date.now = RealDateNow
    jest.useRealTimers()
  })

  const setup = (props: any) => {
    const onStale = jest.fn()
    const initialTimestamp = 10000000 // A fixed starting point
    global.Date.now = jest.fn(() => initialTimestamp)
    jest.useFakeTimers()

    const initialProps = {
      lastDataTimestamp: initialTimestamp,
      isConnected: true,
      dataLivenessTimeoutMs: 5000,
      onStale,
      ...props,
    }
    const { rerender, ...rest } = renderHook(
      (props) => useDataLiveness(props),
      {
        initialProps,
      }
    )
    return { rerender, onStale, initialTimestamp, ...rest }
  }

  it('should initialize with isDataStale as false', () => {
    const { result } = setup({})
    expect(result.current.isDataStale).toBe(false)
  })

  it('should call onStale and set isDataStale to true when timeout is exceeded', () => {
    const { result, onStale, initialTimestamp } = setup({})

    // Initial state
    expect(result.current.isDataStale).toBe(false)

    // Advance time just past the timeout
    act(() => {
      // Mock Date.now to have moved forward in time
      global.Date.now = jest.fn(() => initialTimestamp + 5001)
      jest.advanceTimersByTime(2000) // Trigger the interval check
    })

    expect(onStale).toHaveBeenCalledTimes(1)
    expect(result.current.isDataStale).toBe(true)
  })

  it('should reset isDataStale to false when new data arrives', () => {
    const { result, onStale, rerender, initialTimestamp } = setup({})

    // First, make the data stale
    act(() => {
      global.Date.now = jest.fn(() => initialTimestamp + 5001)
      jest.advanceTimersByTime(2000)
    })
    expect(onStale).toHaveBeenCalledTimes(1)
    expect(result.current.isDataStale).toBe(true)

    // Then, simulate new data arriving by updating props
    const newTimestamp = initialTimestamp + 6000
    rerender({
      lastDataTimestamp: newTimestamp,
      isConnected: true,
      dataLivenessTimeoutMs: 5000,
      onStale,
    })

    // Run the interval check again, where Date.now is still ahead but the gap is small
    act(() => {
      global.Date.now = jest.fn(() => newTimestamp + 1000)
      jest.advanceTimersByTime(2000)
    })

    // isDataStale should now be false
    expect(result.current.isDataStale).toBe(false)
  })

  it('should clean up the interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    const { unmount } = setup({})

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})

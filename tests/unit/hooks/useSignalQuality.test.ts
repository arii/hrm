/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import useSignalQuality from '@/hooks/useSignalQuality'

describe('useSignalQuality', () => {
  const RealDateNow = Date.now

  afterEach(() => {
    // Restore original Date.now after each test
    global.Date.now = RealDateNow
    jest.useRealTimers()
  })

  const setup = (props: any) => {
    const initialTimestamp = 10000000
    global.Date.now = jest.fn(() => initialTimestamp)
    jest.useFakeTimers()

    const initialProps = {
      lastDataTimestamp: 0,
      isConnected: false,
      isDataStale: false,
      ...props,
    }
    return renderHook((props) => useSignalQuality(props), {
      initialProps,
    })
  }

  it('should initialize with a signal period of 0', () => {
    const { result } = setup({})
    expect(result.current.signalPeriodMs).toBe(0)
  })

  it('should not calculate a period for the first data packet', () => {
    const { result, rerender } = setup({ isConnected: true })

    rerender({
      lastDataTimestamp: Date.now(),
      isConnected: true,
      isDataStale: false,
    })

    expect(result.current.signalPeriodMs).toBe(0)
  })

  it('should calculate the period correctly on the second data packet', () => {
    const { result, rerender } = setup({ isConnected: true })
    const firstTimestamp = Date.now()

    rerender({
      lastDataTimestamp: firstTimestamp,
      isConnected: true,
      isDataStale: false,
    })

    const secondTimestamp = firstTimestamp + 1000
    rerender({
      lastDataTimestamp: secondTimestamp,
      isConnected: true,
      isDataStale: false,
    })

    expect(result.current.signalPeriodMs).toBe(1000)
  })

  it('should proactively increase period if heartbeat detects a missed packet', () => {
    const { result, rerender } = setup({ isConnected: true })

    // Establish a baseline average
    let timestamp = Date.now()
    rerender({
      lastDataTimestamp: timestamp,
      isConnected: true,
      isDataStale: false,
    })
    timestamp += 1000
    rerender({
      lastDataTimestamp: timestamp,
      isConnected: true,
      isDataStale: false,
    })
    expect(result.current.signalPeriodMs).toBe(1000)

    // Advance time to trigger heartbeat
    act(() => {
      // Let's say 2000ms have passed since the last packet
      global.Date.now = jest.fn(() => timestamp + 2000)
      jest.advanceTimersByTime(1000) // Trigger the interval
    })

    // The heartbeat should have detected the missed packet and updated the period
    // New history would be [1000, 2000], avg is 1500
    expect(result.current.signalPeriodMs).toBe(1500)
  })

  it('should reset the signal period to 0 on disconnect', () => {
    const { result, rerender } = setup({ isConnected: true })
    let timestamp = Date.now()
    rerender({
      lastDataTimestamp: timestamp,
      isConnected: true,
      isDataStale: false,
    })
    timestamp += 1000
    rerender({
      lastDataTimestamp: timestamp,
      isConnected: true,
      isDataStale: false,
    })
    expect(result.current.signalPeriodMs).toBe(1000)

    // Disconnect
    rerender({
      lastDataTimestamp: timestamp,
      isConnected: false,
      isDataStale: false,
    })
    expect(result.current.signalPeriodMs).toBe(0)
  })
})

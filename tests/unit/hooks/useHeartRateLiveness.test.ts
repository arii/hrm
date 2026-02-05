/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useHeartRateLiveness } from '@/hooks/useHeartRateLiveness'
import { HRM_STALE_WARNING_MS, HRM_STALE_THRESHOLD_MS } from '@/constants/hrm'
import { HrmData } from '@/types/websocket'

describe('useHeartRateLiveness', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-01T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('marks data as fresh when updatedAt is recent', () => {
    const now = Date.now()
    const hrmData: HrmData[] = [
      {
        clientId: 'client1',
        value: 70,
        maxHr: 180,
        calories: 100,
        isConnected: true,
        updatedAt: now - 1000, // 1s ago
      },
    ]

    const { result } = renderHook(() => useHeartRateLiveness(hrmData))

    expect(result.current[0].isDataStale).toBe(false)
    expect(result.current[0].isExpired).toBe(false)
  })

  it('marks data as stale after warning threshold', () => {
    const now = Date.now()
    const hrmData: HrmData[] = [
      {
        clientId: 'client1',
        value: 70,
        maxHr: 180,
        calories: 100,
        isConnected: true,
        updatedAt: now - (HRM_STALE_WARNING_MS + 1000),
      },
    ]

    const { result } = renderHook(() => useHeartRateLiveness(hrmData))

    expect(result.current[0].isDataStale).toBe(true)
    expect(result.current[0].isExpired).toBe(false)
  })

  it('marks data as expired after threshold', () => {
    const now = Date.now()
    const hrmData: HrmData[] = [
      {
        clientId: 'client1',
        value: 70,
        maxHr: 180,
        calories: 100,
        isConnected: true,
        updatedAt: now - (HRM_STALE_THRESHOLD_MS + 1000),
      },
    ]

    const { result } = renderHook(() => useHeartRateLiveness(hrmData))

    expect(result.current[0].isDataStale).toBe(true)
    expect(result.current[0].isExpired).toBe(true)
  })

  it('updates liveness flags when time passes', () => {
    const now = Date.now()
    const hrmData: HrmData[] = [
      {
        clientId: 'client1',
        value: 70,
        maxHr: 180,
        calories: 100,
        isConnected: true,
        updatedAt: now,
      },
    ]

    const { result } = renderHook(() => useHeartRateLiveness(hrmData))

    expect(result.current[0].isDataStale).toBe(false)

    // Advance time by 25 seconds
    act(() => {
      jest.advanceTimersByTime(25000)
    })

    expect(result.current[0].isDataStale).toBe(true)
    expect(result.current[0].isExpired).toBe(false)

    // Advance time to 36 seconds total
    act(() => {
      jest.advanceTimersByTime(15000)
    })
    expect(result.current[0].isExpired).toBe(true)
  })
})

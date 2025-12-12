/** @jest-environment jsdom */

import { renderHook } from '@testing-library/react'
import { useHeartRateMetrics } from '@/hooks/useHeartRateMetrics'
import { HrmData } from '@/types/websocket'

describe('useHeartRateMetrics', () => {
  it('should return initial values', () => {
    const { result } = renderHook(() => useHeartRateMetrics('user1', []))
    expect(result.current.currentHeartRate).toBe(null)
    expect(result.current.averageHeartRate).toBe(0)
    expect(result.current.maxHeartRate).toBe(0)
  })

  it('should update currentHeartRate when hrmData changes', () => {
    const hrmData: HrmData[] = [
      { clientId: 'user1', name: 'Ariel', value: 150 },
    ]
    const { result, rerender } = renderHook(
      ({ clientId, hrmData }) => useHeartRateMetrics(clientId, hrmData),
      { initialProps: { clientId: 'user1', hrmData: [] } }
    )

    rerender({ clientId: 'user1', hrmData })

    expect(result.current.currentHeartRate).toBe(150)
  })

  it('should calculate average and max heart rate', () => {
    const hrmData1: HrmData[] = [
      { clientId: 'user1', name: 'Ariel', value: 150 },
    ]
    const hrmData2: HrmData[] = [
      { clientId: 'user1', name: 'Ariel', value: 160 },
    ]
    const hrmData3: HrmData[] = [
      { clientId: 'user1', name: 'Ariel', value: 170 },
    ]

    const { result, rerender } = renderHook(
      ({ clientId, hrmData }) => useHeartRateMetrics(clientId, hrmData),
      { initialProps: { clientId: 'user1', hrmData: [] } }
    )

    rerender({ clientId: 'user1', hrmData: hrmData1 })
    rerender({ clientId: 'user1', hrmData: hrmData2 })
    rerender({ clientId: 'user1', hrmData: hrmData3 })

    expect(result.current.averageHeartRate).toBe(160)
    expect(result.current.maxHeartRate).toBe(170)
  })

  it('should handle multiple users', () => {
    const hrmData: HrmData[] = [
      { clientId: 'user1', name: 'Ariel', value: 150 },
      { clientId: 'user2', name: 'Jules', value: 160 },
    ]
    const { result } = renderHook(() => useHeartRateMetrics('user2', hrmData))

    expect(result.current.currentHeartRate).toBe(160)
  })

  it('should limit the history to HEART_RATE_HISTORY_SIZE entries', () => {
    const hrmData: HrmData[] = []
    for (let i = 0; i < 110; i++) {
      hrmData.push({ clientId: 'user1', name: 'Ariel', value: 100 + i })
    }

    const { result, rerender } = renderHook(
      ({ clientId, hrmData }) => useHeartRateMetrics(clientId, hrmData),
      { initialProps: { clientId: 'user1', hrmData: [] } }
    )

    for (const data of hrmData) {
      rerender({ clientId: 'user1', hrmData: [data] })
    }

    const expectedAverage =
      Array.from({ length: 100 }, (_, i) => 209 - i).reduce(
        (a, b) => a + b,
        0
      ) / 100
    expect(result.current.averageHeartRate).toBe(Math.round(expectedAverage))
    expect(result.current.maxHeartRate).toBe(209)
  })
})

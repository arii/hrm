/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useHrmDataHistory.test.ts
import { renderHook, act } from '@testing-library/react'
import { useHrmDataHistory } from '@/hooks/useHrmDataHistory'
import { HrmData } from '@/context/WebSocketContext'

describe('useHrmDataHistory', () => {
  it('should initialize with an empty history', () => {
    const { result } = renderHook(() => useHrmDataHistory([]))
    expect(result.current).toEqual({})
  })

  it('should add new entries to the history', () => {
    const { result, rerender } = renderHook(
      ({ hrmData }) => useHrmDataHistory(hrmData),
      {
        initialProps: { hrmData: [] },
      }
    )

    const newHrmData: HrmData[] = [
      { clientId: 'client1', value: 120, maxHr: 190, calories: 10 },
    ]

    rerender({ hrmData: newHrmData })

    expect(result.current.client1).toHaveLength(1)
    expect(result.current.client1[0].value).toBe(120)
  })

  it('should not add entries with a value of 0', () => {
    const { result, rerender } = renderHook(
      ({ hrmData }) => useHrmDataHistory(hrmData),
      {
        initialProps: { hrmData: [] },
      }
    )

    const newHrmData: HrmData[] = [
      { clientId: 'client1', value: 0, maxHr: 190, calories: 10 },
    ]

    rerender({ hrmData: newHrmData })

    expect(result.current).toEqual({})
  })

  it('should limit the history to MAX_HISTORY_LENGTH', () => {
    const { result, rerender } = renderHook(
      ({ hrmData }) => useHrmDataHistory(hrmData),
      {
        initialProps: { hrmData: [] },
      }
    )

    let hrmData: HrmData[] = []
    for (let i = 0; i < 110; i++) {
      hrmData = [{ clientId: 'client1', value: 100 + i, maxHr: 190, calories: 10 }]
      rerender({ hrmData })
    }

    expect(result.current.client1).toHaveLength(100)
    expect(result.current.client1[0].value).toBe(110)
  })
})

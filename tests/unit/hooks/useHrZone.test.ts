/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useHrZone } from '@/hooks/useHrZone'
import { HrZoneName } from '@/lib/shared/hr-zones'

describe('useHrZone', () => {
  it('should return correct zone properties based on input', () => {
    const currentHR = 100
    const maxHr = 200 // 50% -> WarmUp
    const { result } = renderHook(() => useHrZone(currentHR, maxHr))

    expect(result.current.zone).toBe(HrZoneName.WarmUp)
    expect(result.current.percentage).toBe(50)
    expect(result.current.bpm).toBe(100)
    expect(result.current.color).toBeDefined()
    expect(result.current.backgroundColor).toBeDefined()
  })

  it('should memoize the result', () => {
    const { result, rerender } = renderHook(
      ({ hr, max }) => useHrZone(hr, max),
      {
        initialProps: { hr: 100, max: 200 },
      }
    )

    const firstResult = result.current

    // Rerender with same props
    rerender({ hr: 100, max: 200 })
    expect(result.current).toBe(firstResult) // Reference equality check

    // Rerender with new props
    rerender({ hr: 110, max: 200 })
    expect(result.current).not.toBe(firstResult)
    expect(result.current.bpm).toBe(110)
  })
})

/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useHrZone.test.ts
import { renderHook } from '@testing-library/react'
import { useHrZone } from '../../../hooks/useHrZone'
import { HrZoneName } from '../../../lib/shared/hr-zones'
import theme from '../../../lib/theme'

describe('useHrZone', () => {
  it('should return the correct zone for a given HR', () => {
    const { result } = renderHook(() => useHrZone(180, 190))
    expect(result.current.label).toBe(HrZoneName.Max)
  })

  it('should return the correct color for a given HR', () => {
    const { result } = renderHook(() => useHrZone(180, 190))
    expect(result.current.progressColor).toBe(theme.palette.error.dark)
  })

  it('should return "No Data" when currentHR is 0', () => {
    const { result } = renderHook(() => useHrZone(0, 190))
    expect(result.current.label).toBe(HrZoneName.NoData)
  })

  it('should memoize the result', () => {
    const { result, rerender } = renderHook(
      ({ hr, maxHr }) => useHrZone(hr, maxHr),
      { initialProps: { hr: 180, maxHr: 190 } }
    )
    const firstResult = result.current
    rerender({ hr: 180, maxHr: 190 })
    expect(result.current).toBe(firstResult)
  })
})

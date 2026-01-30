/** @jest-environment jsdom */
import { mockGetHrZoneProps } from '../../mocks/visualization'
import { renderHook } from '@testing-library/react'
import { useHrZone } from '@/hooks/useHrZone'

describe('useHrZone', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should call getHrZoneProps with correct arguments', () => {
    const mockProps = {
      percentage: 50,
      color: 'primary',
      progressColor: '#fff',
      label: 'Zone 1',
    }
    mockGetHrZoneProps.mockReturnValue(mockProps)

    const currentHR = 100
    const maxHr = 200
    const { result } = renderHook(() => useHrZone(currentHR, maxHr))

    expect(mockGetHrZoneProps).toHaveBeenCalledWith(currentHR, maxHr)
    expect(result.current).toEqual(mockProps)
  })

  it('should memoize the result', () => {
    const mockProps = {
      percentage: 50,
      color: 'primary',
      progressColor: '#fff',
      label: 'Zone 1',
    }
    mockGetHrZoneProps.mockReturnValue(mockProps)

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
    expect(mockGetHrZoneProps).toHaveBeenCalledTimes(1) // Should still be 1

    // Rerender with new props
    rerender({ hr: 110, max: 200 })
    expect(mockGetHrZoneProps).toHaveBeenCalledTimes(2)
  })
})

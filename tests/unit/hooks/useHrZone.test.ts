/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react'
import { useHrZone } from '@/hooks/useHrZone'
import { getHrZoneProps } from '@/utils/visualization'

// Mock visualization utility
jest.mock('@/utils/visualization', () => ({
  getHrZoneProps: jest.fn(),
}))

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
    ;(getHrZoneProps as jest.Mock).mockReturnValue(mockProps)

    const currentHR = 100
    const maxHr = 200
    const { result } = renderHook(() => useHrZone(currentHR, maxHr))

    expect(getHrZoneProps).toHaveBeenCalledWith(currentHR, maxHr)
    expect(result.current).toEqual(mockProps)
  })

  it('should memoize the result', () => {
    const mockProps = {
      percentage: 50,
      color: 'primary',
      progressColor: '#fff',
      label: 'Zone 1',
    }
    ;(getHrZoneProps as jest.Mock).mockReturnValue(mockProps)

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
    expect(getHrZoneProps).toHaveBeenCalledTimes(1) // Should still be 1

    // Rerender with new props
    rerender({ hr: 110, max: 200 })
    expect(getHrZoneProps).toHaveBeenCalledTimes(2)
  })
})

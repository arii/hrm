/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useSwipeGesture from '../../../hooks/useSwipeGesture'

describe('useSwipeGesture', () => {
  it('should call onSwipeLeft when swiping left', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }))

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 100 }] } as React.TouchEvent)
      result.current.onTouchMove({ targetTouches: [{ clientX: 20 }] } as React.TouchEvent)
      result.current.onTouchEnd()
    })

    expect(onSwipeLeft).toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })

  it('should call onSwipeRight when swiping right', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }))

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 20 }] } as React.TouchEvent)
      result.current.onTouchMove({ targetTouches: [{ clientX: 100 }] } as React.TouchEvent)
      result.current.onTouchEnd()
    })

    expect(onSwipeRight).toHaveBeenCalled()
    expect(onSwipeLeft).not.toHaveBeenCalled()
  })

  it('should not call any callback if swipe is not long enough', () => {
    const onSwipeLeft = jest.fn()
    const onSwipeRight = jest.fn()
    const { result } = renderHook(() => useSwipeGesture({ onSwipeLeft, onSwipeRight }))

    act(() => {
      result.current.onTouchStart({ targetTouches: [{ clientX: 100 }] } as React.TouchEvent)
      result.current.onTouchMove({ targetTouches: [{ clientX: 80 }] } as React.TouchEvent)
      result.current.onTouchEnd()
    })

    expect(onSwipeLeft).not.toHaveBeenCalled()
    expect(onSwipeRight).not.toHaveBeenCalled()
  })
})

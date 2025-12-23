import { useRef } from 'react'

interface SwipeInput {
  onSwipeLeft: () => void
  onSwipeRight: () => void
}

interface SwipeOutput {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

const useSwipeGesture = (input: SwipeInput): SwipeOutput => {
  const touchStartRef = useRef(0)
  const touchEndRef = useRef(0)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    // Reset touchEndRef on new touch start
    touchEndRef.current = e.targetTouches[0].clientX
    touchStartRef.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    const touchStart = touchStartRef.current
    const touchEnd = touchEndRef.current

    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      input.onSwipeLeft()
    }
    if (isRightSwipe) {
      input.onSwipeRight()
    }

    // Reset refs
    touchStartRef.current = 0
    touchEndRef.current = 0
  }

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}

export default useSwipeGesture

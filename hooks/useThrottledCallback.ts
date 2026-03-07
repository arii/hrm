import { useRef, useEffect, useMemo } from 'react'
import throttle from 'lodash.throttle'

export function useThrottledCallback<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => any,
>(callback: T, delay: number) {
  const callbackRef = useRef(callback)
  useEffect(() => {
    callbackRef.current = callback
  })

  return useMemo(() => {
    // We intentionally wrap the callback to access the latest ref value
    // when it's eventually called. It will only be called in event handlers.
    // eslint-disable-next-line react-hooks/refs
    return throttle((...args: Parameters<T>) => {
      const currentCallback = callbackRef.current
      return currentCallback(...args)
    }, delay)
  }, [delay])
}

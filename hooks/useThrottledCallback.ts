import { useLayoutEffect, useMemo, useRef, useEffect } from 'react'
import throttle from 'lodash.throttle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const callbackRef = useRef(callback)

  // Update the ref synchronously before render
  useLayoutEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const throttledFunction = useMemo(() => {
    const runCallback = (...args: Parameters<T>) => callbackRef.current(...args)
    // eslint-disable-next-line react-hooks/refs
    return throttle(runCallback, delay)
  }, [delay])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      throttledFunction.cancel()
    }
  }, [throttledFunction])

  return throttledFunction
}

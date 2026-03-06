import { useRef, useEffect, useMemo } from 'react'
import throttle from 'lodash.throttle'

export function useThrottledCallback<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const callbackRef = useRef(callback)
  useEffect(() => { callbackRef.current = callback })
  return useMemo(() => throttle((...args: Parameters<T>) => callbackRef.current(...args), delay), [delay])
}

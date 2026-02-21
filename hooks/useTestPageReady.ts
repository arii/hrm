'use client'

import { useEffect, useState } from 'react'

/**
 * Custom hook to signal that a page is ready for E2E or Visual Regression Testing.
 * It sets a global flag, dispatches a custom event, and returns a state variable
 * that can be used to set a `data-ready` attribute on the page container.
 *
 * @param {boolean} manualTrigger - If true, the hook will wait for this to be true before signaling readiness.
 * @returns {boolean} isReady - True if the page has completed initial client-side mounting (or manual trigger).
 */
export function useTestPageReady(manualTrigger: boolean = true) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && manualTrigger) {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true)
    }
  }, [manualTrigger])

  return isReady
}

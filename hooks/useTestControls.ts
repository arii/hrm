import { useEffect } from 'react'

export const useTestControls = (controls: Record<string, unknown>) => {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      (process.env.NEXT_PUBLIC_TESTING !== 'true' &&
        !(window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
    )
      return

    // Merge new controls
    window.TEST_CONTROLS = { ...window.TEST_CONTROLS, ...controls }

    return () => {
      // Cleanup specific keys
      if (window.TEST_CONTROLS) {
        Object.keys(controls).forEach((key) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((window.TEST_CONTROLS as any)[key] === controls[key]) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (window.TEST_CONTROLS as any)[key]
          }
        })
      }
    }
  }, [controls]) // Re-run if controls identity changes
}

'use client'

import { createContext, useCallback, Dispatch, SetStateAction } from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

export interface TestControls {
  setStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomStatusMessage: Dispatch<SetStateAction<string | null>>
}

export interface BluetoothTestContextType {
  registerControls: (controls: TestControls) => () => void
}

export const BluetoothTestContext = createContext<BluetoothTestContextType | null>(
  null
)

export function BluetoothTestProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const registerControls = useCallback((controls: TestControls) => {
    // Only expose to window in test environment
    if (
      typeof window !== 'undefined' &&
      (process.env.NEXT_PUBLIC_TESTING === 'true' ||
        (window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
    ) {
      window.TEST_CONTROLS = {
        ...window.TEST_CONTROLS,
        setHrmStatus: controls.setStatus,
        setCustomHrmStatusMessage: controls.setCustomStatusMessage,
      }
    }

    return () => {
      if (
        typeof window !== 'undefined' &&
        (process.env.NEXT_PUBLIC_TESTING === 'true' ||
          (window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
      ) {
        // Only delete if they are still the same functions we set
        if (window.TEST_CONTROLS?.setHrmStatus === controls.setStatus) {
          delete window.TEST_CONTROLS.setHrmStatus
        }
        if (
          window.TEST_CONTROLS?.setCustomHrmStatusMessage ===
          controls.setCustomStatusMessage
        ) {
          delete window.TEST_CONTROLS.setCustomHrmStatusMessage
        }
      }
    }
  }, [])

  return (
    <BluetoothTestContext.Provider value={{ registerControls }}>
      {children}
    </BluetoothTestContext.Provider>
  )
}

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  Dispatch,
  SetStateAction,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

interface BluetoothTestControls {
  setHrmStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage: Dispatch<SetStateAction<string | null>>
}

interface BluetoothTestContextType {
  registerTestControls: (controls: BluetoothTestControls) => void
}

const BluetoothTestContext = createContext<BluetoothTestContextType | null>(null)

export const BluetoothTestProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const controlsRef = useRef<BluetoothTestControls | null>(null)

  const registerTestControls = useCallback(
    (controls: BluetoothTestControls) => {
      controlsRef.current = controls

      if (
        typeof window !== 'undefined' &&
        (process.env.NEXT_PUBLIC_TESTING === 'true' ||
          (window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
      ) {
        window.TEST_CONTROLS = {
          ...window.TEST_CONTROLS,
          ...controls,
        }
      }
    },
    []
  )

  const value = useMemo(
    () => ({ registerTestControls }),
    [registerTestControls]
  )

  return (
    <BluetoothTestContext.Provider value={value}>
      {children}
    </BluetoothTestContext.Provider>
  )
}

/**
 * Custom hook to register test controls if the BluetoothTestProvider is present.
 * This decouples the test logic from the production hook.
 */
export const useBluetoothTestControls = (controls: BluetoothTestControls) => {
  const context = useContext(BluetoothTestContext)

  useEffect(() => {
    if (context) {
      context.registerTestControls(controls)
    }

    return () => {
      // Cleanup: Remove the specific controls from window.TEST_CONTROLS?
      if (
        context &&
        typeof window !== 'undefined' &&
        (process.env.NEXT_PUBLIC_TESTING === 'true' ||
          (window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
      ) {
        if (window.TEST_CONTROLS?.setHrmStatus === controls.setHrmStatus) {
          delete window.TEST_CONTROLS.setHrmStatus
        }
        if (
          window.TEST_CONTROLS?.setCustomHrmStatusMessage ===
          controls.setCustomHrmStatusMessage
        ) {
          delete window.TEST_CONTROLS.setCustomHrmStatusMessage
        }
      }
    }
  }, [context, controls.setHrmStatus, controls.setCustomHrmStatusMessage])
}

'use client'

import {
  createContext,
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

interface BluetoothTestControls {
  setHrmStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage: Dispatch<SetStateAction<string | null>>
}

interface BluetoothTestContextType {
  registerTestControls: (controls: BluetoothTestControls) => void
}

const BluetoothTestContext = createContext<BluetoothTestContextType | null>(
  null
)

export const BluetoothTestProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const registerTestControls = (controls: BluetoothTestControls) => {
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
  }

  return (
    <BluetoothTestContext.Provider value={{ registerTestControls }}>
      {children}
    </BluetoothTestContext.Provider>
  )
}

export const useBluetoothTestControls = (controls: BluetoothTestControls) => {
  const context = useContext(BluetoothTestContext)
  const savedControls = useRef(controls)

  useEffect(() => {
    savedControls.current = controls
  })

  useEffect(() => {
    if (context) {
      context.registerTestControls(savedControls.current)
    }

    return () => {
      if (
        context &&
        typeof window !== 'undefined' &&
        (process.env.NEXT_PUBLIC_TESTING === 'true' ||
          (window as unknown as { __TEST_MODE__?: boolean }).__TEST_MODE__)
      ) {
        if (
          window.TEST_CONTROLS?.setHrmStatus ===
          savedControls.current.setHrmStatus
        ) {
          delete window.TEST_CONTROLS.setHrmStatus
        }
        if (
          window.TEST_CONTROLS?.setCustomHrmStatusMessage ===
          savedControls.current.setCustomHrmStatusMessage
        ) {
          delete window.TEST_CONTROLS.setCustomHrmStatusMessage
        }
      }
    }
  }, [context])
}

'use client'
import { createContext, ReactNode, useContext } from 'react'
import useBluetoothHRM from '../hooks/useBluetoothHRM'

// Define the shape of the context data
export interface BluetoothHRMContextType {
  connectAndStream: (userName?: string, userAge?: number) => Promise<boolean>
  disconnect: () => void
  forgetDevice: () => void
  deviceStatus: string
  batteryLevel: number | null
  isConnected: boolean
  isSupported: boolean
  disconnectionReason: 'manual' | 'timeout' | 'signal_loss' | null
}

// Create the context with a null default value
export const BluetoothHRMContext = createContext<BluetoothHRMContextType | null>(
  null
)

// Create the provider component
export const BluetoothHRMProvider = ({ children }: { children: ReactNode }) => {
  const hrmState = useBluetoothHRM()

  return (
    <BluetoothHRMContext.Provider value={hrmState}>
      {children}
    </BluetoothHRMContext.Provider>
  )
}

// Create a custom hook for using the context
export const useBluetoothHRMContext = () => {
  const context = useContext(BluetoothHRMContext)
  if (!context) {
    throw new Error(
      'useBluetoothHRMContext must be used within a BluetoothHRMProvider'
    )
  }

  return context
}

'use client'
import { createContext, ReactNode, useContext } from 'react'
import useBluetoothHRM from '../hooks/useBluetoothHRM'

// Define the shape of the context data
export interface BluetoothHRMContextType {
  /**
   * Initiates a connection to a Bluetooth HRM device and starts streaming data.
   * @param userName The name of the user.
   * @param userAge The age of the user.
   * @returns A promise that resolves to true if the connection is successful, false otherwise.
   */
  connectAndStream: (userName?: string, userAge?: number) => Promise<boolean>
  /**
   * Disconnects from the currently connected Bluetooth HRM device.
   */
  disconnect: () => void
  /**
   * Forgets the currently saved Bluetooth HRM device.
   */
  forgetDevice: () => void
  /**
   * The current status of the Bluetooth device connection.
   */
  deviceStatus: string
  /**
   * The battery level of the connected device, or null if not available.
   */
  batteryLevel: number | null
  /**
   * A boolean indicating whether a device is currently connected.
   */
  isConnected: boolean
  /**
   * A boolean indicating whether Web Bluetooth is supported by the browser.
   */
  isSupported: boolean
  /**
   * The reason for the last disconnection, or null if not applicable.
   */
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
      'useBluetoothHRMContext must be used within a BluetoothHRMProvider. Check the component that is using it.'
    )
  }
  return context
}

// contexts/BluetoothHRMContext.tsx
'use client'

import { createContext, ReactNode, useContext } from 'react'
import useBluetoothHRM from '../hooks/useBluetoothHRM'

// The context simply exposes the return shape of the existing hook so we avoid prop drilling
// and can consume Bluetooth HRM connection/device status anywhere in the tree.
// If the hook signature changes, this context will automatically reflect it.
type BluetoothHRMContextType = ReturnType<typeof useBluetoothHRM>

const BluetoothHRMContext = createContext<BluetoothHRMContextType | undefined>(
  undefined
)

export const BluetoothHRMProvider = ({ children }: { children: ReactNode }) => {
  const hrm = useBluetoothHRM()
  return (
    <BluetoothHRMContext.Provider value={hrm}>
      {children}
    </BluetoothHRMContext.Provider>
  )
}

export const useBluetoothHRMContext = () => {
  const context = useContext(BluetoothHRMContext)
  if (context === undefined) {
    throw new Error(
      'useBluetoothHRMContext must be used within a BluetoothHRMProvider'
    )
  }
  return context
}

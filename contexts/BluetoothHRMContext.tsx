// contexts/BluetoothHRMContext.tsx
'use client'

import { createContext, useContext, ReactNode } from 'react'
import useBluetoothHRM from '../hooks/useBluetoothHRM'

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

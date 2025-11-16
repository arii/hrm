// contexts/BluetoothHRMContext.tsx
'use client'

import { createContext, useContext } from 'react'
import useBluetoothHRM from '../hooks/useBluetoothHRM'

// 1. Define the shape of the context data
// This creates a TypeScript type that mirrors the return value of `useBluetoothHRM`
type BluetoothHRMContextType = ReturnType<typeof useBluetoothHRM>

// 2. Create the context with a default value
// The context is created with `null` and cast to the desired type.
// This is a common pattern for contexts that will be provided by a component.
const BluetoothHRMContext = createContext<BluetoothHRMContextType | null>(
  null
)

// 3. Create a custom hook for easy consumption
// This hook simplifies accessing the context's value and ensures
// that components using it are wrapped in the provider.
export const useHRM = () => {
  const context = useContext(BluetoothHRMContext)
  if (!context) {
    throw new Error('useHRM must be used within a BluetoothHRMProvider')
  }
  return context
}

// 4. Create the Provider component
export const BluetoothHRMProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const hrmState = useBluetoothHRM()
  return (
    <BluetoothHRMContext.Provider value={hrmState}>
      {children}
    </BluetoothHRMContext.Provider>
  )
}

// 5. Export the context to be used by the provider
export default BluetoothHRMContext

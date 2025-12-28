'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import DeviceManagerService from '@/services/DeviceManagerService'

const BluetoothContext = createContext<DeviceManagerService | null>(null)

export const BluetoothProvider = ({ children }: { children: React.ReactNode }) => {
  // Instantiate once
  const [service] = useState(() => new DeviceManagerService())

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (service) {
        service.disconnect()
      }
    }
  }, [service])

  return (
    <BluetoothContext.Provider value={service}>
      {children}
    </BluetoothContext.Provider>
  )
}

export const useBluetoothService = () => {
  const service = useContext(BluetoothContext)
  if (!service) {
    throw new Error('useBluetoothService must be used within a BluetoothProvider')
  }
  return service
}

'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'

type SpotifyDevicesContextType = ReturnType<typeof useSpotifyDevices>

const SpotifyDevicesContext = createContext<SpotifyDevicesContextType | undefined>(
  undefined
)

export const SpotifyDevicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useSpotifyDevices()
  return (
    <SpotifyDevicesContext.Provider value={value}>
      {children}
    </SpotifyDevicesContext.Provider>
  )
}

export const useSharedSpotifyDevices = () => {
  const context = useContext(SpotifyDevicesContext)
  if (context === undefined) {
    throw new Error(
      'useSharedSpotifyDevices must be used within a SpotifyDevicesProvider'
    )
  }
  return context
}

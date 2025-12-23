'use client'

import { createContext, ReactNode, useContext } from 'react'
import {
  useSpotifyDevices,
  UseSpotifyDevicesReturn,
} from '@/hooks/useSpotifyDevices'

// 1. Create the Context with a default value
const SpotifyDevicesContext = createContext<
  UseSpotifyDevicesReturn | undefined
>(undefined)

// 2. Create a provider component
interface SpotifyDevicesProviderProps {
  children: ReactNode
}

export const SpotifyDevicesProvider = ({
  children,
}: SpotifyDevicesProviderProps) => {
  const spotifyDevicesState = useSpotifyDevices()

  return (
    <SpotifyDevicesContext.Provider value={spotifyDevicesState}>
      {children}
    </SpotifyDevicesContext.Provider>
  )
}

// 3. Create a custom hook for easy consumption
export const useSharedSpotifyDevices = () => {
  const context = useContext(SpotifyDevicesContext)
  if (context === undefined) {
    throw new Error(
      'useSharedSpotifyDevices must be used within a SpotifyDevicesProvider'
    )
  }
  return context
}

'use client'

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from 'react'
import { useLocalStorage } from 'react-use'

// Define the shape of the context state
interface SpotifyContextType {
  selectedDeviceId: string | undefined
  setSelectedDeviceId: Dispatch<SetStateAction<string | undefined>>
}

// Create the context with a default value
const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined)

// Create a provider component
interface SpotifyProviderProps {
  children: ReactNode
}

export const SpotifyProvider: React.FC<SpotifyProviderProps> = ({
  children,
}) => {
  const [storedDeviceId, setStoredDeviceId] = useLocalStorage<
    string | undefined
  >('spotify_last_device_id', undefined)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(
    storedDeviceId
  )

  // Update local storage when the device ID changes
  React.useEffect(() => {
    setStoredDeviceId(selectedDeviceId)
  }, [selectedDeviceId, setStoredDeviceId])

  return (
    <SpotifyContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </SpotifyContext.Provider>
  )
}

// Create a custom hook for using the context
export const useSpotify = (): SpotifyContextType => {
  const context = useContext(SpotifyContext)
  if (!context) {
    throw new Error('useSpotify must be used within a SpotifyProvider')
  }
  return context
}

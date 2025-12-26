// context/SpotifyContext.tsx
'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react'

interface SpotifyContextType {
  selectedDeviceId: string | null
  setSelectedDeviceId: (deviceId: string | null) => void
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined)

export const SpotifyProvider = ({ children }: { children: ReactNode }) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)

  return (
    <SpotifyContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </SpotifyContext.Provider>
  )
}

export const useSpotifyContext = () => {
  const context = useContext(SpotifyContext)
  if (context === undefined) {
    throw new Error('useSpotifyContext must be used within a SpotifyProvider')
  }
  return context
}

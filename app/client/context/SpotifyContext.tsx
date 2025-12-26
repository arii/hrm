'use client'
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SpotifyContextType {
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  return (
    <SpotifyContext.Provider value={{ selectedDeviceId, setSelectedDeviceId }}>
      {children}
    </SpotifyContext.Provider>
  );
}

export function useSpotifyDevice() {
  const context = useContext(SpotifyContext);
  if (!context) throw new Error('useSpotifyDevice must be used within SpotifyProvider');
  return context;
}

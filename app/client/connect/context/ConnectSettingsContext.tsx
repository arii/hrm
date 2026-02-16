'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useConnectSettings } from '../hooks/useConnectSettings'

type ConnectSettingsContextType = ReturnType<typeof useConnectSettings>

const ConnectSettingsContext = createContext<ConnectSettingsContextType | null>(
  null
)

export function ConnectSettingsProvider({ children }: { children: ReactNode }) {
  const settings = useConnectSettings()
  return (
    <ConnectSettingsContext.Provider value={settings}>
      {children}
    </ConnectSettingsContext.Provider>
  )
}

export function useConnectSettingsContext() {
  const context = useContext(ConnectSettingsContext)
  if (!context) {
    throw new Error(
      'useConnectSettingsContext must be used within a ConnectSettingsProvider'
    )
  }
  return context
}

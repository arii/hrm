// context/UserSettingsContext.tsx
'use client'
import React, { createContext, useContext, useEffect } from 'react'
import {
  useUserPreferences,
  UserPreferences,
} from '../hooks/useUserPreferences'
import { useWebSocket } from './WebSocketContext'
import { SetUnitSystemMessage } from '@/types/websocket'

type UserSettingsContextType = readonly [
  UserPreferences,
  (
    value: UserPreferences | ((val: UserPreferences) => UserPreferences)
  ) => void,
]

export const UserSettingsContext = createContext<
  UserSettingsContextType | undefined
>(undefined)

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const userPreferences = useUserPreferences()
  const { sendData, connectionStatus } = useWebSocket()
  const [prefs] = userPreferences

  useEffect(() => {
    if (connectionStatus === 'Connected') {
      const message: SetUnitSystemMessage = {
        type: 'SET_UNIT_SYSTEM',
        unitSystem: prefs.unitSystem,
      }
      sendData(message)
    }
  }, [prefs.unitSystem, connectionStatus, sendData])

  return (
    <UserSettingsContext.Provider value={userPreferences}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext)
  if (context === undefined) {
    throw new Error(
      'useUserSettings must be used within a UserSettingsProvider'
    )
  }
  return context
}

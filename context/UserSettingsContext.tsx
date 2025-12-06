// context/UserSettingsContext.tsx
'use client'
import { UserSettings } from '@/types'
import React, { createContext, useContext } from 'react'
import { useUserPreferences } from '../hooks/useUserPreferences'

type UserSettingsContextType = readonly [
  UserSettings,
  (value: UserSettings | ((val: UserSettings) => UserSettings)) => void,
]

export const UserSettingsContext = createContext<
  UserSettingsContextType | undefined
>(undefined)

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const userPreferences = useUserPreferences()

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

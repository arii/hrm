// context/UserSettingsContext.tsx
'use client'
import React, { createContext, useContext } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { MeasurementSystem, Gender } from '../types/core'

// Directly define the preferences interface and defaults here
export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string
  userName: string
  userAge: number | null
  userWeight: number | null // Note: userWeight is always stored in KG
  autoConnect: boolean
  gender: Gender
  unitSystem: MeasurementSystem
  maxHr: number | null
  restingHr: number | null
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: '',
  userAge: null,
  userWeight: null,
  autoConnect: false,
  gender: 'MALE',
  unitSystem: 'IMPERIAL',
  maxHr: null,
  restingHr: null,
}

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
  // Use the useLocalStorage hook directly within the provider
  const userPreferences = useLocalStorage<UserPreferences>(
    'user-prefs',
    DEFAULT_PREFERENCES
  )

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

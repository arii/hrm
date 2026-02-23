// context/UserSettingsContext.tsx
'use client'
import React, { createContext, useContext, useCallback } from 'react'
import usePersistentStorage from '../hooks/usePersistentStorage'
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
  userHeight: number | null // Note: userHeight is always stored in CM
  autoConnect: boolean
  gender: Gender
  unitSystem: MeasurementSystem
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
  userHeight: null,
  autoConnect: false,
  gender: 'FEMALE',
  unitSystem: 'IMPERIAL',
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
  const migrate = useCallback((stored: unknown): UserPreferences => {
    if (typeof stored !== 'object' || stored === null)
      return DEFAULT_PREFERENCES

    const storedRecord = stored as Record<string, unknown>
    const cleanStored = Object.keys(DEFAULT_PREFERENCES).reduce((acc, key) => {
      const k = key as keyof UserPreferences
      if (storedRecord[k] !== undefined && storedRecord[k] !== null) {
        acc[k] = storedRecord[
          k
        ] as unknown as UserPreferences[keyof UserPreferences]
      }
      return acc
    }, {} as Partial<UserPreferences>)

    return { ...DEFAULT_PREFERENCES, ...cleanStored }
  }, [])

  // Use the usePersistentStorage hook directly within the provider
  const userPreferences = usePersistentStorage<UserPreferences>(
    'user-prefs',
    DEFAULT_PREFERENCES,
    { migrate }
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

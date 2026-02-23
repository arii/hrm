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
    if (typeof stored !== 'object' || stored === null) {
      return DEFAULT_PREFERENCES
    }

    const storedObj = stored as Record<string, unknown>
    const result = { ...DEFAULT_PREFERENCES }

    // Use a type-safe approach to map stored values to the result object
    // only if they exist in the default schema.
    const schemaKeys = Object.keys(DEFAULT_PREFERENCES) as Array<
      keyof UserPreferences
    >
    schemaKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(storedObj, key)) {
        const val = storedObj[key]
        if (val !== undefined && val !== null) {
          /**
           * NOTE: The cast to 'never' on the left side or a generic type assertion
           * is required when dynamically assigning to a narrowed object key in TS.
           * This is safer than 'any' because it maintains context within the known
           * schema keys of UserPreferences.
           */
          ;(result as Record<keyof UserPreferences, unknown>)[key] = val
        }
      }
    })

    return result
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

'use client'
import React, { createContext, useContext, useEffect } from 'react'
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

export const DEFAULT_PREFERENCES: UserPreferences = {
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

export const migratePreferences = (stored: unknown): UserPreferences => {
  if (typeof stored !== 'object' || stored === null) return DEFAULT_PREFERENCES

  const storedRecord = stored as Record<string, unknown>
  const cleanStored = Object.keys(DEFAULT_PREFERENCES).reduce((acc, key) => {
    const k = key as keyof UserPreferences
    const storedVal = storedRecord[k]
    const defaultVal = DEFAULT_PREFERENCES[k]

    const isTypeMatch = typeof storedVal === typeof defaultVal
    // Fix: Allow number/string for nullable fields (like userAge, userWeight)
    const isNullableField =
      defaultVal === null &&
      (typeof storedVal === 'number' || typeof storedVal === 'string')

    if (
      storedVal !== undefined &&
      storedVal !== null &&
      (isTypeMatch || isNullableField)
    ) {
      ;(acc as Record<string, unknown>)[k] = storedVal
    }
    return acc
  }, {} as Partial<UserPreferences>)

  return { ...DEFAULT_PREFERENCES, ...cleanStored }
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
  // Use the usePersistentStorage hook directly within the provider
  const [userPreferences, setUserPreferences] =
    usePersistentStorage<UserPreferences>('user-prefs', DEFAULT_PREFERENCES, {
      enableCookieFallback: true,
    })

  useEffect(() => {
    const migrated = migratePreferences(userPreferences)
    // Use JSON.stringify for comparison to avoid deep equal dependency
    if (JSON.stringify(migrated) !== JSON.stringify(userPreferences)) {
      setUserPreferences(migrated)
    }
  }, [userPreferences, setUserPreferences])

  return (
    <UserSettingsContext.Provider
      value={[userPreferences, setUserPreferences] as const}
    >
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

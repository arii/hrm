// context/UserSettingsContext.tsx
'use client'
import React, { createContext, useContext } from 'react'
import usePersistentStorage from '../hooks/usePersistentStorage'
import { MeasurementSystem, Gender } from '../types/core'

// Directly define the preferences interface and defaults here
export type HrZoneMethod = 'MAX_HR' | 'HRR'

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
  hrZoneMethod: HrZoneMethod
  maxHrOverride: number | null
  restingHr: number | null
  customZoneThresholds: Record<string, number>
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
  gender: 'FEMALE',
  unitSystem: 'IMPERIAL',
  hrZoneMethod: 'MAX_HR',
  maxHrOverride: null,
  restingHr: null,
  customZoneThresholds: {
    ZONE_1: 50,
    ZONE_2: 60,
    ZONE_3: 70,
    ZONE_4: 80,
    ZONE_5: 90,
    ZONE_6: 95,
  },
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
  const userPreferences = usePersistentStorage<UserPreferences>(
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

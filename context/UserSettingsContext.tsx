'use client'
import React, { createContext, useContext, useEffect } from 'react'
import { z } from 'zod'
import usePersistentStorage from '../hooks/usePersistentStorage'
import { MeasurementSystem, Gender } from '../types/core'
import { GenderSchema, MeasurementSystemSchema } from '@/lib/validation/schemas'

// Directly define the preferences interface and defaults here
export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string
  userName: string
  userAge: number | null
  userWeightKg: number | null
  userHeightCm: number | null
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
  userWeightKg: null,
  userHeightCm: null,
  autoConnect: false,
  gender: 'FEMALE',
  unitSystem: 'IMPERIAL',
}

const PreferencesMigrationSchema = z
  .object({
    theme: z.enum(['dark', 'light']).catch(DEFAULT_PREFERENCES.theme),
    volumeLevel: z.number().catch(DEFAULT_PREFERENCES.volumeLevel),
    defaultWorkDuration: z
      .number()
      .catch(DEFAULT_PREFERENCES.defaultWorkDuration),
    defaultRestDuration: z
      .number()
      .catch(DEFAULT_PREFERENCES.defaultRestDuration),
    favoritePlaylist: z.string().catch(DEFAULT_PREFERENCES.favoritePlaylist),
    userName: z.string().catch(DEFAULT_PREFERENCES.userName),
    userAge: z.number().nullable().catch(DEFAULT_PREFERENCES.userAge),
    userWeight: z.number().nullable().optional(), // Legacy
    userWeightKg: z.number().nullable().optional(),
    userHeight: z.number().nullable().optional(), // Legacy
    userHeightCm: z.number().nullable().optional(),
    autoConnect: z.boolean().catch(DEFAULT_PREFERENCES.autoConnect),
    gender: GenderSchema.catch(DEFAULT_PREFERENCES.gender),
    unitSystem: MeasurementSystemSchema.catch(DEFAULT_PREFERENCES.unitSystem),
  })
  .transform((data) => ({
    ...data,
    userWeightKg: data.userWeightKg ?? data.userWeight ?? null,
    userHeightCm: data.userHeightCm ?? data.userHeight ?? null,
  }))
  .transform((data) => {
    // Remove legacy fields from final object
    const {
      userWeight: _userWeight,
      userHeight: _userHeight,
      ...rest
    } = data as Record<string, unknown>
    return rest as unknown as UserPreferences
  })

export const migratePreferences = (stored: unknown): UserPreferences => {
  const result = PreferencesMigrationSchema.safeParse(stored)
  if (!result.success) {
    return DEFAULT_PREFERENCES
  }
  return result.data
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

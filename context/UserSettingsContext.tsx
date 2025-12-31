// context/UserSettingsContext.tsx
'use client'
import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  ReactNode,
} from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { useUserPhysicalProfile } from './UserPhysicalProfileContext'
import { UserPhysicalProfile } from '@/types/core'

// Define the shape of user preferences, excluding biometric data
export interface UserPreferences {
  theme: 'dark' | 'light'
  volumeLevel: number
  defaultWorkDuration: number
  defaultRestDuration: number
  favoritePlaylist: string
  userName: string
  autoConnect: boolean
}

// Combine preferences with the physical profile for a complete view
type CombinedUserSettings = UserPreferences &
  Omit<UserPhysicalProfile, 'userId'>

interface UserSettingsContextType {
  settings: CombinedUserSettings
  updateSettings: (updates: Partial<CombinedUserSettings>) => void
  isLoading: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  volumeLevel: 0.5,
  defaultWorkDuration: 20 * 60, // 20 minutes
  defaultRestDuration: 10 * 60, // 10 minutes
  favoritePlaylist: '',
  userName: 'New User',
  autoConnect: false,
}

export const UserSettingsContext = createContext<
  UserSettingsContextType | undefined
>(undefined)

export const UserSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [preferences, setPreferences] = useLocalStorage<UserPreferences>(
    'hrm-user-preferences',
    DEFAULT_PREFERENCES
  )
  const { profile, updateProfile, isLoading } = useUserPhysicalProfile()

  const updateSettings = useCallback(
    (updates: Partial<CombinedUserSettings>) => {
      const prefKeys = Object.keys(DEFAULT_PREFERENCES)
      const profileKeys = ['age', 'weight', 'gender', 'unitSystem', 'maxHr']

      const prefsToUpdate: Partial<UserPreferences> = {}
      const profileToUpdate: Partial<UserPhysicalProfile> = {}

      Object.entries(updates).forEach(([key, value]) => {
        if (prefKeys.includes(key)) {
          ;(prefsToUpdate as any)[key] = value
        } else if (profileKeys.includes(key)) {
          ;(profileToUpdate as any)[key] = value
        } else if (key === 'userName') {
          ;(prefsToUpdate as any)[key] = value
        }
      })

      if (Object.keys(prefsToUpdate).length > 0) {
        setPreferences((prev) => ({ ...prev, ...prefsToUpdate }))
      }
      if (Object.keys(profileToUpdate).length > 0) {
        updateProfile(profileToUpdate)
      }
    },
    [setPreferences, updateProfile]
  )

  const settings = useMemo(
    () => ({
      ...preferences,
      ...profile,
    }),
    [preferences, profile]
  )

  const value = useMemo(
    () => ({
      settings,
      updateSettings,
      isLoading,
    }),
    [settings, updateSettings, isLoading]
  )

  return (
    <UserSettingsContext.Provider value={value}>
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

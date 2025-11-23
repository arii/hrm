'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { UserSettings } from '@/types'

interface UserSettingsContextType {
  userSettings: UserSettings
  updateUserSettings: (newSettings: Partial<UserSettings>) => void
  isInitialized: boolean
}

const defaultSettings: UserSettings = {
  userName: '',
  userAge: null,
  maxHr: null,
  restingHr: null,
  deviceId: null,
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(
  undefined
)

export const UserSettingsProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [userSettings, setUserSettings] =
    useState<UserSettings>(defaultSettings)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem('userSettings')
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings)
        const newSettings = { ...defaultSettings, ...parsedSettings }
        setUserSettings(newSettings)
      }
    } catch (error) {
      console.error('Failed to load user settings from localStorage:', error)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  const updateUserSettings = useCallback(
    (newSettings: Partial<UserSettings>) => {
      setUserSettings((prevSettings) => {
        const updatedSettings = { ...prevSettings, ...newSettings }
        try {
          localStorage.setItem('userSettings', JSON.stringify(updatedSettings))
        } catch (error) {
          console.error(
            'Failed to save user settings to localStorage:',
            error
          )
        }
        return updatedSettings
      })
    },
    []
  )

  return (
    <UserSettingsContext.Provider
      value={{ userSettings, updateUserSettings, isInitialized }}
    >
      {children}
    </UserSettingsContext.Provider>
  )
}

export const useUserSettings = (): UserSettingsContextType => {
  const context = useContext(UserSettingsContext)
  if (context === undefined) {
    throw new Error(
      'useUserSettings must be used within a UserSettingsProvider'
    )
  }
  return context
}

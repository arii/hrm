// hooks/useUserSettings.ts
import { useContext } from 'react'
import {
  UserSettingsContext,
  UserSettingsContextType,
} from '@/context/UserSettingsContext'

export const useUserSettings = (): UserSettingsContextType => {
  const context = useContext(UserSettingsContext)
  if (!context) {
    throw new Error(
      'useUserSettings must be used within a UserSettingsProvider'
    )
  }
  return context
}

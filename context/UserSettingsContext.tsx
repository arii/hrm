'use client'
import { createContext, ReactNode, useContext, useState } from 'react'

interface UserSettings {
  userAge: number
  userWeight: number // in kg
  setUserAge: (age: number) => void
  setUserWeight: (weight: number) => void
}

const UserSettingsContext = createContext<UserSettings | undefined>(undefined)

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  // Default values. In a full implementation, these might come from user profiles or local storage.
  const [userAge, setUserAge] = useState(30)
  const [userWeight, setUserWeight] = useState(70) // kg

  const value = { userAge, userWeight, setUserAge, setUserWeight }

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext)
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider')
  }
  return context
}

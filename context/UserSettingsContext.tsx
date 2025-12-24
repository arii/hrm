// File: context/UserSettingsContext.tsx
'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { UnitSystem } from '../utils/units'

interface UserSettingsContextType {
  unitSystem: UnitSystem
  setUnitSystem: (unitSystem: UnitSystem) => void
  userName: string
  setUserName: (userName: string) => void
  userAge: number
  setUserAge: (userAge: number) => void
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(
  undefined
)

export const UserSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => {
    if (typeof window !== 'undefined') {
      const storedUnitSystem = localStorage.getItem('unitSystem') as UnitSystem | null
      if (storedUnitSystem) {
        return storedUnitSystem
      }
    }
    return 'imperial'
  })
  const [userName, setUserName] = useState<string>('New User')
  const [userAge, setUserAge] = useState<number>(30)

  const handleSetUnitSystem = (newUnitSystem: UnitSystem) => {
    setUnitSystem(newUnitSystem)
    localStorage.setItem('unitSystem', newUnitSystem)
  }

  return (
    <UserSettingsContext.Provider
      value={{
        unitSystem,
        setUnitSystem: handleSetUnitSystem,
        userName,
        setUserName,
        userAge,
        setUserAge,
      }}
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

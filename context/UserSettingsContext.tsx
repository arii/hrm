// File: context/UserSettingsContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react'
import { UnitSystem } from '@/types/core'
import {
  DEFAULT_USER_NAME,
  DEFAULT_USER_AGE,
  DEFAULT_USER_WEIGHT_KG,
} from '@/constants/index'
import { lbsToKg, kgToLbs } from '@/utils/units'

/**
 * Defines the shape of the user settings context.
 */
interface UserSettingsContextType {
  /** The current unit system ('METRIC' or 'IMPERIAL'). */
  unitSystem: UnitSystem
  /** Function to update the unit system. */
  setUnitSystem: (system: UnitSystem) => void
  /** The user's name. */
  userName: string
  /** Function to update the user's name. */
  setUserName: (name: string) => void
  /** The user's age. */
  userAge: number
  /** Function to update the user's age. */
  setUserAge: (age: number) => void
  /** The user's weight in the currently selected unit system (kg or lbs). */
  userWeight: number
  /** Function to update the user's weight (expects value in the current unit system). */
  setUserWeight: (weight: number) => void
  /** The user's weight, always in kilograms, for consistent backend calculations. */
  weightInKg: number
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(
  undefined
)

/**
 * Props for the UserSettingsProvider component.
 */
interface UserSettingsProviderProps {
  children: ReactNode
}

// Helper to safely get items from localStorage
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null
  }
  return localStorage.getItem(key)
}

// Helper to safely set items in localStorage
const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value)
  }
}

/**
 * Provides user settings state to its children components.
 * It manages the unit system, user profile details (name, age), and weight,
 * persisting the unit system choice to localStorage.
 *
 * @param {UserSettingsProviderProps} props The component props.
 * @returns {JSX.Element} The provider component.
 */
export const UserSettingsProvider = ({
  children,
}: UserSettingsProviderProps): JSX.Element => {
  const [isMounted, setIsMounted] = useState(false)
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('METRIC')
  const [userName, setUserNameState] = useState<string>(DEFAULT_USER_NAME)
  const [userAge, setUserAgeState] = useState<number>(DEFAULT_USER_AGE)
  // Internal state for weight is always stored in kg for consistency.
  const [weightInKg, setWeightInKg] = useState<number>(DEFAULT_USER_WEIGHT_KG)

  useEffect(() => {
    setIsMounted(true)
    const storedUnitSystem = getLocalStorageItem('unitSystem') as UnitSystem
    if (storedUnitSystem && ['METRIC', 'IMPERIAL'].includes(storedUnitSystem)) {
      setUnitSystemState(storedUnitSystem)
    }

    const storedUserName = getLocalStorageItem('userName')
    if (storedUserName) setUserNameState(storedUserName)

    const storedUserAge = getLocalStorageItem('userAge')
    if (storedUserAge) setUserAgeState(Number(storedUserAge))

    const storedWeightInKg = getLocalStorageItem('userWeightKg')
    if (storedWeightInKg) setWeightInKg(Number(storedWeightInKg))
  }, [])

  const setUnitSystem = useCallback((system: UnitSystem) => {
    setLocalStorageItem('unitSystem', system)
    setUnitSystemState(system)
  }, [])

  const setUserName = useCallback((name: string) => {
    setLocalStorageItem('userName', name)
    setUserNameState(name)
  }, [])

  const setUserAge = useCallback((age: number) => {
    setLocalStorageItem('userAge', age.toString())
    setUserAgeState(age)
  }, [])

  /**
   * Sets the user's weight. The input value is expected to be in the
   * currently active unit system. It's converted to kg for internal storage.
   */
  const setUserWeight = useCallback(
    (weight: number) => {
      const newWeightInKg =
        unitSystem === 'METRIC' ? weight : lbsToKg(weight)
      setLocalStorageItem('userWeightKg', newWeightInKg.toString())
      setWeightInKg(newWeightInKg)
    },
    [unitSystem]
  )

  // Derived from internal state, reflects the current unit system.
  const userWeight =
    unitSystem === 'IMPERIAL' ? kgToLbs(weightInKg) : weightInKg

  // Prevent rendering children until state has been hydrated from localStorage
  if (!isMounted) {
    return null
  }

  const value = {
    unitSystem,
    setUnitSystem,
    userName,
    setUserName,
    userAge,

  setUserAge,
    userWeight,
    setUserWeight,
    weightInKg,
  }

  return (
    <UserSettingsContext.Provider value={value}>
      {children}
    </UserSettingsContext.Provider>
  )
}

/**
 * Custom hook to access the user settings context.
 *
 * @throws {Error} If used outside of a UserSettingsProvider.
 * @returns {UserSettingsContextType} The user settings context.
 */
export const useUserSettings = (): UserSettingsContextType => {
  const context = useContext(UserSettingsContext)
  if (context === undefined) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider')
  }
  return context
}

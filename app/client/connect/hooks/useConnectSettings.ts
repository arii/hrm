import { useState, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { toKg, toDisplay } from '@/utils/units'
import { useHeightInput } from '@/hooks/useHeightInput'
import { MeasurementSystem } from '@/types/core'

/**
 * Custom hook to manage user settings and validation in the Connect page.
 * Extracts local state and validation logic from the main page component.
 */
export function useConnectSettings() {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [localDisplayWeight, setLocalDisplayWeight] = useState<string | null>(
    null
  )

  const displayWeight = useMemo(() => {
    if (localDisplayWeight !== null) {
      return localDisplayWeight
    }
    if (userWeight) {
      return toDisplay(userWeight, unitSystem).toString()
    }
    return ''
  }, [localDisplayWeight, userWeight, unitSystem])

  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput('175', unitSystem)

  const handleAgeBlur = () => {
    const error = validateAgeValue(String(userAge || ''))
    setAgeError(error)
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setLocalDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const valueToValidate = localDisplayWeight ?? displayWeight
    const error = validateWeightValue(valueToValidate, unitSystem)
    setWeightError(error)

    if (!error) {
      const numericValue = parseFloat(valueToValidate)
      if (!isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
      }
    }
    // Reset local state to show the canonical value from context
    setLocalDisplayWeight(null)
  }

  const setUserName = useCallback(
    (name: string) => setUserSettings((prev) => ({ ...prev, userName: name })),
    [setUserSettings]
  )

  const setUserAge = useCallback(
    (age: string) => {
      const ageNum = parseInt(age, 10)
      setUserSettings((prev) => ({
        ...prev,
        userAge: isNaN(ageNum) ? 0 : ageNum,
      }))
    },
    [setUserSettings]
  )

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      setLocalDisplayWeight(null)
    }
  }

  return {
    userSettings,
    setUserSettings,
    userName,
    setUserName,
    userAge,
    setUserAge,
    userWeight,
    gender,
    unitSystem,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    weightError,
    ageError,
    onAgeBlur: handleAgeBlur,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    heightError,
    handleUnitChange,
  }
}

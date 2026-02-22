import { useState, useMemo, useCallback } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useHeightInput } from './useHeightInput'
import { MeasurementSystem } from '@/types/core'
import { toKg, toDisplay } from '@/utils/units'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { UserProfileState } from '@/types/connect'

export const useConnectUserProfile = (): UserProfileState => {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [localDisplayWeight, setLocalDisplayWeight] = useState<string | null>(
    null
  )
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput(String(175), unitSystem)

  const displayWeight = useMemo(() => {
    if (localDisplayWeight !== null) {
      return localDisplayWeight
    }
    if (userWeight) {
      return toDisplay(userWeight, unitSystem).toString()
    }
    return ''
  }, [localDisplayWeight, userWeight, unitSystem])

  const handleAgeBlur = useCallback(() => {
    const error = validateAgeValue(String(userAge || ''))
    setAgeError(error)
  }, [userAge])

  const handleWeightChange = useCallback((newDisplayValue: string) => {
    setLocalDisplayWeight(newDisplayValue)
  }, [])

  const handleWeightBlur = useCallback(() => {
    const valueToValidate = localDisplayWeight ?? displayWeight
    const error = validateWeightValue(valueToValidate, unitSystem)
    setWeightError(error)

    if (!error) {
      const numericValue = parseFloat(valueToValidate)
      if (!isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
      }
      setLocalDisplayWeight(null)
    }
  }, [localDisplayWeight, displayWeight, unitSystem, setUserSettings])

  const handleUnitChange = useCallback(
    (newUnit: MeasurementSystem) => {
      if (newUnit && newUnit !== unitSystem) {
        setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
        setLocalDisplayWeight(null)
      }
    },
    [unitSystem, setUserSettings]
  )

  return {
    data: {
      userName,
      userAge: String(userAge || ''),
      userHeight: displayHeight,
      userWeight: displayWeight || '',
      gender,
      unitSystem,
    },
    errors: {
      ageError,
      heightError,
      weightError,
    },
    handlers: {
      setUserName: (name) =>
        setUserSettings((prev) => ({ ...prev, userName: name })),
      setUserAge: (age) =>
        setUserSettings((prev) => ({ ...prev, userAge: Number(age) })),
      onAgeBlur: handleAgeBlur,
      setUserHeight: handleHeightChange,
      onHeightBlur: handleHeightBlur,
      setUserWeight: handleWeightChange,
      onWeightBlur: handleWeightBlur,
      setGender: (g) => setUserSettings((prev) => ({ ...prev, gender: g })),
      onUnitChange: handleUnitChange,
    },
  }
}

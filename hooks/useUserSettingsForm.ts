import { useState, useMemo } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import { toKg, toDisplay } from '@/utils/units'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { MeasurementSystem, Gender } from '@/types/core'

export const useUserSettingsForm = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [localAge, setLocalAge] = useState<string | null>(null)
  const [localWeight, setLocalWeight] = useState<string | null>(null)
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const displayAge = useMemo(() => {
    if (localAge !== null) {
      return localAge
    }
    return userAge ? String(userAge) : ''
  }, [localAge, userAge])

  const displayWeight = useMemo(() => {
    if (localWeight !== null) {
      return localWeight
    }
    return userWeight ? toDisplay(userWeight, unitSystem).toString() : ''
  }, [localWeight, userWeight, unitSystem])

  const handleNameChange = (newName: string) => {
    setUserSettings((prev) => ({ ...prev, userName: newName }))
  }

  const handleAgeChange = (newDisplayValue: string) => {
    setLocalAge(newDisplayValue)
    const error = validateAgeValue(newDisplayValue)
    setAgeError(error)
  }

  const handleAgeBlur = () => {
    const error = validateAgeValue(displayAge)
    setAgeError(error)

    if (!error) {
      const numericValue = parseInt(displayAge, 10)
      if (!isNaN(numericValue) && numericValue > 0) {
        setUserSettings((prev) => ({ ...prev, userAge: numericValue }))
      }
      setLocalAge(null) // Reset local state on blur
    }
  }

  const handleWeightChange = (newDisplayValue: string) => {
    setLocalWeight(newDisplayValue)
    const error = validateWeightValue(newDisplayValue, unitSystem)
    setWeightError(error)
  }

  const handleWeightBlur = () => {
    const error = validateWeightValue(displayWeight, unitSystem)
    setWeightError(error)

    if (!error) {
      const numericValue = parseFloat(displayWeight)
      if (!isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
      }
      setLocalWeight(null) // Reset local state on blur
    }
  }

  const handleGenderChange = (newGender: Gender) => {
    setUserSettings((prev) => ({ ...prev, gender: newGender }))
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      setLocalWeight(null)
    }
  }

  return {
    userName,
    displayAge,
    displayWeight,
    gender,
    unitSystem,
    ageError,
    weightError,
    handleNameChange,
    handleAgeChange,
    handleAgeBlur,
    handleWeightChange,
    handleWeightBlur,
    handleGenderChange,
    handleUnitChange,
  }
}

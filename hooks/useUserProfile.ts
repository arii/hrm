// hooks/useUserProfile.ts
'use client'

import { useState, useMemo } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { MeasurementSystem } from '@/types'
import { toKg, toDisplay } from '../utils/units'

export function useUserProfile() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [displayWeightInput, setDisplayWeightInput] = useState<string | null>(
    null
  )

  const displayWeight = useMemo(() => {
    if (displayWeightInput !== null) {
      return displayWeightInput
    }
    const numericWeightInKg = parseFloat(weightInKg)
    if (!isNaN(numericWeightInKg)) {
      const displayValue = toDisplay(numericWeightInKg, unitSystem)
      return displayValue.toString()
    }
    return ''
  }, [displayWeightInput, weightInKg, unitSystem])

  const handleWeightChange = (newDisplayValue: string) => {
    setDisplayWeightInput(newDisplayValue)
  }

  const handleWeightBlur = () => {
    if (displayWeightInput === null) return

    const numericValue = parseFloat(displayWeightInput)
    if (!isNaN(numericValue) && numericValue > 0) {
      const newKgValue = toKg(numericValue, unitSystem)
      setWeightInKg(newKgValue.toFixed(2))
    }
    setDisplayWeightInput(null) // Reset to derive from localStorage
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit)
      setDisplayWeightInput(null) // Recalculate display weight
    }
  }

  return {
    userName,
    setUserName,
    userAge,
    setUserAge,
    userHeight,
    setUserHeight,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    gender,
    setGender,
    unitSystem,
    handleUnitChange,
  }
}

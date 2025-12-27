// hooks/useUserProfile.ts
'use client'

import { useState, useMemo } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { MeasurementSystem } from '@/types'
import { toKg, toDisplay } from '../utils/units'
import { toCm, toDisplayHeight } from '../utils/units'

export function useUserProfile() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [heightInCm, setHeightInCm] = useLocalStorage('hrm-user-height', '180') // Always CM
  const [weightInKg, setWeightInKg] = useLocalStorage('hrm-user-weight', '70') // Always KG
  const [gender, setGender] = useLocalStorage<'MALE' | 'FEMALE'>(
    'hrm-user-gender',
    'MALE'
  )
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  const [displayWeightInput, setDisplayWeightInput] = useState<string | null>(null)
  const [displayHeightInput, setDisplayHeightInput] = useState<string | null>(null)

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

  const displayHeight = useMemo(() => {
    if (displayHeightInput !== null) {
      return displayHeightInput
    }
    const numericHeightInCm = parseFloat(heightInCm)
    if (!isNaN(numericHeightInCm)) {
      const displayValue = toDisplayHeight(numericHeightInCm, unitSystem)
      return displayValue.toString()
    }
    return ''
  }, [displayHeightInput, heightInCm, unitSystem])

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

  const handleHeightChange = (newDisplayValue: string) => {
    setDisplayHeightInput(newDisplayValue)
  }

  const handleHeightBlur = () => {
    if (displayHeightInput === null) return

    const numericValue = parseFloat(displayHeightInput)
    if (!isNaN(numericValue) && numericValue > 0) {
      const newCmValue = toCm(numericValue, unitSystem)
      setHeightInCm(newCmValue.toFixed(2))
    }
    setDisplayHeightInput(null) // Reset to derive from localStorage
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit)
      setDisplayWeightInput(null) // Recalculate display weight
      setDisplayHeightInput(null) // Recalculate display height
    }
  }

  return {
    userName,
    setUserName,
    userAge,
    setUserAge,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    gender,
    setGender,
    unitSystem,
    handleUnitChange,
  }
}

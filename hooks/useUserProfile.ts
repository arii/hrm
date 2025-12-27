// hooks/useUserProfile.ts
'use client'

import { useState, useEffect } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import { MeasurementSystem } from '../types'
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

  const [displayWeight, setDisplayWeight] = useState('')

  useEffect(() => {
    const numericWeightInKg = parseFloat(weightInKg)
    if (!isNaN(numericWeightInKg)) {
      const displayValue = toDisplay(numericWeightInKg, unitSystem)
      setDisplayWeight(displayValue.toString())
    }
  }, [weightInKg, unitSystem])

  const handleWeightChange = (newDisplayValue: string) => {
    setDisplayWeight(newDisplayValue)
  }

  const handleWeightBlur = () => {
    const numericValue = parseFloat(displayWeight)
    if (!isNaN(numericValue) && numericValue > 0) {
      const newKgValue = toKg(numericValue, unitSystem)
      setWeightInKg(newKgValue.toFixed(2))
    }
  }

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit)
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

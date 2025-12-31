import { useState, useMemo, useEffect } from 'react'
import { MeasurementSystem } from '../types'
import { cmToFeetAndInches, feetAndInchesToCm } from '../utils/units'
import { validateHeightValue } from '../app/client/connect/validation'
import useLocalStorage from './useLocalStorage'

interface HeightState {
  cm: string
  feet: string
  inches: string
}

export const useHeightInput = (
  initialCm: string,
  unitSystem: MeasurementSystem
) => {
  const [cmValue, setCmValue] = useLocalStorage('hrm-user-height', initialCm)
  const [displayHeight, setDisplayHeight] = useState<HeightState>({
    cm: '',
    feet: '',
    inches: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const numericHeight = parseFloat(cmValue)
    if (isNaN(numericHeight)) {
      setDisplayHeight({ cm: '', feet: '', inches: '' })
      return
    }

    if (unitSystem === 'METRIC') {
      setDisplayHeight({
        cm: String(Math.round(numericHeight)),
        feet: '',
        inches: '',
      })
    } else {
      const { feet, inches } = cmToFeetAndInches(numericHeight)
      setDisplayHeight({ cm: '', feet: String(feet), inches: String(inches) })
    }
  }, [cmValue, unitSystem])

  const updateHeight = (newDisplayValue: Partial<HeightState>) => {
    setDisplayHeight((prev) => ({
      ...prev,
      ...newDisplayValue,
    }))
  }

  const commitHeight = () => {
    let newCmValue = 0
    if (unitSystem === 'METRIC') {
      newCmValue = parseFloat(displayHeight.cm)
    } else {
      const feet = parseFloat(displayHeight.feet)
      const inchesStr = displayHeight.inches.trim()
      const inches = inchesStr === '' ? 0 : parseFloat(displayHeight.inches)
      if (!isNaN(feet) || !isNaN(inches)) {
        newCmValue = feetAndInchesToCm(feet || 0, inches || 0)
      }
    }

    const validationError = validateHeightValue(newCmValue, unitSystem)
    setError(validationError)

    if (!validationError && newCmValue > 0) {
      setCmValue(newCmValue.toFixed(2))
    }
  }

  return {
    displayHeight,
    updateHeight,
    commitHeight,
    error,
    setError, // Expose setter if needed for manual clear
  }
}

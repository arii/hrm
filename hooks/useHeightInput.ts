import { useState, useMemo } from 'react'
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
  const [transientState, setTransientState] = useState<HeightState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const derivedHeight = useMemo(() => {
    const numericHeight = parseFloat(cmValue)
    const derived: HeightState = { cm: '', feet: '', inches: '' }

    if (!isNaN(numericHeight)) {
      if (unitSystem === 'METRIC') {
        derived.cm = String(Math.round(numericHeight))
      } else {
        const { feet, inches } = cmToFeetAndInches(numericHeight)
        derived.feet = String(feet)
        derived.inches = String(inches)
      }
    }
    return derived
  }, [cmValue, unitSystem])

  const displayHeight = transientState ?? derivedHeight

  const updateHeight = (newDisplayValue: Partial<HeightState>) => {
    setTransientState((prev) => ({
      ...(prev ?? derivedHeight),
      ...newDisplayValue,
    }))
  }

  const commitHeight = () => {
    if (transientState === null) return // Nothing to commit

    let newCmValue = 0
    const current = transientState

    if (unitSystem === 'METRIC') {
      newCmValue = parseFloat(current.cm)
    } else {
      const feet = parseFloat(current.feet)
      const inchesStr = current.inches.trim()
      const inches = inchesStr === '' ? 0 : parseFloat(current.inches)

      if (!isNaN(feet) || !isNaN(inches)) {
        newCmValue = feetAndInchesToCm(feet || 0, inches || 0)
      }
    }

    const validationError = validateHeightValue(newCmValue, unitSystem)
    setError(validationError)

    if (!validationError && newCmValue > 0) {
      setCmValue(newCmValue.toFixed(2))
    }
    setTransientState(null)
  }

  return {
    displayHeight,
    updateHeight,
    commitHeight,
    error,
    setError, // Expose setter if needed for manual clear
  }
}

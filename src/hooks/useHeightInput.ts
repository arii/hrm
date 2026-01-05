import { useState, useMemo } from 'react'
import { MeasurementSystem } from '@/types/core'
import { cmToFeetAndInches, feetAndInchesToCm } from '@/utils/units'
import { validateHeightValue } from '@/lib/validation/userMetrics'
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

  // Calculate the display value: either the user's transient input (while typing)
  // or the persisted value converted to the current unit system.
  const displayHeight = useMemo(() => {
    if (transientState) return transientState

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
  }, [cmValue, unitSystem, transientState])

  const updateHeight = (newDisplayValue: Partial<HeightState>) => {
    setTransientState((prev) => ({
      ...(prev ?? displayHeight),
      ...newDisplayValue,
    }))
  }

  const commitHeight = () => {
    let newCmValue = 0
    // If transientState is null, we are just re-validating the existing value
    // But usually commit is called on blur after typing.
    // If user didn't type, transientState is null, displayHeight is derived.
    const current = transientState ?? displayHeight

    if (unitSystem === 'METRIC') {
      newCmValue = parseFloat(current.cm)
    } else {
      const feet = parseFloat(current.feet)
      // Default to 0 if empty string to allow inputs like "5ft" (implied 0in)
      const inchesStr = current.inches.trim()
      const inches = inchesStr === '' ? 0 : parseFloat(current.inches)

      if (!isNaN(feet) && !isNaN(inches)) {
        newCmValue = feetAndInchesToCm(feet, inches)
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

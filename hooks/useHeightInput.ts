import { useState, useMemo } from 'react'
import { MeasurementSystem } from '../types/core'
import { cmToFeetAndInches, feetAndInchesToCm } from '../utils/units'
import { validateHeightValue } from '@/lib/validation/userMetrics'

interface HeightState {
  cm: string
  feet: string
  inches: string
}

export const useHeightInput = (
  initialCm: string,
  unitSystem: MeasurementSystem,
  onCommit?: (cm: number) => void
) => {
  const [transientState, setTransientState] = useState<HeightState | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Calculate the display value: either the user's transient input (while typing)
  // or the persisted value passed from parent converted to the current unit system.
  const displayHeight = useMemo(() => {
    if (transientState) return transientState

    const numericHeight = parseFloat(initialCm)
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
  }, [initialCm, unitSystem, transientState])

  const updateHeight = (newDisplayValue: Partial<HeightState>) => {
    setTransientState((prev) => ({
      ...(prev ?? displayHeight),
      ...newDisplayValue,
    }))
  }

  const commitHeight = () => {
    let newCmValue = 0
    const current = transientState ?? displayHeight

    if (unitSystem === 'METRIC') {
      newCmValue = parseFloat(current.cm)
    } else {
      const feet = parseFloat(current.feet)
      const inchesStr = (current.inches || '').trim()
      const inches = inchesStr === '' ? 0 : parseFloat(current.inches)

      if (!isNaN(feet) && !isNaN(inches)) {
        newCmValue = feetAndInchesToCm(feet, inches)
      }
    }

    const validationError = validateHeightValue(newCmValue, unitSystem)
    setError(validationError)

    if (!validationError && newCmValue > 0) {
      setTransientState(null)
      onCommit?.(newCmValue)
    }
  }

  return {
    displayHeight,
    updateHeight,
    commitHeight,
    error,
    setError,
  }
}

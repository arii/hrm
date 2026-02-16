import { useState, useMemo, useEffect } from 'react'
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
  const {
    userName,
    userAge,
    userWeight,
    gender,
    unitSystem,
    hrZoneMethod,
    maxHrOverride,
    restingHr,
    customZoneThresholds,
  } = userSettings

  const [localMaxHrOverride, setLocalMaxHrOverride] = useState<string>(
    maxHrOverride?.toString() || ''
  )

  const maxHrError = useMemo(() => {
    if (!localMaxHrOverride) return null
    const val = parseInt(localMaxHrOverride, 10)
    if (isNaN(val) || val <= 0) return 'Please enter a valid maximum heart rate'
    if (val > 250) return 'Maximum heart rate seems too high (> 250)'
    return null
  }, [localMaxHrOverride])

  const [localRestingHr, setLocalRestingHr] = useState<string>(
    restingHr?.toString() || ''
  )

  const restingHrError = useMemo(() => {
    if (!localRestingHr) return null
    const val = parseInt(localRestingHr, 10)
    if (isNaN(val) || val <= 0) return 'Please enter a valid resting heart rate'
    if (val > 150) return 'Resting heart rate seems too high (> 150)'
    return null
  }, [localRestingHr])

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

  useEffect(() => {
    if (!localMaxHrOverride) {
      if (maxHrOverride !== null) {
        setUserSettings((prev) => ({ ...prev, maxHrOverride: null }))
      }
      return
    }

    const val = parseInt(localMaxHrOverride, 10)
    if (!isNaN(val) && val > 0 && val <= 250) {
      if (val !== maxHrOverride) {
        setUserSettings((prev) => ({ ...prev, maxHrOverride: val }))
      }
    }
  }, [localMaxHrOverride, maxHrOverride, setUserSettings])

  useEffect(() => {
    if (!localRestingHr) {
      if (restingHr !== null) {
        setUserSettings((prev) => ({ ...prev, restingHr: null }))
      }
      return
    }

    const val = parseInt(localRestingHr, 10)
    if (!isNaN(val) && val > 0 && val <= 150) {
      if (val !== restingHr) {
        setUserSettings((prev) => ({ ...prev, restingHr: val }))
      }
    }
  }, [localRestingHr, restingHr, setUserSettings])

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
    userAge,
    userWeight,
    gender,
    unitSystem,
    hrZoneMethod,
    maxHrOverride,
    restingHr,
    customZoneThresholds,
    localMaxHrOverride,
    setLocalMaxHrOverride,
    maxHrError,
    localRestingHr,
    setLocalRestingHr,
    restingHrError,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    weightError,
    ageError,
    handleAgeBlur,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    heightError,
    handleUnitChange,
  }
}

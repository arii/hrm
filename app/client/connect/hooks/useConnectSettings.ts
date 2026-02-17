import { useState, useMemo, useEffect, useCallback } from 'react'
import { useUserSettings, HrZoneMethod } from '@/context/UserSettingsContext'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { toKg, toDisplay } from '@/utils/units'
import { useHeightInput } from '@/hooks/useHeightInput'
import { MeasurementSystem } from '@/types/core'
import { ZONE_THRESHOLDS } from '@/lib/shared/hr-zones'

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

  const handleMaxHrBlur = () => {
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
    } else {
      // Revert to canonical value on invalid input
      setLocalMaxHrOverride(maxHrOverride?.toString() || '')
    }
  }

  const handleRestingHrBlur = () => {
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
    } else {
      // Revert to canonical value on invalid input
      setLocalRestingHr(restingHr?.toString() || '')
    }
  }

  const setUserName = useCallback(
    (name: string) => setUserSettings((prev) => ({ ...prev, userName: name })),
    [setUserSettings]
  )

  const setUserAge = useCallback(
    (age: string) => {
      const ageNum = parseInt(age, 10)
      setUserSettings((prev) => ({
        ...prev,
        userAge: isNaN(ageNum) ? 0 : ageNum,
      }))
    },
    [setUserSettings]
  )

  const setHrZoneMethod = useCallback(
    (method: HrZoneMethod) =>
      setUserSettings((prev) => ({ ...prev, hrZoneMethod: method })),
    [setUserSettings]
  )

  const handleUnitChange = (newUnit: MeasurementSystem) => {
    if (newUnit && newUnit !== unitSystem) {
      setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
      setLocalDisplayWeight(null)
    }
  }

  const handleThresholdChange = useCallback(
    (zoneKey: string, value: number) => {
      const zoneNum = parseInt(zoneKey.split('_')[1] || '0', 10)
      if (zoneNum < 1 || zoneNum > 6) return

      setUserSettings((prev) => {
        const newThresholds: Record<string, number> = {}

        // Initialize with standard thresholds, then override with existing custom ones
        ;[1, 2, 3, 4, 5, 6].forEach((z) => {
          const key = `ZONE_${z}`
          newThresholds[key] =
            prev.customZoneThresholds[key] ??
            ZONE_THRESHOLDS[key as keyof typeof ZONE_THRESHOLDS]
        })

        // Apply the new value
        newThresholds[zoneKey] = value

        // Enforce ascending order: ZONE 1 <= ZONE 2 <= ... <= ZONE 6
        // 1. Ensure preceding zones are not greater than the current one
        for (let i = zoneNum - 1; i >= 1; i--) {
          const curr = `ZONE_${i}`
          const next = `ZONE_${i + 1}`
          newThresholds[curr] = Math.min(
            newThresholds[curr]!,
            newThresholds[next]!
          )
        }

        // 2. Ensure succeeding zones are not less than the current one
        for (let i = zoneNum + 1; i <= 6; i++) {
          const curr = `ZONE_${i}`
          const prevZone = `ZONE_${i - 1}`
          newThresholds[curr] = Math.max(
            newThresholds[curr]!,
            newThresholds[prevZone]!
          )
        }

        return { ...prev, customZoneThresholds: newThresholds }
      })
    },
    [setUserSettings]
  )

  return {
    userSettings,
    setUserSettings,
    userName,
    setUserName,
    userAge,
    setUserAge,
    setHrZoneMethod,
    userWeight,
    gender,
    unitSystem,
    hrZoneMethod,
    maxHrOverride,
    restingHr,
    customZoneThresholds,
    localMaxHrOverride,
    setLocalMaxHrOverride,
    handleMaxHrBlur,
    maxHrError,
    localRestingHr,
    setLocalRestingHr,
    handleRestingHrBlur,
    restingHrError,
    displayWeight,
    handleWeightChange,
    handleWeightBlur,
    weightError,
    ageError,
    onAgeBlur: handleAgeBlur,
    displayHeight,
    handleHeightChange,
    handleHeightBlur,
    heightError,
    handleUnitChange,
    handleThresholdChange,
  }
}

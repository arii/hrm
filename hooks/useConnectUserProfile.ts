import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useHeightInput } from './useHeightInput'
import { MeasurementSystem } from '@/types/core'
import { toKg, toDisplay } from '@/utils/units'
import {
  validateAgeValue,
  validateWeightValue,
} from '@/lib/validation/userMetrics'
import { UserProfileState } from '@/types/connect'

export const useConnectUserProfile = (): UserProfileState => {
  const [userSettings, setUserSettings] = useUserSettings()
  const { userName, userAge, userWeight, gender, unitSystem } = userSettings

  const [localDisplayWeight, setLocalDisplayWeight] = useState<string | null>(
    null
  )
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)

  const {
    displayHeight,
    updateHeight: handleHeightChange,
    commitHeight: handleHeightBlur,
    error: heightError,
  } = useHeightInput(String(userSettings.userHeight || 175), unitSystem, (cm) =>
    setUserSettings((prev) => ({ ...prev, userHeight: cm }))
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

  const handleAgeBlur = useCallback(() => {
    const error = validateAgeValue(String(userAge || ''))
    setAgeError(error)
  }, [userAge])

  const handleWeightChange = useCallback((newDisplayValue: string) => {
    setLocalDisplayWeight(newDisplayValue)
  }, [])

  const handleWeightBlur = useCallback(() => {
    const valueToValidate = localDisplayWeight ?? displayWeight
    const error = validateWeightValue(valueToValidate, unitSystem)
    setWeightError(error)

    if (!error) {
      const numericValue = parseFloat(valueToValidate)
      if (!isNaN(numericValue) && numericValue > 0) {
        const newKgValue = toKg(numericValue, unitSystem)
        if (newKgValue !== userWeight) {
          setUserSettings((prev) => ({ ...prev, userWeight: newKgValue }))
        }
      }
      setLocalDisplayWeight(null)
    }
  }, [localDisplayWeight, displayWeight, unitSystem, setUserSettings, userWeight])

  const handleUnitChange = useCallback(
    (newUnit: MeasurementSystem) => {
      if (newUnit && newUnit !== unitSystem) {
        setUserSettings((prev) => ({ ...prev, unitSystem: newUnit }))
        setLocalDisplayWeight(null)
      }
    },
    [unitSystem, setUserSettings]
  )

  // Persistent commit on unmount/unload to handle cases where blur hasn't fired
  const blurHandlersRef = useRef({ handleWeightBlur, handleHeightBlur })
  blurHandlersRef.current = { handleWeightBlur, handleHeightBlur }

  useEffect(() => {
    const persist = () => {
      blurHandlersRef.current.handleWeightBlur()
      blurHandlersRef.current.handleHeightBlur()
    }

    window.addEventListener('beforeunload', persist)
    return () => {
      window.removeEventListener('beforeunload', persist)
      persist()
    }
  }, [])

  return {
    data: {
      userName,
      userAge: String(userAge || ''),
      userAgeNum: userAge || 0,
      userHeight: displayHeight,
      userHeightCm: Number(userSettings.userHeight) || 175,
      userWeight: displayWeight || '',
      userWeightKg: userWeight || 0,
      gender,
      unitSystem,
    },
    errors: {
      ageError,
      heightError,
      weightError,
    },
    handlers: {
      setUserName: (name) =>
        setUserSettings((prev) => ({ ...prev, userName: name })),
      setUserAge: (age) =>
        setUserSettings((prev) => ({ ...prev, userAge: Number(age) })),
      onAgeBlur: handleAgeBlur,
      setUserHeight: handleHeightChange,
      onHeightBlur: handleHeightBlur,
      setUserWeight: handleWeightChange,
      onWeightBlur: handleWeightBlur,
      setGender: (g) => setUserSettings((prev) => ({ ...prev, gender: g })),
      onUnitChange: handleUnitChange,
    },
  }
}

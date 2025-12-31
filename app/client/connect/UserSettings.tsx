// app/client/connect/UserSettings.tsx
import React, { useState, useMemo } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import {
  cmToFeetAndInches,
  feetAndInchesToCm,
  toKg,
  toDisplay,
} from '../../../utils/units'
import {
  validateAgeValue,
  validateHeightValue,
  validateWeightValue,
} from './validation'
import { UserPreferences } from '@/hooks/useUserPreferences'

interface UserSettingsProps {
  userPreferences: UserPreferences
  setUserPreferences: (prefs: UserPreferences) => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userPreferences,
  setUserPreferences,
}) => {
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)

  const [displayWeight, setDisplayWeight] = useState<string | null>(null)

  const derivedDisplayWeight = useMemo(
    () =>
      userPreferences.userWeight
        ? toDisplay(
            userPreferences.userWeight,
            userPreferences.unitSystem
          ).toString()
        : '',
    [userPreferences.userWeight, userPreferences.unitSystem]
  )

  const displayHeight = useMemo(() => {
    const { userHeight, unitSystem } = userPreferences
    if (userHeight === null) return { cm: '', feet: '', inches: '' }
    if (unitSystem === 'METRIC') {
      return {
        cm: String(Math.round(userHeight)),
        feet: '',
        inches: '',
      }
    }
    const { feet, inches } = cmToFeetAndInches(userHeight)
    return {
      cm: '',
      feet: String(feet),
      inches: String(inches),
    }
  }, [userPreferences])

  const handleAgeBlur = () => {
    const error = validateAgeValue(String(userPreferences.userAge ?? ''))
    setAgeError(error)
  }

  const handleWeightBlur = () => {
    const currentWeight = displayWeight ?? derivedDisplayWeight
    const error = validateWeightValue(currentWeight, userPreferences.unitSystem)
    setWeightError(error)

    const numericValue = parseFloat(currentWeight)
    if (!error && !isNaN(numericValue) && numericValue > 0) {
      const newKgValue = toKg(numericValue, userPreferences.unitSystem)
      setUserPreferences({ ...userPreferences, userWeight: newKgValue })
    }
  }

  const handleHeightBlur = (value: string, field: 'cm' | 'feet' | 'inches') => {
    const newHeight = { ...displayHeight, [field]: value }
    let newCmValue = 0
    if (userPreferences.unitSystem === 'METRIC') {
      newCmValue = parseFloat(newHeight.cm)
    } else {
      const feet = parseFloat(newHeight.feet)
      const inches = parseFloat(newHeight.inches)
      if (!isNaN(feet) && !isNaN(inches)) {
        newCmValue = feetAndInchesToCm(feet, inches)
      }
    }

    const error = validateHeightValue(newCmValue, userPreferences.unitSystem)
    setHeightError(error)

    if (!error && newCmValue > 0) {
      setUserPreferences({ ...userPreferences, userHeight: newCmValue })
    }
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <TextField
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={userPreferences.userName}
        onChange={(e) =>
          setUserPreferences({ ...userPreferences, userName: e.target.value })
        }
      />
      <TextField
        fullWidth
        label="Your Age"
        placeholder="e.g., 30"
        type="number"
        value={userPreferences.userAge ?? ''}
        onChange={(e) =>
          setUserPreferences({
            ...userPreferences,
            userAge: e.target.value ? parseInt(e.target.value, 10) : null,
          })
        }
        onBlur={handleAgeBlur}
        error={!!ageError}
        helperText={ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      {userPreferences.unitSystem === 'METRIC' ? (
        <TextField
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={displayHeight.cm}
          onChange={(e) => handleHeightBlur(e.target.value, 'cm')}
          onBlur={() => handleHeightBlur(displayHeight.cm, 'cm')}
          error={!!heightError}
          helperText={heightError}
        />
      ) : (
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Feet"
            placeholder="e.g., 5"
            type="number"
            value={displayHeight.feet}
            onChange={(e) => handleHeightBlur(e.target.value, 'feet')}
            onBlur={() => handleHeightBlur(displayHeight.feet, 'feet')}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={displayHeight.inches}
            onChange={(e) => handleHeightBlur(e.target.value, 'inches')}
            onBlur={() => handleHeightBlur(displayHeight.inches, 'inches')}
          />
        </Stack>
      )}
      <TextField
        fullWidth
        label={`Your Weight (${
          userPreferences.unitSystem === 'METRIC' ? 'kg' : 'lbs'
        })`}
        placeholder={
          userPreferences.unitSystem === 'METRIC' ? 'e.g., 70' : 'e.g., 154'
        }
        type="number"
        value={displayWeight ?? derivedDisplayWeight}
        onChange={(e) => setDisplayWeight(e.target.value)}
        onBlur={handleWeightBlur}
        error={!!weightError}
        helperText={weightError}
      />
    </Stack>
  )
}

export default UserSettings

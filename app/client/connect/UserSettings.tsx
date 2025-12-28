// app/client/connect/UserSettings.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import useLocalStorage from '@/hooks/useLocalStorage'
import { MeasurementSystem, Gender } from '../../../types'
import {
  validateAgeValue,
  validateWeightValue,
  validateHeightValue,
} from './validation'
import { toKg, toDisplay, cmToFeetAndInches, feetAndInchesToCm } from '../../../utils/units'

interface UserSettingsProps {
  userName: string
  setUserName: (value: string) => void
  userAge: string
  setUserAge: (value: string) => void
  weightInKg: string
  setWeightInKg: (value: string) => void
}

const UserSettingsComponent: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  weightInKg,
  setWeightInKg,
}) => {
  const [heightInCm, setHeightInCm] = useLocalStorage('hrm-user-height', '175') // Always CM
  const [gender, setGender] = useLocalStorage<Gender>('hrm-user-gender', 'MALE')
  const [unitSystem, setUnitSystem] = useLocalStorage<MeasurementSystem>(
    'hrm-user-units',
    'IMPERIAL'
  )

  // Transient state for inputs
  const [displayWeight, setDisplayWeight] = useState('')
  const [displayHeightCm, setDisplayHeightCm] = useState('')
  const [displayHeightFeet, setDisplayHeightFeet] = useState('')
  const [displayHeightInches, setDisplayHeightInches] = useState('')

  // Validation state
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)

  // Initialize display values on mount and sync when unit system changes.
  // This avoids a feedback loop where saving a value would trigger a recalculation
  // and overwrite the user's input with a potentially rounded value.
  useEffect(() => {
    const currentWeightInKg = parseFloat(weightInKg)
    if (!isNaN(currentWeightInKg)) {
      setDisplayWeight(toDisplay(currentWeightInKg, unitSystem).toString())
    }

    const currentHeightInCm = parseFloat(heightInCm)
    if (!isNaN(currentHeightInCm)) {
      if (unitSystem === 'METRIC') {
        setDisplayHeightCm(currentHeightInCm.toString())
      } else {
        const { feet, inches } = cmToFeetAndInches(currentHeightInCm)
        setDisplayHeightFeet(feet.toString())
        setDisplayHeightInches(inches.toString())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSystem]) // Dependencies intentionally limited to unitSystem

  const handleAgeBlur = () => {
    setAgeError(validateAgeValue(userAge))
  }

  const handleWeightBlur = () => {
    const error = validateWeightValue(displayWeight, unitSystem)
    setWeightError(error)
    if (!error) {
      const numericValue = parseFloat(displayWeight)
      if (!isNaN(numericValue) && numericValue > 0) {
        setWeightInKg(toKg(numericValue, unitSystem).toFixed(2))
      }
    }
  }

  const handleHeightBlur = () => {
    let cm = 0
    if (unitSystem === 'METRIC') {
      cm = parseFloat(displayHeightCm)
    } else {
      cm = feetAndInchesToCm(
        parseFloat(displayHeightFeet),
        parseFloat(displayHeightInches)
      )
    }
    const error = validateHeightValue(cm, unitSystem)
    setHeightError(error)
    if (!error) {
      setHeightInCm(cm.toFixed(2))
    }
  }

  const handleUnitChange = (
    _event: React.MouseEvent<HTMLElement>,
    newUnit: MeasurementSystem | null
  ) => {
    if (newUnit && newUnit !== unitSystem) {
      setUnitSystem(newUnit);
      // Reset errors when unit system changes
      setWeightError(null);
      setHeightError(null);
    }
  };

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <TextField
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <TextField
        fullWidth
        label="Your Age"
        placeholder="e.g., 30"
        type="number"
        value={userAge}
        onChange={(e) => {
          if (/^\d*$/.test(e.target.value)) {
            setUserAge(e.target.value)
          }
        }}
        onBlur={handleAgeBlur}
        error={!!ageError}
        helperText={ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      <ToggleButtonGroup
        value={unitSystem}
        exclusive
        onChange={handleUnitChange}
        aria-label="Unit system"
        fullWidth
      >
        <ToggleButton value="IMPERIAL" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="METRIC" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
      {unitSystem === 'METRIC' ? (
        <TextField
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={displayHeightCm}
          onChange={(e) => setDisplayHeightCm(e.target.value)}
          onBlur={handleHeightBlur}
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
            value={displayHeightFeet}
            onChange={(e) => setDisplayHeightFeet(e.target.value)}
            onBlur={handleHeightBlur}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={displayHeightInches}
            onChange={(e) => setDisplayHeightInches(e.target.value)}
            onBlur={handleHeightBlur}
          />
        </Stack>
      )}
      <TextField
        fullWidth
        label={`Your Weight (${unitSystem === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={unitSystem === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
        type="number"
        value={displayWeight}
        onChange={(e) => setDisplayWeight(e.target.value)}
        onBlur={handleWeightBlur}
        error={!!weightError}
        helperText={weightError}
      />
    </Stack>
  )
}

const UserSettings = React.memo(UserSettingsComponent)

export default UserSettings

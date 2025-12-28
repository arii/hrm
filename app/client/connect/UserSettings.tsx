// app/client/connect/UserSettings.tsx
'use client'

import React, { useState, useEffect } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  validateAgeValue,
  validateWeightValue,
  validateHeightValue,
} from './validation'
import {
  toKg,
  toDisplay,
  cmToFeetAndInches,
  feetAndInchesToCm,
} from '../../../utils/units'
import { Gender, MeasurementSystem } from '../../../types'

interface UserSettingsProps {
  userName: string
  setUserName: (value: string) => void
  userAge: string
  setUserAge: (value: string) => void
  weightInKg: string
  setWeightInKg: (value: string) => void
  heightInCm: string
  setHeightInCm: (value: string) => void
  gender: Gender
  setGender: (value: Gender) => void
  unitSystem: MeasurementSystem
  onUnitChange: (value: MeasurementSystem) => void
}

const UserSettingsComponent: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  weightInKg,
  setWeightInKg,
  heightInCm,
  setHeightInCm,
  gender,
  setGender,
  unitSystem,
  onUnitChange,
}) => {
  // Transient state for inputs
  const [displayWeight, setDisplayWeight] = useState('')
  const [displayHeightCm, setDisplayHeightCm] = useState('')
  const [displayHeightFeet, setDisplayHeightFeet] = useState('')
  const [displayHeightInches, setDisplayHeightInches] = useState('')

  // Validation state
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)

  const isWeightFocused = React.useRef(false)
  const isHeightFocused = React.useRef(false)

  // Syncs display weight with parent props, avoiding overwrite on focus.
  useEffect(() => {
    if (!isWeightFocused.current) {
      const currentWeightInKg = parseFloat(weightInKg)
      if (!isNaN(currentWeightInKg)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayWeight(toDisplay(currentWeightInKg, unitSystem).toString())
      }
    }
  }, [weightInKg, unitSystem])

  // Syncs display height with parent props, avoiding overwrite on focus.
  useEffect(() => {
    if (!isHeightFocused.current) {
      const currentHeightInCm = parseFloat(heightInCm)
      if (!isNaN(currentHeightInCm)) {
        if (unitSystem === 'METRIC') {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDisplayHeightCm(currentHeightInCm.toString())
        } else {
          const { feet, inches } = cmToFeetAndInches(currentHeightInCm)
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDisplayHeightFeet(feet.toString())
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDisplayHeightInches(inches.toString())
        }
      }
    }
  }, [heightInCm, unitSystem])

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
      onUnitChange(newUnit)
      setWeightError(null)
      setHeightError(null)
    }
  }

  const handleGenderChange = (
    _event: React.MouseEvent<HTMLElement>,
    newGender: Gender | null
  ) => {
    if (newGender) {
      setGender(newGender)
    }
  }

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
        value={gender}
        exclusive
        onChange={handleGenderChange}
        aria-label="Gender"
        fullWidth
      >
        <ToggleButton value="MALE" aria-label="male">
          Male
        </ToggleButton>
        <ToggleButton value="FEMALE" aria-label="female">
          Female
        </ToggleButton>
      </ToggleButtonGroup>
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
          onFocus={() => (isHeightFocused.current = true)}
          onChange={(e) => {
            const val = (e.target as HTMLInputElement).valueAsNumber
            setDisplayHeightCm(isNaN(val) ? '' : val.toString())
          }}
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
            onFocus={() => (isHeightFocused.current = true)}
            onChange={(e) => {
              const val = (e.target as HTMLInputElement).valueAsNumber
              setDisplayHeightFeet(isNaN(val) ? '' : val.toString())
            }}
            onBlur={handleHeightBlur}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={displayHeightInches}
            onFocus={() => (isHeightFocused.current = true)}
            onChange={(e) => {
              const val = (e.target as HTMLInputElement).valueAsNumber
              setDisplayHeightInches(isNaN(val) ? '' : val.toString())
            }}
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
        onFocus={() => (isWeightFocused.current = true)}
        onChange={(e) => {
          const val = (e.target as HTMLInputElement).valueAsNumber
          setDisplayWeight(isNaN(val) ? '' : val.toString())
        }}
        onBlur={handleWeightBlur}
        error={!!weightError}
        helperText={weightError}
      />
    </Stack>
  )
}

const UserSettings = React.memo(UserSettingsComponent)

export default UserSettings

// app/client/connect/UserSettings.tsx
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
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
  updateDisplayHeight,
} from '../../../utils/units'
import { Gender, MeasurementSystem } from '../../../types'
import UserNameInput from './components/UserNameInput'
import UserAgeInput from './components/UserAgeInput'
import GenderSelection from './components/GenderSelection'
import UnitSystemSelection from './components/UnitSystemSelection'

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

  // Refs to track focus state and prevent overwriting user input
  const isWeightFocused = useRef(false)
  const isHeightFocused = useRef(false)

  // Validation state
  const [ageError, setAgeError] = useState<string | null>(null)
  const [weightError, setWeightError] = useState<string | null>(null)
  const [heightError, setHeightError] = useState<string | null>(null)

  // or when the unit system is toggled.
  useEffect(() => {
    // This effect synchronizes the local display state with parent props.
    // It's a valid pattern for controlled components with transient local state.
    // See: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isWeightFocused.current) {
      const currentWeightInKg = parseFloat(weightInKg)
      if (!isNaN(currentWeightInKg)) {
        setDisplayWeight(toDisplay(currentWeightInKg, unitSystem).toString())
      }
    }
  }, [weightInKg, unitSystem])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isHeightFocused.current) {
      const currentHeightInCm = parseFloat(heightInCm)
      if (!isNaN(currentHeightInCm)) {
        updateDisplayHeight(
          currentHeightInCm,
          unitSystem,
          setDisplayHeightCm,
          setDisplayHeightFeet,
          setDisplayHeightInches
        )
      }
    }
  }, [heightInCm, unitSystem])

  const handleAgeBlur = () => {
    setAgeError(validateAgeValue(userAge))
  }

  const handleWeightBlur = () => {
    isWeightFocused.current = false
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
    isHeightFocused.current = false
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
      <UserNameInput userName={userName} setUserName={setUserName} />
      <UserAgeInput
        userAge={userAge}
        setUserAge={setUserAge}
        handleAgeBlur={handleAgeBlur}
        ageError={ageError}
      />
      <GenderSelection
        gender={gender}
        handleGenderChange={handleGenderChange}
      />
      <UnitSystemSelection
        unitSystem={unitSystem}
        handleUnitChange={handleUnitChange}
      />
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

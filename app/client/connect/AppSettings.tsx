import React, { useState, useEffect, useMemo } from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
} from '@mui/material'
import { Gender } from '../../../types'
import { cmToFeetAndInches, feetAndInchesToCm } from '../../../utils/units'
import { isNumeric } from '../../../utils/validation'

interface AppSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  ageError: string | null
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  weightError: string | null
  userHeight: number // Always in cm
  setUserHeight: (height: number) => void
  onHeightBlur: () => void
  heightError: string | null
  unit: 'METRIC' | 'IMPERIAL'
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
  gender: Gender
  setGender: (gender: Gender) => void
}

const AppSettings: React.FC<AppSettingsProps> = React.memo(
  ({
    userName,
    setUserName,
    userAge,
    setUserAge,
    onAgeBlur,
    ageError,
    userWeight,
    setUserWeight,
    onWeightBlur,
    weightError,
    userHeight,
    setUserHeight,
    onHeightBlur,
    heightError,
    unit,
    setUnit,
    gender,
    setGender,
  }) => {
    const [feet, setFeet] = useState('')
    const [inches, setInches] = useState('')

    const imperialHeight = useMemo(() => {
      if (unit === 'IMPERIAL' && userHeight > 0) {
        return cmToFeetAndInches(userHeight)
      }
      return { feet: 0, inches: 0 }
    }, [userHeight, unit])

    // This effect is necessary to synchronize the local state (feet, inches)
    // with the props (userHeight) when the unit system is imperial.
    // While this can cause cascading renders, it is a valid use case for
    // controlled components that need to manage internal state for display.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (unit === 'IMPERIAL') {
        setFeet(String(imperialHeight.feet))
        setInches(String(imperialHeight.inches))
      }
    }, [imperialHeight, unit])

    useEffect(() => {
      if (unit === 'IMPERIAL') {
        const heightInCm = feetAndInchesToCm(
          parseInt(feet, 10) || 0,
          parseInt(inches, 10) || 0
        )
        if (heightInCm !== userHeight) {
          setUserHeight(heightInCm)
        }
      }
    }, [feet, inches, unit, setUserHeight, userHeight])

    return (
      <Stack spacing={2} sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={unit}
          exclusive
          onChange={(_, newUnit) => {
            if (newUnit) {
              setUnit(newUnit)
            }
          }}
          aria-label="Unit system"
        >
          <span id="unit-system-description" className="sr-only">
            Currently selected unit system is {unit}.
          </span>
          <ToggleButton
            value="IMPERIAL"
            aria-label="imperial units"
            aria-describedby="unit-system-description"
          >
            Imperial (lbs, ft, in)
          </ToggleButton>
          <ToggleButton value="METRIC" aria-label="metric units">
            Metric (kg, cm)
          </ToggleButton>
        </ToggleButtonGroup>
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
            if (isNumeric(e.target.value)) {
              setUserAge(e.target.value)
            }
          }}
          onBlur={onAgeBlur}
          error={!!ageError}
          helperText={ageError}
          inputProps={{ min: 1, max: 120 }}
        />
        <TextField
          fullWidth
          label={`Your Weight (${unit === 'METRIC' ? 'kg' : 'lbs'})`}
          placeholder={unit === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
          type="number"
          value={userWeight}
          onChange={(e) => {
            if (isNumeric(e.target.value, { allowFloat: true })) {
              setUserWeight(e.target.value)
            }
          }}
          onBlur={onWeightBlur}
          error={!!weightError}
          helperText={weightError}
        />
        {unit === 'METRIC' ? (
          <TextField
            fullWidth
            label="Your Height (cm)"
            placeholder="e.g., 175"
            type="number"
            value={userHeight}
            onChange={(e) => {
              if (isNumeric(e.target.value, { allowFloat: true })) {
                setUserHeight(Number(e.target.value))
              }
            }}
            onBlur={onHeightBlur}
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
              value={feet}
              onChange={(e) => {
                if (isNumeric(e.target.value)) {
                  setFeet(e.target.value)
                }
              }}
              onBlur={onHeightBlur}
              error={!!heightError}
              helperText={heightError ? ' ' : ''}
            />
            <TextField
              fullWidth
              label="Inches"
              placeholder="e.g., 9"
              type="number"
              value={inches}
              onChange={(e) => {
                if (isNumeric(e.target.value)) {
                  setInches(e.target.value)
                }
              }}
              onBlur={onHeightBlur}
              error={!!heightError}
              helperText={heightError}
            />
          </Stack>
        )}
        <FormControl component="fieldset">
          <FormLabel component="legend">Gender</FormLabel>
          <RadioGroup
            row
            aria-label="gender"
            name="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender)}
          >
            <FormControlLabel value="MALE" control={<Radio />} label="Male" />
            <FormControlLabel
              value="FEMALE"
              control={<Radio />}
              label="Female"
            />
          </RadioGroup>
        </FormControl>
      </Stack>
    )
  }
)
AppSettings.displayName = 'AppSettings'

export default AppSettings

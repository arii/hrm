// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import { cmToFeetAndInches, feetAndInchesToCm } from '../../../utils/units'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  userHeight: number
  setUserHeight: (height: number) => void
  userWeight: string
  setUserWeight: (weight: string) => void
  unit: 'METRIC' | 'IMPERIAL'
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
  ageError: string | null
  heightError: string | null
  weightError: string | null
  validateAge: (value: string) => void
  validateHeight: (value: string) => void
  validateWeight: (value: string) => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  userHeight,
  setUserHeight,
  userWeight,
  setUserWeight,
  unit,
  setUnit,
  ageError,
  heightError,
  weightError,
  validateAge,
  validateHeight,
  validateWeight,
}) => {
  const [feet, setFeet] = React.useState('')
  const [inches, setInches] = React.useState('')

  React.useEffect(() => {
    if (unit === 'IMPERIAL' && userHeight > 0) {
      const { feet: newFeet, inches: newInches } = cmToFeetAndInches(userHeight)
      if (String(newFeet) !== feet || String(newInches) !== inches) {
        setFeet(String(newFeet))
        setInches(String(newInches))
      }
    }
  }, [unit, userHeight, feet, inches])

  const handleImperialHeightChange = (ft: string, inch: string) => {
    const feetNum = Number(ft)
    const inchesNum = Number(inch)
    if (!isNaN(feetNum) && !isNaN(inchesNum) && feetNum > 0 && inchesNum >= 0) {
      const cm = feetAndInchesToCm(feetNum, inchesNum)
      setUserHeight(cm)
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
        onBlur={(e) => validateAge(e.target.value)}
        error={!!ageError}
        helperText={ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      <ToggleButtonGroup
        value={unit}
        exclusive
        onChange={(_, newUnit) => {
          if (newUnit) {
            setUnit(newUnit)
          }
        }}
        aria-label="Unit system"
        aria-describedby="unit-system-description"
      >
        <p id="unit-system-description" style={{ display: 'none' }}>
          Currently selected unit system is {unit}.
        </p>
        <ToggleButton value="IMPERIAL" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="METRIC" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
      {unit === 'METRIC' ? (
        <TextField
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={userHeight}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value)) {
              setUserHeight(Number(e.target.value))
            }
          }}
          onBlur={(e) => validateHeight(e.target.value)}
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
              if (/^\d*$/.test(e.target.value)) {
                setFeet(e.target.value)
                handleImperialHeightChange(e.target.value, inches)
              }
            }}
            onBlur={() => {
              const feetNum = Number(feet)
              const inchesNum = Number(inches)
              if (!isNaN(feetNum) && !isNaN(inchesNum)) {
                validateHeight(String(feetAndInchesToCm(feetNum, inchesNum)))
              }
            }}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={inches}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setInches(e.target.value)
                handleImperialHeightChange(feet, e.target.value)
              }
            }}
            onBlur={() => {
              const feetNum = Number(feet)
              const inchesNum = Number(inches)
              if (!isNaN(feetNum) && !isNaN(inchesNum)) {
                validateHeight(String(feetAndInchesToCm(feetNum, inchesNum)))
              }
            }}
          />
        </Stack>
      )}
      <TextField
        fullWidth
        label={`Your Weight (${unit === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={unit === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
        type="number"
        value={userWeight}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value)) {
            setUserWeight(e.target.value)
          }
        }}
        onBlur={(e) => validateWeight(e.target.value)}
        error={!!weightError}
        helperText={weightError}
      />
    </Stack>
  )
}

export default UserSettings

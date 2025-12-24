// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FormLabel from '@mui/material/FormLabel'

interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  userWeight: string
  setUserWeight: (weight: string) => void
  userGender: 'male' | 'female' | null
  setUserGender: (gender: 'male' | 'female' | null) => void
  unit: 'metric' | 'imperial'
  setUnit: (unit: 'metric' | 'imperial') => void
  ageError: string | null
  weightError: string | null
  validateAge: (value: string) => void
  validateWeight: (value: string) => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  userWeight,
  setUserWeight,
  userGender,
  setUserGender,
  unit,
  setUnit,
  ageError,
  weightError,
  validateAge,
  validateWeight,
}) => {

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
      <Stack spacing={1}>
        <FormLabel component="legend">Biological Sex</FormLabel>
        <ToggleButtonGroup
          value={userGender}
          exclusive
          onChange={(_, newGender) => {
            if (newGender) {
              setUserGender(newGender)
            }
          }}
          aria-label="Biological sex for calorie estimation"
        >
          <ToggleButton value="male" aria-label="male">
            Male
          </ToggleButton>
          <ToggleButton value="female" aria-label="female">
            Female
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
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
        <ToggleButton value="imperial" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="metric" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
      <TextField
        fullWidth
        label={`Your Weight (${unit === 'metric' ? 'kg' : 'lbs'})`}
        placeholder={unit === 'metric' ? 'e.g., 70' : 'e.g., 154'}
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

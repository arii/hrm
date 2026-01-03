// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ValidatedTextField from '../../../components/forms/ValidatedTextField' // Updated import
import { UserSettingsSchema } from '../../../lib/validation/userSettingsValidation' // Updated import

interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  userHeight: { cm: string; feet: string; inches: string }
  setUserHeight: (
    height: Partial<{ cm: string; feet: string; inches: string }>
  ) => void
  onHeightBlur: () => void // Kept for height
  heightError: string | null // Kept for height
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  unit: 'METRIC' | 'IMPERIAL'
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  userHeight,
  setUserHeight,
  onHeightBlur,
  heightError,
  userWeight,
  setUserWeight,
  onWeightBlur,
  unit,
  setUnit,
}) => {
  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <ValidatedTextField
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
        schema={UserSettingsSchema}
        fieldName="userName"
      />
      <ValidatedTextField
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
        schema={UserSettingsSchema}
        fieldName="userAge"
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
          value={userHeight.cm}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value)) {
              setUserHeight({ cm: e.target.value })
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
            value={userHeight.feet}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setUserHeight({ feet: e.target.value })
              }
            }}
            onBlur={onHeightBlur}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={userHeight.inches}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setUserHeight({ inches: e.target.value })
              }
            }}
            onBlur={onHeightBlur}
          />
        </Stack>
      )}
      <ValidatedTextField
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
        onBlur={onWeightBlur}
        schema={UserSettingsSchema}
        fieldName="userWeight"
      />
    </Stack>
  )
}

export default UserSettings

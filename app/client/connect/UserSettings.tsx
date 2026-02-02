// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import Tooltip from '@mui/material/Tooltip'
import { calculateMaxHr } from '@/lib/shared/hr-zones'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

// 1. Update Interface
interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  ageError: string | null
  userHeight: { cm: string; feet: string; inches: string }
  setUserHeight: (
    height: Partial<{ cm: string; feet: string; inches: string }>
  ) => void
  onHeightBlur: () => void
  heightError: string | null
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  weightError: string | null
  unit: 'METRIC' | 'IMPERIAL'
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
  maxHr: string
  setMaxHr: (hr: string) => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  onAgeBlur,
  ageError,
  userHeight,
  setUserHeight,
  onHeightBlur,
  heightError,
  userWeight,
  setUserWeight,
  onWeightBlur,
  weightError,
  unit,
  setUnit,
  maxHr,
  setMaxHr,
}) => {
  // Auto-calculate handler
  const handleAutoCalculate = () => {
    const ageNum = parseInt(userAge, 10)
    if (!isNaN(ageNum)) {
      setMaxHr(calculateMaxHr(ageNum).toString())
    }
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      {/* ... Existing Name/Age Inputs ... */}
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
        onBlur={onAgeBlur}
        error={!!ageError}
        helperText={ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      {/* NEW: Max Heart Rate Input */}
      <TextField
        fullWidth
        label="Max Heart Rate"
        type="number"
        value={maxHr}
        onChange={(e) => setMaxHr(e.target.value)}
        helperText="Used to calculate your heart rate zones."
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title="Calculate based on Age (220 - Age)">
                <IconButton onClick={handleAutoCalculate} edge="end">
                  <AutoFixHighIcon />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        }}
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
        onBlur={onWeightBlur}
        error={!!weightError}
        helperText={weightError}
      />

      {/* ... Rest of existing inputs ... */}
    </Stack>
  )
}

export default UserSettings

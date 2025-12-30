import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Button from '@mui/material/Button'
import InputAdornment from '@mui/material/InputAdornment'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import { calculateMaxHr } from '@/lib/hrm/calculators'

interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  ageError: string | null

  // NEW: Max HR Props
  maxHr: string
  setMaxHr: (hr: string) => void

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
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  onAgeBlur,
  ageError,
  maxHr,
  setMaxHr,
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
}) => {
  // Auto-calculation handler
  const handleAutoCalculate = () => {
    const ageNum = parseInt(userAge, 10)
    if (!isNaN(ageNum)) {
      const calculated = calculateMaxHr(ageNum)
      setMaxHr(calculated.toString())
    }
  }

  return (
    <Stack spacing={3} sx={{ mb: 3 }}>
      {/* Identity Section */}
      <Stack spacing={2}>
        <TextField
          fullWidth
          label="Your Name"
          placeholder="e.g., Jane Doe"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
        />

        <Stack direction="row" spacing={2} alignItems="flex-start">
          <TextField
            fullWidth
            label="Age"
            placeholder="30"
            type="number"
            value={userAge}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) setUserAge(e.target.value)
            }}
            onBlur={() => {
              onAgeBlur()
              // Optional: Auto-suggest if Max HR is empty
              if (!maxHr && userAge) handleAutoCalculate()
            }}
            error={!!ageError}
            helperText={ageError}
            inputProps={{ min: 10, max: 120 }}
          />

          <TextField
            fullWidth
            label="Max Heart Rate"
            value={maxHr}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) setMaxHr(e.target.value)
            }}
            type="number"
            helperText="Tanaka Formula (208 - 0.7 × Age)"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Button
                    size="small"
                    onClick={handleAutoCalculate}
                    startIcon={<AutoFixHighIcon />}
                    disabled={!userAge || !!ageError}
                    sx={{ minWidth: 'auto', px: 1 }}
                  >
                    Auto
                  </Button>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Stack>

      {/* Measurement System */}
      <Stack spacing={2}>
        <ToggleButtonGroup
          value={unit}
          exclusive
          onChange={(_, newUnit) => newUnit && setUnit(newUnit)}
          fullWidth
          color="primary"
        >
          <ToggleButton value="IMPERIAL">Imperial (lbs/ft)</ToggleButton>
          <ToggleButton value="METRIC">Metric (kg/cm)</ToggleButton>
        </ToggleButtonGroup>

        {unit === 'METRIC' ? (
          <TextField
            fullWidth
            label="Height (cm)"
            value={userHeight.cm}
            onChange={(e) => {
              if (/^\d*\.?\d*$/.test(e.target.value))
                setUserHeight({ cm: e.target.value })
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
              value={userHeight.feet}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value))
                  setUserHeight({ feet: e.target.value })
              }}
              onBlur={onHeightBlur}
            />
            <TextField
              fullWidth
              label="Inches"
              value={userHeight.inches}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value))
                  setUserHeight({ inches: e.target.value })
              }}
              onBlur={onHeightBlur}
            />
          </Stack>
        )}

        <TextField
          fullWidth
          label={`Weight (${unit === 'METRIC' ? 'kg' : 'lbs'})`}
          value={userWeight}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value))
              setUserWeight(e.target.value)
          }}
          onBlur={onWeightBlur}
          error={!!weightError}
          helperText={weightError}
        />
      </Stack>
    </Stack>
  )
}

export default UserSettings

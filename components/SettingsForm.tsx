import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Box from '@mui/material/Box'
import { MeasurementSystem, Gender } from '@/types/core'

export interface SettingsConfig {
  userName: string
  userAge: number | string
  unitSystem?: MeasurementSystem
  userHeight: {
    feet: string | number
    inches: string | number
    cm: string | number
  }
  userWeight: string | number
  gender?: Gender | string
}

export interface SettingsHandlers {
  setUserName: (name: string) => void
  setUserAge: (age: string) => void
  setUnit?: (unit: MeasurementSystem) => void
  setUserHeight: (h: { feet?: string; inches?: string; cm?: string }) => void
  setUserWeight: (w: string) => void
  setGender?: (gender: string) => void
  onAgeBlur?: () => void
  onHeightBlur?: () => void
  onWeightBlur?: () => void
}

export interface SettingsErrors {
  age?: string | null
  height?: string | null
  weight?: string | null
}

export interface SettingsFormProps {
  config: SettingsConfig
  handlers: SettingsHandlers
  errors?: SettingsErrors
  hideUnitToggle?: boolean
}

const SettingsForm: React.FC<SettingsFormProps> = ({
  config,
  handlers,
  errors = {},
  hideUnitToggle = false,
}) => {
  const {
    userName,
    userAge,
    unitSystem = 'METRIC',
    userHeight,
    userWeight,
    gender,
  } = config

  const {
    setUserName,
    setUserAge,
    setUnit,
    setUserHeight,
    setUserWeight,
    setGender,
    onAgeBlur,
    onHeightBlur,
    onWeightBlur,
  } = handlers

  const { age: ageError, height: heightError, weight: weightError } = errors

  return (
    <Stack spacing={2} sx={{ mb: 3 }} data-testid="user-settings-form">
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

      {setGender && (
        <TextField
          fullWidth
          label="Gender"
          placeholder="e.g., male"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
        />
      )}

      {!hideUnitToggle && setUnit && (
        <ToggleButtonGroup
          value={unitSystem}
          exclusive
          onChange={(_, newUnit) => {
            if (newUnit) {
              setUnit(newUnit)
            }
          }}
          aria-label="Unit system"
          aria-describedby="unit-system-description"
        >
          <Box
            component="p"
            id="unit-system-description"
            sx={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: 0,
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: 0,
            }}
          >
            Currently selected unit system is {unitSystem}.
          </Box>
          <ToggleButton value="IMPERIAL" aria-label="imperial units">
            Imperial (lbs, ft, in)
          </ToggleButton>
          <ToggleButton value="METRIC" aria-label="metric units">
            Metric (kg, cm)
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      {unitSystem === 'METRIC' ? (
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
        label={`Your Weight (${unitSystem === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={unitSystem === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
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
    </Stack>
  )
}

export default SettingsForm

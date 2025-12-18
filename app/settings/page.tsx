// File: app/settings/page.tsx
'use client'
import React, { useState } from 'react'
import {
  Container,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Switch,
  TextField,
  Box,
} from '@mui/material'
import { useUserSettings } from '../../context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [hrError, setHrError] = useState('')
  const [durationError, setDurationError] = useState('')

  const handleToggleAutoStart = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings((prev) => ({
      ...prev,
      autoStartWorkout: event.target.checked,
    }))
  }

  const handleHeartRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value === '') {
      setHrError('Heart rate cannot be empty.')
      return
    }

    const numericValue = parseInt(value, 10)
    if (isNaN(numericValue) || numericValue <= 0 || numericValue > 250) {
      setHrError('Please enter a valid heart rate (1-250 BPM).')
    } else {
      setHrError('')
      setUserSettings((prev) => ({ ...prev, autoStartHeartRate: numericValue }))
    }
  }

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    if (value === '') {
      setDurationError('Duration cannot be empty.')
      return
    }

    const numericValue = parseInt(value, 10)
    if (isNaN(numericValue) || numericValue <= 0 || numericValue > 600) {
      setDurationError('Please enter a valid duration (1-600 seconds).')
    } else {
      setDurationError('')
      setUserSettings((prev) => ({
        ...prev,
        autoStartSustainedDuration: numericValue,
      }))
    }
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          Workout Auto-Start
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={userSettings.autoStartWorkout}
                onChange={handleToggleAutoStart}
              />
            }
            label="Enable Workout Auto-Start"
          />
        </FormGroup>
        {userSettings.autoStartWorkout && (
          <Box sx={{ mt: 2, pl: 2 }}>
            <TextField
              label="Heart Rate Threshold (BPM)"
              type="number"
              value={userSettings.autoStartHeartRate}
              onChange={handleHeartRateChange}
              error={!!hrError}
              helperText={hrError}
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Sustained Duration (seconds)"
              type="number"
              value={userSettings.autoStartSustainedDuration}
              onChange={handleDurationChange}
              error={!!durationError}
              helperText={durationError}
              fullWidth
            />
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default SettingsPage

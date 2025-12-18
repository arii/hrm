// File: app/settings/page.tsx
'use client'
import React from 'react'
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

  const handleToggleAutoStart = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings((prev) => ({
      ...prev,
      autoStartWorkout: event.target.checked,
    }))
  }

  const handleHeartRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!isNaN(value)) {
      setUserSettings((prev) => ({ ...prev, autoStartHeartRate: value }))
    }
  }

  const handleDurationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10)
    if (!isNaN(value)) {
      setUserSettings((prev) => ({ ...prev, autoStartSustainedDuration: value }))
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
              fullWidth
              sx={{ mb: 2 }}
            />
            <TextField
              label="Sustained Duration (seconds)"
              type="number"
              value={userSettings.autoStartSustainedDuration}
              onChange={handleDurationChange}
              fullWidth
            />
          </Box>
        )}
      </Paper>
    </Container>
  )
}

export default SettingsPage

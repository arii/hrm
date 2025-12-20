// components/WorkoutSettings.tsx
'use client'
import React from 'react'
import { useUserSettings } from '../context/UserSettingsContext'
import {
  Box,
  Typography,
  Switch,
  Slider,
  FormControlLabel,
  Paper,
} from '@mui/material'

const WorkoutSettings = () => {
  const [userSettings, setUserSettings] = useUserSettings()

  const handleAutoStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings((prev) => ({
      ...prev,
      autoStartWorkout: event.target.checked,
    }))
  }

  const handleThresholdChange = (event: Event, newValue: number | number[]) => {
    setUserSettings((prev) => ({
      ...prev,
      autoStartThreshold: newValue as number,
    }))
  }

  const handleDurationChange = (event: Event, newValue: number | number[]) => {
    setUserSettings((prev) => ({
      ...prev,
      autoStartDuration: newValue as number,
    }))
  }

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Workout Settings
      </Typography>
      <Box>
        <FormControlLabel
          control={
            <Switch
              checked={userSettings.autoStartWorkout}
              onChange={handleAutoStartChange}
            />
          }
          label="Enable Workout Auto-Start"
        />
      </Box>
      {userSettings.autoStartWorkout && (
        <>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>
              Heart Rate Threshold (BPM)
            </Typography>
            <Slider
              value={userSettings.autoStartThreshold}
              onChange={handleThresholdChange}
              aria-labelledby="hr-threshold-slider"
              valueLabelDisplay="auto"
              step={5}
              marks={[
                { value: 80, label: '80' },
                { value: 150, label: '150' },
              ]}
              min={80}
              max={150}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography gutterBottom>
              Sustained Duration (seconds)
            </Typography>
            <Slider
              value={userSettings.autoStartDuration}
              onChange={handleDurationChange}
              aria-labelledby="duration-slider"
              valueLabelDisplay="auto"
              step={5}
              marks={[
                { value: 10, label: '10' },
                { value: 60, label: '60' },
              ]}
              min={10}
              max={60}
            />
          </Box>
        </>
      )}
    </Paper>
  )
}

export default WorkoutSettings
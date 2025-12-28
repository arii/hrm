// app/settings/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Container, Typography, TextField, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [localWeight, setLocalWeight] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (userSettings.userWeight) {
      setLocalWeight(userSettings.userWeight.toString())
    }
  }, [userSettings.userWeight])

  const handleBlur = () => {
    if (localWeight.trim() === '') {
      setUserSettings({ ...userSettings, userWeight: null })
      setError('Weight is required.')
      return
    }

    const weight = parseFloat(localWeight)
    if (!isNaN(weight) && weight >= 20 && weight <= 300) {
      setUserSettings({ ...userSettings, userWeight: weight })
      setError('')
    } else {
      setError('Invalid weight. Must be between 20 and 300.')
    }
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <TextField
          label="Weight (kg)"
          type="number"
          fullWidth
          value={localWeight}
          onChange={(e) => setLocalWeight(e.target.value)}
          onBlur={handleBlur}
          error={!!error}
          helperText={error}
          inputProps={{ min: 20, max: 300 }}
          sx={{ mb: 2 }}
        />
      </Box>
    </Container>
  )
}

export default SettingsPage

// app/settings/page.tsx
'use client'
import React, { useState } from 'react'
import { Container, Typography, TextField, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [weightError, setWeightError] = useState('')

  const handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (value.trim() === '') {
      setUserSettings({ ...userSettings, userWeight: null })
      setWeightError('Weight cannot be empty.')
      return
    }

    const weight = Number(value)
    if (isNaN(weight)) {
      setUserSettings({ ...userSettings, userWeight: null })
      setWeightError('Please enter a valid number.')
      return
    }

    if (weight >= 20 && weight <= 300) {
      setUserSettings({ ...userSettings, userWeight: weight })
      setWeightError('')
    } else {
      setUserSettings({ ...userSettings, userWeight: null })
      setWeightError('Please enter a weight between 20 and 300 kg.')
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
          value={userSettings.userWeight || ''}
          onChange={handleWeightChange}
          error={!!weightError}
          helperText={weightError}
          sx={{ mb: 2 }}
        />
      </Box>
    </Container>
  )
}

export default SettingsPage

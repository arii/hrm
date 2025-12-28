// app/settings/page.tsx
'use client'
import React, { useState } from 'react'
import { Container, Typography, TextField, Button, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [weightError, setWeightError] = useState(false)

  const handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const weight = Number(event.target.value)
    if (weight >= 20 && weight <= 300) {
      setUserSettings({
        ...userSettings,
        userWeight: weight,
      })
      setWeightError(false)
    } else {
      setWeightError(true)
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
          error={weightError}
          helperText={weightError ? 'Please enter a weight between 20 and 300 kg.' : ''}
          sx={{ mb: 2 }}
        />
      </Box>
    </Container>
  )
}

export default SettingsPage

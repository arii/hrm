// app/settings/page.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { Container, Typography, TextField, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [weightInput, setWeightInput] = useState(
    userSettings.userWeight ? String(userSettings.userWeight) : ''
  )
  const [weightError, setWeightError] = useState('')

  useEffect(() => {
    setWeightInput(userSettings.userWeight ? String(userSettings.userWeight) : '')
  }, [userSettings.userWeight])

  const handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setWeightInput(value)

    if (value.trim() === '') {
      setWeightError('Weight cannot be empty.')
      return
    }

    const weight = Number(value)
    if (isNaN(weight)) {
      setWeightError('Please enter a valid number.')
      return
    }

    if (weight >= 20 && weight <= 300) {
      setUserSettings({ ...userSettings, userWeight: weight })
      setWeightError('')
    } else {
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
          type="text"
          fullWidth
          value={weightInput}
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

// app/settings/page.tsx
'use client'
import React from 'react'
import { Container, Typography, TextField, Button, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()

  const handleWeightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserSettings({
      ...userSettings,
      userWeight: Number(event.target.value),
    })
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
          sx={{ mb: 2 }}
        />
      </Box>
    </Container>
  )
}

export default SettingsPage

'use client'

import { useUserSettings } from '@/contexts/UserSettingsContext'
import {
  Box,
  Button,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import React, { useState } from 'react'

const SettingsPage: React.FC = () => {
  const { userSettings, updateUserSettings, isInitialized } = useUserSettings()
  const [statusMessage, setStatusMessage] = useState('')

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = formData.get('name') as string
    const age = formData.get('age') as string
    const maxHr = formData.get('maxHr') as string
    const restingHr = formData.get('restingHr') as string

    updateUserSettings({
      userName: name,
      userAge: age === '' ? null : Number(age),
      maxHr: maxHr === '' ? null : Number(maxHr),
      restingHr: restingHr === '' ? null : Number(restingHr),
    })
    setStatusMessage('Settings saved successfully!')
    setTimeout(() => setStatusMessage(''), 3000)
  }

  if (!isInitialized) {
    return (
      <Container>
        <Typography>Loading...</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          User Settings
        </Typography>
        <Box
          component="form"
          noValidate
          autoComplete="off"
          onSubmit={handleSave}
        >
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            margin="normal"
            name="name"
            defaultValue={userSettings.userName}
          />
          <TextField
            label="Age"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            name="age"
            defaultValue={userSettings.userAge ?? ''}
          />
          <TextField
            label="Maximum Heart Rate"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            name="maxHr"
            defaultValue={userSettings.maxHr ?? ''}
          />
          <TextField
            label="Resting Heart Rate"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            name="restingHr"
            defaultValue={userSettings.restingHr ?? ''}
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Save Settings
          </Button>
          {statusMessage && (
            <Typography
              variant="body2"
              color="success.main"
              sx={{ mt: 2 }}
            >
              {statusMessage}
            </Typography>
          )}
        </Box>
      </Paper>
    </Container>
  )
}

export default SettingsPage

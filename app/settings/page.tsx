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
import React, { useEffect, useState } from 'react'

const SettingsPage: React.FC = () => {
  const { userSettings, updateUserSettings, isInitialized } = useUserSettings()
  const [name, setName] = useState(userSettings.userName)
  const [age, setAge] = useState<number | ''>(userSettings.userAge ?? '')
  const [maxHr, setMaxHr] = useState<number | ''>(userSettings.maxHr ?? '')
  const [restingHr, setRestingHr] = useState<number | ''>(
    userSettings.restingHr ?? ''
  )
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    if (isInitialized) {
      setName(userSettings.userName)
      setAge(userSettings.userAge ?? '')
      setMaxHr(userSettings.maxHr ?? '')
      setRestingHr(userSettings.restingHr ?? '')
    }
  }, [isInitialized, userSettings])

  const handleSave = () => {
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
          onSubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <TextField
            label="Name"
            variant="outlined"
            fullWidth
            margin="normal"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Age"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            value={age}
            onChange={(e) =>
              setAge(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          <TextField
            label="Maximum Heart Rate"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            value={maxHr}
            onChange={(e) =>
              setMaxHr(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
          <TextField
            label="Resting Heart Rate"
            variant="outlined"
            type="number"
            fullWidth
            margin="normal"
            value={restingHr}
            onChange={(e) =>
              setRestingHr(e.target.value === '' ? '' : Number(e.target.value))
            }
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

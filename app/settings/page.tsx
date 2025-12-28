// app/settings/page.tsx
'use client'
import { useState } from 'react'
import { Container, Typography, TextField, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const MIN_WEIGHT = 20
const MAX_WEIGHT = 300

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [error, setError] = useState('')

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setUserSettings({
      ...userSettings,
      userWeight: value === '' ? null : Number(value),
    })
  }

  const handleBlur = () => {
    if (
      userSettings.userWeight === null ||
      userSettings.userWeight === undefined
    ) {
      setError('Weight is required.')
      return
    }

    if (
      userSettings.userWeight >= MIN_WEIGHT &&
      userSettings.userWeight <= MAX_WEIGHT
    ) {
      setError('')
    } else {
      setError(
        `Invalid weight. Must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}.`
      )
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
          value={userSettings.userWeight ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          error={!!error}
          helperText={error}
          inputProps={{ min: MIN_WEIGHT, max: MAX_WEIGHT }}
          sx={{ mb: 2 }}
        />
      </Box>
    </Container>
  )
}

export default SettingsPage

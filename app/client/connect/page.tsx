// app/client/connect/page.tsx
'use client'
import { useState } from 'react'
import { Container, Typography, TextField, Box } from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import HrmTiles from '@/components/HrmTiles'

const MIN_WEIGHT = 20
const MAX_WEIGHT = 300
const MIN_AGE = 1
const MAX_AGE = 120

const ConnectPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const [errors, setErrors] = useState({
    userWeight: '',
    userName: '',
    userAge: '',
  })

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const isNumberField = name === 'userAge' || name === 'userWeight'
    setUserSettings({
      ...userSettings,
      [name]: value === '' ? null : isNumberField ? Number(value) : value,
    })
  }

  const validateField = (name: string, value: string | number | null) => {
    let error = ''
    if (name === 'userName') {
      if (!value) {
        error = 'Name is required.'
      }
    } else if (name === 'userAge') {
      const age = Number(value)
      if (value === null || value === undefined) {
        error = 'Age is required.'
      } else if (isNaN(age) || age < MIN_AGE || age > MAX_AGE) {
        error = `Invalid age. Must be between ${MIN_AGE} and ${MAX_AGE}.`
      }
    } else if (name === 'userWeight') {
      const weight = Number(value)
      if (value === null || value === undefined) {
        error = 'Weight is required.'
      } else if (isNaN(weight) || weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
        error = `Invalid weight. Must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}.`
      }
    }
    return error
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const isNumberField = name === 'userAge' || name === 'userWeight'
    const fieldValue =
      value === '' ? null : isNumberField ? Number(value) : value
    const error = validateField(name, fieldValue)
    setErrors((prevErrors) => ({
      ...prevErrors,
      [name]: error,
    }))
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Connect & Settings
        </Typography>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Your Details
          </Typography>
          <TextField
            label="Name"
            type="text"
            fullWidth
            name="userName"
            value={userSettings.userName ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.userName}
            helperText={errors.userName}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Age"
            type="number"
            fullWidth
            name="userAge"
            value={userSettings.userAge ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.userAge}
            helperText={errors.userAge}
            inputProps={{ min: MIN_AGE, max: MAX_AGE }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Weight (kg)"
            type="number"
            fullWidth
            name="userWeight"
            value={userSettings.userWeight ?? ''}
            onChange={handleChange}
            onBlur={handleBlur}
            error={!!errors.userWeight}
            helperText={errors.userWeight}
            inputProps={{ min: MIN_WEIGHT, max: MAX_WEIGHT }}
            sx={{ mb: 2 }}
          />
        </Box>

        <HrmConnectionPanel />
        <Box sx={{ mt: 4 }}>
          <HrmTiles />
        </Box>
      </Box>
    </Container>
  )
}

export default ConnectPage

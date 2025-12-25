// app/settings/page.tsx
'use client'

import React from 'react'
import {
  Container,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
} from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'
import { DEFAULT_USER_AGE, DEFAULT_USER_NAME } from '@/utils/constants'

const SettingsPage = () => {
  const [userSettings, setUserSettings] = useUserSettings()

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    if (name === 'userAge' || name === 'userWeight') {
      const numValue = value === '' ? null : parseInt(value, 10)
      setUserSettings((prev) => ({
        ...prev,
        [name]: isNaN(numValue as number) ? null : numValue,
      }))
    } else {
      setUserSettings((prev) => ({
        ...prev,
        [name]: value,
      }))
    }
  }

  const handleUnitSystemChange = (event: any) => {
    setUserSettings((prev) => ({
      ...prev,
      unitSystem: event.target.value,
    }))
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <FormControl fullWidth margin="normal">
          <TextField
            label="Name"
            name="userName"
            value={userSettings.userName ?? DEFAULT_USER_NAME}
            onChange={handleInputChange}
          />
        </FormControl>
        <FormControl fullWidth margin="normal">
          <TextField
            label="Age"
            name="userAge"
            type="number"
            value={userSettings.userAge ?? DEFAULT_USER_AGE}
            onChange={handleInputChange}
          />
        </FormControl>
        <FormControl fullWidth margin="normal">
          <TextField
            label={`Weight (${
              userSettings.unitSystem === 'imperial' ? 'lbs' : 'kg'
            })`}
            name="userWeight"
            type="number"
            value={userSettings.userWeight ?? ''}
            onChange={handleInputChange}
          />
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Unit System</InputLabel>
          <Select
            value={userSettings.unitSystem}
            onChange={handleUnitSystemChange}
            label="Unit System"
          >
            <MenuItem value="imperial">Imperial (lbs)</MenuItem>
            <MenuItem value="metric">Metric (kg)</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Container>
  )
}

export default SettingsPage

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

import { SelectChangeEvent } from '@mui/material'
import { CALORIE_DEFAULTS } from '@/utils/constants'
import { kgToLbs } from '@/utils/units'

  const handleUnitSystemChange = (event: SelectChangeEvent) => {
    const newUnitSystem = event.target.value as 'metric' | 'imperial'
    setUserSettings((prev) => ({
      ...prev,
      unitSystem: newUnitSystem,
    }))
  }

  const defaultWeightLbs = Math.round(kgToLbs(CALORIE_DEFAULTS.WEIGHT_KG) ?? 0)
  const defaultWeight =
    userSettings.unitSystem === 'imperial'
      ? defaultWeightLbs
      : CALORIE_DEFAULTS.WEIGHT_KG

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
            value={userSettings.userAge ?? ''}
            onChange={handleInputChange}
            error={
              userSettings.userAge !== null &&
              (userSettings.userAge < 0 || userSettings.userAge > 120)
            }
            helperText={
              userSettings.userAge !== null &&
              (userSettings.userAge < 0 || userSettings.userAge > 120)
                ? 'Please enter a valid age (0-120)'
                : ''
            }
          />
        </FormControl>
        <FormControl fullWidth margin="normal">
          <TextField
            label={`Weight (${
              userSettings.unitSystem === 'imperial' ? 'lbs' : 'kg'
            })`}
            name="userWeight"
            type="number"
            value={userSettings.userWeight ?? defaultWeight}
            onChange={handleInputChange}
            error={
              userSettings.userWeight !== null && userSettings.userWeight < 0
            }
            helperText={
              userSettings.userWeight !== null && userSettings.userWeight < 0
                ? 'Please enter a valid weight'
                : ''
            }
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

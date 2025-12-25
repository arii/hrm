// File: app/settings/page.tsx
'use client'

import React from 'react'
import {
  Container,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  Box,
} from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'
import { UnitSystem } from '@/types/core'

/**
 * Renders the main settings page for the application.
 * This component allows users to configure their personal details and preferences,
 * such as unit system, name, age, and weight.
 *
 * @returns {JSX.Element} The rendered settings page.
 */
export default function SettingsPage(): JSX.Element {
  const {
    unitSystem,
    setUnitSystem,
    userName,
    setUserName,
    userAge,
    setUserAge,
    userWeight,
    setUserWeight,
  } = useUserSettings()

  const handleUnitSystemChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ) => {
    setUnitSystem(event.target.value as UnitSystem)
  }

  const handleUserNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(event.target.value)
  }

  const handleUserAgeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const age = parseInt(event.target.value, 10)
    if (!isNaN(age)) {
      setUserAge(age)
    }
  }

  const handleUserWeightChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const weight = parseFloat(event.target.value)
    if (!isNaN(weight)) {
      setUserWeight(weight)
    }
  }

  const weightLabel = `Weight (${unitSystem === 'METRIC' ? 'kg' : 'lbs'})`

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Grid container spacing={4}>
            {/* User Profile Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                User Profile
              </Typography>
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  label="Name"
                  value={userName}
                  onChange={handleUserNameChange}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Age"
                  type="number"
                  value={userAge}
                  onChange={handleUserAgeChange}
                  variant="outlined"
                />
              </Box>
            </Grid>

            {/* Preferences Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Preferences
              </Typography>
              <Box sx={{ mt: 2 }}>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel id="unit-system-label">Unit System</InputLabel>
                  <Select
                    labelId="unit-system-label"
                    value={unitSystem}
                    onChange={handleUnitSystemChange}
                    label="Unit System"
                  >
                    <MenuItem value="METRIC">Metric</MenuItem>
                    <MenuItem value="IMPERIAL">Imperial</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label={weightLabel}
                  type="number"
                  value={userWeight}
                  onChange={handleUserWeightChange}
                  variant="outlined"
                  key={unitSystem} // Re-mount when unit system changes
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Container>
  )
}

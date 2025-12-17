// app/settings/page.tsx
'use client'
import React from 'react'
import { useUserPreferences, Units } from '../../hooks/useUserPreferences'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Box from '@mui/material/Box'

const SettingsPage = () => {
  const [prefs, setPrefs] = useUserPreferences()

  const handleUnitChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newUnits = event.target.value as Units
    setPrefs((prev) => ({ ...prev, units: newUnits }))
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="unit-select-label">Units</InputLabel>
          <Select
            labelId="unit-select-label"
            id="unit-select"
            value={prefs.units}
            onChange={handleUnitChange}
            label="Units"
          >
            <MenuItem value="imperial">Imperial</MenuItem>
            <MenuItem value="metric">Metric</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Container>
  )
}

export default SettingsPage

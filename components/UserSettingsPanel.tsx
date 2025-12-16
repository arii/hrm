// components/UserSettingsPanel.tsx
'use client'
import React from 'react'
import {
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
} from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const UserSettingsPanel = () => {
  const [userSettings, setUserSettings] = useUserSettings()

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = event.target
    setUserSettings((prev) => ({
      ...prev,
      [name as string]: value,
    }))
  }

  return (
    <Box sx={{ p: 2, border: '1px solid grey', borderRadius: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        User Profile
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
        <TextField
          label="Name"
          name="userName"
          value={userSettings.userName || ''}
          onChange={handleChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Age"
          name="userAge"
          type="number"
          value={userSettings.userAge || ''}
          onChange={handleChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Height (cm)"
          name="userHeight"
          type="number"
          value={userSettings.userHeight || ''}
          onChange={handleChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Weight (kg)"
          name="userWeight"
          type="number"
          value={userSettings.userWeight || ''}
          onChange={handleChange}
          variant="outlined"
          fullWidth
        />
        <FormControl fullWidth variant="outlined">
          <InputLabel>Gender</InputLabel>
          <Select
            name="userGender"
            value={userSettings.userGender || ''}
            onChange={handleChange}
            label="Gender"
          >
            <MenuItem value="">
              <em>None</em>
            </MenuItem>
            <MenuItem value="male">Male</MenuItem>
            <MenuItem value="female">Female</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </Box>
  )
}

export default UserSettingsPanel

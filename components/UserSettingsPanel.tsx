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
  SelectChangeEvent,
} from '@mui/material'
import { useUserSettings } from '@/context/UserSettingsContext'

const UserSettingsPanel = () => {
  const [userSettings, setUserSettings] = useUserSettings()

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setUserSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (event: SelectChangeEvent) => {
    const { name, value } = event.target
    setUserSettings((prev) => ({
      ...prev,
      [name]: value,
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
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Age"
          name="userAge"
          type="number"
          value={userSettings.userAge || ''}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Height (cm)"
          name="userHeight"
          type="number"
          value={userSettings.userHeight || ''}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
        />
        <TextField
          label="Weight (kg)"
          name="userWeight"
          type="number"
          value={userSettings.userWeight || ''}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
        />
        <FormControl fullWidth variant="outlined">
          <InputLabel id="gender-select-label">Gender</InputLabel>
          <Select
            labelId="gender-select-label"
            name="userGender"
            value={userSettings.userGender || ''}
            onChange={handleSelectChange}
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

// components/UserSettingsPanel.tsx
'use client'
import React, { useState } from 'react'
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
  const [errors, setErrors] = useState({
    userAge: '',
    userHeight: '',
    userWeight: '',
  })

  const validate = (name: string, value: string) => {
    let error = ''
    const numValue = parseInt(value, 10)
    if (isNaN(numValue)) {
      error = 'Please enter a valid number.'
    } else if (name === 'userAge' && (numValue < 1 || numValue > 120)) {
      error = 'Please enter an age between 1 and 120.'
    } else if (name === 'userHeight' && (numValue < 50 || numValue > 300)) {
      error = 'Please enter a height between 50 and 300 cm.'
    } else if (name === 'userWeight' && (numValue < 20 || numValue > 500)) {
      error = 'Please enter a weight between 20 and 500 kg.'
    }
    return error
  }

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    const error = validate(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
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
          error={!!errors.userAge}
          helperText={errors.userAge}
        />
        <TextField
          label="Height (cm)"
          name="userHeight"
          type="number"
          value={userSettings.userHeight || ''}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
          error={!!errors.userHeight}
          helperText={errors.userHeight}
        />
        <TextField
          label="Weight (kg)"
          name="userWeight"
          type="number"
          value={userSettings.userWeight || ''}
          onChange={handleTextChange}
          variant="outlined"
          fullWidth
          error={!!errors.userWeight}
          helperText={errors.userWeight}
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
            <MenuItem value="unknown">
              <em>Prefer not to say</em>
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

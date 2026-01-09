'use client'
import React from 'react'
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material'
import { useUserSettingsForm } from '@/hooks/useUserSettingsForm'

const UserSettingsForm: React.FC = () => {
  const {
    formData,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    isEditing,
  } = useUserSettingsForm()

  return (
    <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        User Settings
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="User Name"
          name="userName"
          value={formData.userName}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Age"
          name="userAge"
          type="number"
          value={formData.userAge ?? ''}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Weight (kg)"
          name="userWeight"
          type="number"
          value={formData.userWeight ?? ''}
          onChange={handleInputChange}
          fullWidth
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>Gender</InputLabel>
          <Select
            name="gender"
            value={formData.gender}
            onChange={(e) => handleSelectChange('gender', e.target.value)}
          >
            <MenuItem value="MALE">Male</MenuItem>
            <MenuItem value="FEMALE">Female</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>Measurement System</InputLabel>
          <Select
            name="unitSystem"
            value={formData.unitSystem}
            onChange={(e) => handleSelectChange('unitSystem', e.target.value)}
          >
            <MenuItem value="METRIC">Metric</MenuItem>
            <MenuItem value="IMPERIAL">Imperial</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.autoConnect}
              onChange={handleInputChange}
              name="autoConnect"
            />
          }
          label="Auto-connect to last device"
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={!isEditing}
          sx={{ mt: 2 }}
        >
          Save Settings
        </Button>
      </form>
    </Paper>
  )
}

export default UserSettingsForm

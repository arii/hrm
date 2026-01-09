'use client'

import {
  Box,
  Button,
  Container,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { Save } from '@mui/icons-material'
import { useUserSettings } from '@/context/UserSettingsContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useUserSettingsForm } from '@/hooks/useUserSettingsForm'
import { useHrmBroadcaster } from '@/hooks/useHrmBroadcaster'
import { useAutoConnect } from '@/hooks/useAutoConnect'
import { DeviceConnection } from './DeviceConnection'
import WorkoutControls from './WorkoutControls'
import { useEffect } from 'react'

const ConnectView = () => {
  const [userSettings, setUserSettings] = useUserSettings()
  const {
    deviceStatus: status,
    hrData,
    connect,
    disconnect,
    deviceName,
    error,
  } = useBluetoothHRM()
  const { state, handleChange, handleSave, setSettings } = useUserSettingsForm(
    userSettings,
    setUserSettings
  )

  useEffect(() => {
    setSettings(userSettings)
  }, [userSettings, setSettings])

  useHrmBroadcaster(hrData)
  useAutoConnect(userSettings, setUserSettings)

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Connect & Settings
      </Typography>

      <DeviceConnection
        status={status}
        deviceName={deviceName}
        error={error}
        connect={connect}
        disconnect={disconnect}
      />

      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Name"
          value={state.userName}
          onChange={(e) => handleChange('userName', e.target.value)}
          fullWidth
        />
        <TextField
          label="Age"
          type="number"
          value={state.userAge}
          onChange={(e) =>
            handleChange('userAge', parseInt(e.target.value, 10))
          }
          fullWidth
        />
        <TextField
          label="Weight"
          type="number"
          value={state.userWeight}
          onChange={(e) =>
            handleChange('userWeight', parseInt(e.target.value, 10))
          }
          InputProps={{
            endAdornment: (
              <Typography variant="body2">
                {state.measurementSystem === 'metric' ? 'kg' : 'lbs'}
              </Typography>
            ),
          }}
          fullWidth
        />
        <TextField
          label="Height"
          type="number"
          value={state.userHeight}
          onChange={(e) =>
            handleChange('userHeight', parseInt(e.target.value, 10))
          }
          InputProps={{
            endAdornment: (
              <Typography variant="body2">
                {state.measurementSystem === 'metric' ? 'cm' : 'in'}
              </Typography>
            ),
          }}
          fullWidth
        />
        <FormControl component="fieldset">
          <FormLabel component="legend">Measurement System</FormLabel>
          <RadioGroup
            row
            value={state.measurementSystem}
            onChange={(e) => handleChange('measurementSystem', e.target.value)}
          >
            <FormControlLabel
              value="metric"
              control={<Radio />}
              label="Metric"
            />
            <FormControlLabel
              value="imperial"
              control={<Radio />}
              label="Imperial"
            />
          </RadioGroup>
        </FormControl>
        <FormControl component="fieldset">
          <FormLabel component="legend">Gender</FormLabel>
          <RadioGroup
            row
            value={state.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
          >
            <FormControlLabel value="male" control={<Radio />} label="Male" />
            <FormControlLabel
              value="female"
              control={<Radio />}
              label="Female"
            />
          </RadioGroup>
        </FormControl>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<Save />}
        >
          Save Settings
        </Button>
      </Box>
      <WorkoutControls />
    </Container>
  )
}

export default ConnectView

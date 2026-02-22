// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Radio from '@mui/material/Radio'
import Typography from '@mui/material/Typography'
import { UserProfileState } from './types'
import { Gender } from '../../../types/core'

interface UserSettingsProps {
  profile: UserProfileState
}

const UserSettings: React.FC<UserSettingsProps> = ({ profile }) => {
  const { data, handlers, errors } = profile

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <TextField
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={data.userName}
        onChange={(e) => handlers.setUserName(e.target.value)}
      />
      <TextField
        fullWidth
        label="Your Age"
        placeholder="e.g., 30"
        type="number"
        value={data.userAge}
        onChange={(e) => {
          if (/^\d*$/.test(e.target.value)) {
            handlers.setUserAge(e.target.value)
          }
        }}
        onBlur={handlers.onAgeBlur}
        error={!!errors.ageError}
        helperText={errors.ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      <ToggleButtonGroup
        value={data.unitSystem}
        exclusive
        onChange={(_, newUnit) => {
          if (newUnit) {
            handlers.onUnitChange(newUnit)
          }
        }}
        aria-label="Unit system"
        aria-describedby="unit-system-description"
        fullWidth
      >
        <p id="unit-system-description" style={{ display: 'none' }}>
          Currently selected unit system is {data.unitSystem}.
        </p>
        <ToggleButton value="IMPERIAL" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="METRIC" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
      {data.unitSystem === 'METRIC' ? (
        <TextField
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={data.userHeight.cm}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value)) {
              handlers.setUserHeight({ cm: e.target.value })
            }
          }}
          onBlur={handlers.onHeightBlur}
          error={!!errors.heightError}
          helperText={errors.heightError}
        />
      ) : (
        <Stack direction="column">
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              label="Feet"
              placeholder="e.g., 5"
              type="number"
              value={data.userHeight.feet}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  handlers.setUserHeight({ feet: e.target.value })
                }
              }}
              onBlur={handlers.onHeightBlur}
              error={!!errors.heightError}
            />
            <TextField
              fullWidth
              label="Inches"
              placeholder="e.g., 9"
              type="number"
              value={data.userHeight.inches}
              onChange={(e) => {
                if (/^\d*$/.test(e.target.value)) {
                  handlers.setUserHeight({ inches: e.target.value })
                }
              }}
              onBlur={handlers.onHeightBlur}
              error={!!errors.heightError}
            />
          </Stack>
          {errors.heightError && (
            <Typography
              variant="caption"
              color="error"
              sx={{ mt: 0.5, ml: 1.5 }}
            >
              {errors.heightError}
            </Typography>
          )}
        </Stack>
      )}
      <TextField
        fullWidth
        label={`Your Weight (${data.unitSystem === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={data.unitSystem === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
        type="number"
        value={data.userWeight}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value)) {
            handlers.setUserWeight(e.target.value)
          }
        }}
        onBlur={handlers.onWeightBlur}
        error={!!errors.weightError}
        helperText={errors.weightError}
      />
      <FormControl component="fieldset">
        <FormLabel component="legend">Gender</FormLabel>
        <RadioGroup
          row
          aria-label="gender"
          name="gender"
          value={data.gender}
          onChange={(e) => handlers.setGender(e.target.value as Gender)}
        >
          <FormControlLabel value="MALE" control={<Radio />} label="Male" />
          <FormControlLabel value="FEMALE" control={<Radio />} label="Female" />
        </RadioGroup>
      </FormControl>
    </Stack>
  )
}

export default UserSettings

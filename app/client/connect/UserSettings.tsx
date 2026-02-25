// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import {
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormHelperText,
} from '@mui/material'
import { UserProfileState } from '@/types/connect'
import { Gender } from '@/types/core'

const visuallyHidden = {
  border: 0,
  clip: 'rect(0 0 0 0)',
  height: '1px',
  margin: -1,
  overflow: 'hidden',
  padding: 0,
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: '1px',
} as const

interface UserSettingsProps {
  profile: UserProfileState
  onForgetDevice?: () => Promise<void>
  isResetting?: boolean
}

const UserSettings: React.FC<UserSettingsProps> = ({
  profile,
  onForgetDevice,
  isResetting = false,
}) => {
  const { data, handlers, errors } = profile

  return (
    <Stack spacing={2} sx={{ mb: 3 }} data-testid="user-settings-form">
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
        <Box id="unit-system-description" sx={visuallyHidden}>
          Currently selected unit system is {data.unitSystem}.
        </Box>
        <ToggleButton value="IMPERIAL" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="METRIC" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
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
        <FormControl error={!!errors.heightError} fullWidth variant="standard">
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
            <FormHelperText sx={{ ml: 1.5 }}>
              {errors.heightError}
            </FormHelperText>
          )}
        </FormControl>
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
      {onForgetDevice && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={onForgetDevice}
            disabled={isResetting}
            fullWidth
          >
            {isResetting ? 'Clearing...' : 'Clear Saved Device'}
          </Button>
        </Box>
      )}
    </Stack>
  )
}

export default UserSettings

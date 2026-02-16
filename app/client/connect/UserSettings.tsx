// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import { HrZoneMethod } from '@/context/UserSettingsContext'
import { calculateMaxHr, ZONE_THRESHOLDS } from '@/lib/shared/hr-zones'

interface UserSettingsProps {
  userName: string
  setUserName: (name: string) => void
  userAge: string
  setUserAge: (age: string) => void
  onAgeBlur: () => void
  ageError: string | null
  userHeight: { cm: string; feet: string; inches: string }
  setUserHeight: (
    height: Partial<{ cm: string; feet: string; inches: string }>
  ) => void
  onHeightBlur: () => void
  heightError: string | null
  userWeight: string
  setUserWeight: (weight: string) => void
  onWeightBlur: () => void
  weightError: string | null
  unit: 'METRIC' | 'IMPERIAL'
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
  hrZoneMethod: HrZoneMethod
  setHrZoneMethod: (method: HrZoneMethod) => void
  maxHrOverride: string
  setMaxHrOverride: (val: string) => void
  maxHrError: string | null
  restingHr: string
  setRestingHr: (val: string) => void
  restingHrError: string | null
  customZoneThresholds: Record<string, number>
  setCustomZoneThresholds: (thresholds: Record<string, number>) => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  setUserName,
  userAge,
  setUserAge,
  onAgeBlur,
  ageError,
  userHeight,
  setUserHeight,
  onHeightBlur,
  heightError,
  userWeight,
  setUserWeight,
  onWeightBlur,
  weightError,
  unit,
  setUnit,
  hrZoneMethod,
  setHrZoneMethod,
  maxHrOverride,
  setMaxHrOverride,
  maxHrError,
  restingHr,
  setRestingHr,
  restingHrError,
  customZoneThresholds,
  setCustomZoneThresholds,
}) => {
  const autoMaxHr = calculateMaxHr(userAge)

  const handleThresholdChange = (zone: string, value: number) => {
    const zoneNum = parseInt(zone.split('_')[1] || '0', 10)
    const newThresholds: Record<string, number> = {}

    // Initialize with defaults if not present in customZoneThresholds
    ;[1, 2, 3, 4, 5, 6].forEach((z) => {
      const key = `ZONE_${z}`
      newThresholds[key] =
        customZoneThresholds[key] ??
        ZONE_THRESHOLDS[key as keyof typeof ZONE_THRESHOLDS]
    })

    newThresholds[zone] = value

    // Enforce ascending order: ZONE 1 <= ZONE 2 <= ... <= ZONE 6
    if (zoneNum > 1) {
      // If moving a zone down, push previous zones down if they exceed it
      for (let i = zoneNum - 1; i >= 1; i--) {
        const currKey = `ZONE_${i}`
        const nextKey = `ZONE_${i + 1}`
        if (newThresholds[currKey]! > newThresholds[nextKey]!) {
          newThresholds[currKey] = newThresholds[nextKey]!
        }
      }
    }

    if (zoneNum < 6) {
      // If moving a zone up, push subsequent zones up if they are below it
      for (let i = zoneNum + 1; i <= 6; i++) {
        const currKey = `ZONE_${i}`
        const prevKey = `ZONE_${i - 1}`
        if (newThresholds[currKey]! < newThresholds[prevKey]!) {
          newThresholds[currKey] = newThresholds[prevKey]!
        }
      }
    }

    setCustomZoneThresholds(newThresholds)
  }

  return (
    <Stack spacing={2} sx={{ mb: 3 }} data-testid="user-settings-form">
      <TextField
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <TextField
        fullWidth
        label="Your Age"
        placeholder="e.g., 30"
        type="number"
        value={userAge}
        onChange={(e) => {
          if (/^\d*$/.test(e.target.value)) {
            setUserAge(e.target.value)
          }
        }}
        onBlur={onAgeBlur}
        error={!!ageError}
        helperText={ageError}
        inputProps={{ min: 1, max: 120 }}
      />
      <ToggleButtonGroup
        value={unit}
        exclusive
        onChange={(_, newUnit) => {
          if (newUnit) {
            setUnit(newUnit)
          }
        }}
        aria-label="Unit system"
        aria-describedby="unit-system-description"
      >
        <p id="unit-system-description" style={{ display: 'none' }}>
          Currently selected unit system is {unit}.
        </p>
        <ToggleButton value="IMPERIAL" aria-label="imperial units">
          Imperial (lbs, ft, in)
        </ToggleButton>
        <ToggleButton value="METRIC" aria-label="metric units">
          Metric (kg, cm)
        </ToggleButton>
      </ToggleButtonGroup>
      {unit === 'METRIC' ? (
        <TextField
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={userHeight.cm}
          onChange={(e) => {
            if (/^\d*\.?\d*$/.test(e.target.value)) {
              setUserHeight({ cm: e.target.value })
            }
          }}
          onBlur={onHeightBlur}
          error={!!heightError}
          helperText={heightError}
        />
      ) : (
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="Feet"
            placeholder="e.g., 5"
            type="number"
            value={userHeight.feet}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setUserHeight({ feet: e.target.value })
              }
            }}
            onBlur={onHeightBlur}
          />
          <TextField
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={userHeight.inches}
            onChange={(e) => {
              if (/^\d*$/.test(e.target.value)) {
                setUserHeight({ inches: e.target.value })
              }
            }}
            onBlur={onHeightBlur}
          />
        </Stack>
      )}
      <TextField
        fullWidth
        label={`Your Weight (${unit === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={unit === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
        type="number"
        value={userWeight}
        onChange={(e) => {
          if (/^\d*\.?\d*$/.test(e.target.value)) {
            setUserWeight(e.target.value)
          }
        }}
        onBlur={onWeightBlur}
        error={!!weightError}
        helperText={weightError}
      />

      <Accordion elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Advanced HR Zone Settings</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Zone Calculation Method
              </Typography>
              <ToggleButtonGroup
                value={hrZoneMethod}
                exclusive
                onChange={(_, newMethod) => {
                  if (newMethod) setHrZoneMethod(newMethod)
                }}
                fullWidth
                size="small"
              >
                <ToggleButton value="MAX_HR">Max HR %</ToggleButton>
                <ToggleButton value="HRR">Karvonen (HRR)</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              fullWidth
              size="small"
              label={`Max HR (Auto: ${autoMaxHr})`}
              placeholder="Leave empty for auto"
              type="number"
              value={maxHrOverride}
              onChange={(e) => setMaxHrOverride(e.target.value)}
              error={!!maxHrError}
              helperText={
                maxHrError || 'Overrides age-based calculation if set'
              }
            />

            {hrZoneMethod === 'HRR' && (
              <TextField
                fullWidth
                size="small"
                label="Resting Heart Rate"
                placeholder="e.g., 60"
                type="number"
                value={restingHr}
                onChange={(e) => setRestingHr(e.target.value)}
                error={!!restingHrError}
                helperText={restingHrError}
                required
              />
            )}

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Custom Zone Thresholds (%)
              </Typography>
              {[1, 2, 3, 4, 5, 6].map((z) => (
                <Box key={z} sx={{ px: 1 }}>
                  <Typography variant="caption">Zone {z} Min %</Typography>
                  <Slider
                    size="small"
                    value={
                      customZoneThresholds[`ZONE_${z}`] ??
                      ZONE_THRESHOLDS[
                        `ZONE_${z}` as keyof typeof ZONE_THRESHOLDS
                      ]
                    }
                    onChange={(_, value) =>
                      handleThresholdChange(`ZONE_${z}`, value as number)
                    }
                    valueLabelDisplay="auto"
                    min={0}
                    max={100}
                    aria-label={`Zone ${z} minimum percentage`}
                  />
                </Box>
              ))}
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Stack>
  )
}

export default UserSettings

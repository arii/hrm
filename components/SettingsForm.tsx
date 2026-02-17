import React, { memo } from 'react'
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
import { calculateMaxHr, ZONE_THRESHOLDS } from '@/lib/shared/hr-zones'
import { MeasurementSystem, Gender } from '@/types/core'
import { HrZoneMethod } from '@/context/UserSettingsContext'

export interface SettingsFormProps {
  userName: string
  setUserName: (name: string) => void
  userAge: number | string
  setUserAge: (age: string) => void
  onAgeBlur?: () => void
  ageError?: string | null

  // Unit system
  unitSystem?: MeasurementSystem
  setUnit?: (unit: MeasurementSystem) => void
  hideUnitToggle?: boolean

  // Height
  userHeight: {
    feet: string | number
    inches: string | number
    cm: string | number
  }
  setUserHeight: (h: { feet?: string; inches?: string; cm?: string }) => void
  onHeightBlur?: () => void
  heightError?: string | null

  // Weight
  userWeight: string | number
  setUserWeight: (w: string) => void
  onWeightBlur?: () => void
  weightError?: string | null

  // Gender (Optional, mostly for mock page)
  gender?: Gender | string
  setGender?: (gender: string) => void

  // HR Zones
  hrZoneMethod: HrZoneMethod
  setHrZoneMethod: (method: HrZoneMethod) => void
  maxHrOverride: number | string
  setMaxHrOverride: (val: string) => void
  maxHrError?: string | null
  onMaxHrBlur?: () => void

  restingHr: number | string
  setRestingHr: (val: string) => void
  restingHrError?: string | null
  onRestingHrBlur?: () => void

  customZoneThresholds: Record<string, number>
  handleThresholdChange: (zone: string, val: number) => void
}

const SettingsForm: React.FC<SettingsFormProps> = memo(
  ({
    userName,
    setUserName,
    userAge,
    setUserAge,
    onAgeBlur,
    ageError,
    unitSystem = 'METRIC',
    setUnit,
    hideUnitToggle = false,
    userHeight,
    setUserHeight,
    onHeightBlur,
    heightError,
    userWeight,
    setUserWeight,
    onWeightBlur,
    weightError,
    gender,
    setGender,
    hrZoneMethod,
    setHrZoneMethod,
    maxHrOverride,
    setMaxHrOverride,
    maxHrError,
    onMaxHrBlur,
    restingHr,
    setRestingHr,
    restingHrError,
    onRestingHrBlur,
    customZoneThresholds,
    handleThresholdChange,
  }) => {
    const autoMaxHr = calculateMaxHr(userAge)

    return (
      <Stack spacing={2} sx={{ mb: 3 }} data-testid="settings-form">
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

        {setGender && (
          <TextField
            fullWidth
            label="Gender"
            placeholder="e.g., male"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          />
        )}

        {!hideUnitToggle && setUnit && (
          <ToggleButtonGroup
            value={unitSystem}
            exclusive
            onChange={(_, newUnit) => {
              if (newUnit) {
                setUnit(newUnit)
              }
            }}
            aria-label="Unit system"
            aria-describedby="unit-system-description"
          >
            <Box
              component="p"
              id="unit-system-description"
              sx={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                padding: 0,
                margin: '-1px',
                overflow: 'hidden',
                clip: 'rect(0, 0, 0, 0)',
                whiteSpace: 'nowrap',
                border: 0,
              }}
            >
              Currently selected unit system is {unitSystem}.
            </Box>
            <ToggleButton value="IMPERIAL" aria-label="imperial units">
              Imperial (lbs, ft, in)
            </ToggleButton>
            <ToggleButton value="METRIC" aria-label="metric units">
              Metric (kg, cm)
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {unitSystem === 'METRIC' ? (
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
          label={`Your Weight (${unitSystem === 'METRIC' ? 'kg' : 'lbs'})`}
          placeholder={unitSystem === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
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
            <Typography variant="subtitle2">
              Advanced HR Zone Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Box>
                <Typography
                  id="hr-zone-method-label"
                  variant="caption"
                  color="text.secondary"
                  gutterBottom
                >
                  Zone Calculation Method
                </Typography>
                <ToggleButtonGroup
                  aria-labelledby="hr-zone-method-label"
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
                onBlur={onMaxHrBlur}
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
                  onBlur={onRestingHrBlur}
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
)

SettingsForm.displayName = 'SettingsForm'

export default SettingsForm

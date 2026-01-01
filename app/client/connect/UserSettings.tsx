// app/client/connect/UserSettings.tsx
import React from 'react'
import Stack from '@mui/material/Stack'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { z } from 'zod'
import ValidatedTextField from '@/components/shared/Form/ValidatedTextField'
import { ZodIssue } from 'zod'

// Schemas
const nameSchema = z.string().min(1, 'Name is required')
const ageSchema = z
  .string()
  .min(1, 'Age is required')
  .refine((val) => /^\d+$/.test(val), {
    message: 'Age must be a valid number',
  })
  .refine((val) => parseInt(val, 10) >= 1 && parseInt(val, 10) <= 120, {
    message: 'Age must be between 1 and 120',
  })

const weightSchema = (unit: 'METRIC' | 'IMPERIAL') =>
  z
    .string()
    .min(1, 'Weight is required')
    .refine((val) => /^\d*\.?\d+$/.test(val), {
      message: 'Weight must be a valid number',
    })
    .refine((val) => parseFloat(val) > 0, {
      message: 'Weight must be a positive number',
    })
    .refine(
      (val) =>
        unit === 'METRIC'
          ? parseFloat(val) >= 20 && parseFloat(val) <= 500
          : parseFloat(val) >= 44 && parseFloat(val) <= 1100,
      {
        message:
          unit === 'METRIC'
            ? 'Weight must be between 20kg and 500kg'
            : 'Weight must be between 44lbs and 1100lbs',
      }
    )

const heightCmSchema = z
  .string()
  .min(1, 'Height is required')
  .refine((val) => /^\d*\.?\d+$/.test(val), {
    message: 'Height must be a valid number',
  })
  .refine((val) => parseFloat(val) > 0, {
    message: 'Height must be a positive number',
  })
  .refine((val) => parseFloat(val) >= 50 && parseFloat(val) <= 300, {
    message: 'Height must be between 50cm and 300cm',
  })

const heightFeetSchema = z
  .string()
  .min(1, 'Feet is required')
  .refine((val) => /^\d+$/.test(val), {
    message: 'Feet must be a valid number',
  })
  .refine((val) => parseInt(val, 10) >= 1 && parseInt(val, 10) <= 9, {
    message: 'Feet must be between 1 and 9',
  })

const heightInchesSchema = z
  .string()
  .min(1, 'Inches is required')
  .refine((val) => /^\d+$/.test(val), {
    message: 'Inches must be a valid number',
  })
  .refine((val) => parseInt(val, 10) >= 0 && parseInt(val, 10) <= 11, {
    message: 'Inches must be between 0 and 11',
  })


interface UserSettingsProps {
  userName: string
  userAge: string
  userHeight: { cm: string; feet: string; inches: string }
  userWeight: string
  unit: 'METRIC' | 'IMPERIAL'
  onStateChanged: (
    id: string,
    value: string,
    isValid: boolean,
    issues: ZodIssue[]
  ) => void
  setUnit: (unit: 'METRIC' | 'IMPERIAL') => void
}

const UserSettings: React.FC<UserSettingsProps> = ({
  userName,
  userAge,
  userHeight,
  userWeight,
  unit,
  onStateChanged,
  setUnit,
}) => {
  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <ValidatedTextField
        id="userName"
        fullWidth
        label="Your Name"
        placeholder="e.g., Jane Doe"
        value={userName}
        onStateChanged={onStateChanged}
        validationSchema={nameSchema}
      />
      <ValidatedTextField
        id="userAge"
        fullWidth
        label="Your Age"
        placeholder="e.g., 30"
        type="number"
        value={userAge}
        onStateChanged={onStateChanged}
        validationSchema={ageSchema}
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
        <ValidatedTextField
          id="userHeight.cm"
          fullWidth
          label="Your Height (cm)"
          placeholder="e.g., 175"
          type="number"
          value={userHeight.cm}
          onStateChanged={onStateChanged}
          validationSchema={heightCmSchema}
        />
      ) : (
        <Stack direction="row" spacing={2}>
          <ValidatedTextField
            id="userHeight.feet"
            fullWidth
            label="Feet"
            placeholder="e.g., 5"
            type="number"
            value={userHeight.feet}
            onStateChanged={onStateChanged}
            validationSchema={heightFeetSchema}
          />
          <ValidatedTextField
            id="userHeight.inches"
            fullWidth
            label="Inches"
            placeholder="e.g., 9"
            type="number"
            value={userHeight.inches}
            onStateChanged={onStateChanged}
            validationSchema={heightInchesSchema}
          />
        </Stack>
      )}
      <ValidatedTextField
        id="userWeight"
        fullWidth
        label={`Your Weight (${unit === 'METRIC' ? 'kg' : 'lbs'})`}
        placeholder={unit === 'METRIC' ? 'e.g., 70' : 'e.g., 154'}
        type="number"
        value={userWeight}
        onStateChanged={onStateChanged}
        validationSchema={weightSchema(unit)}
        validationDependencies={[unit]}
      />
    </Stack>
  )
}

export default UserSettings

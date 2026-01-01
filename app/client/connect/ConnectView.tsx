// app/client/connect/ConnectView.tsx
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import { ZodIssue } from 'zod'
import UserSettings from './UserSettings'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useUserSettings } from '@/hooks/useUserSettings'
import { convertHeight, convertWeight } from '@/utils/units'
import WorkoutSummary from './WorkoutSummary'
import { useDebounce } from 'use-debounce'

const ConnectView: React.FC = () => {
  const {
    userName,
    setUserName,
    userAge,
    setUserAge,
    userHeight,
    setUserHeight,
    userWeight,
    setUserWeight,
    unit,
    setUnit,
    maxHr,
    restingHr,
    savePending,
  } = useUserSettings()

  const [formState, setFormState] = useState({
    userName: { value: userName, isValid: true, issues: [] },
    userAge: { value: userAge, isValid: true, issues: [] },
    'userHeight.cm': { value: userHeight.cm, isValid: true, issues: [] },
    'userHeight.feet': { value: userHeight.feet, isValid: true, issues: [] },
    'userHeight.inches': {
      value: userHeight.inches,
      isValid: true,
      issues: [],
    },
    userWeight: { value: userWeight, isValid: true, issues: [] },
  })

  const [debouncedFormState] = useDebounce(formState, 500)

  useEffect(() => {
    setUserName(debouncedFormState.userName.value)
    setUserAge(debouncedFormState.userAge.value)
    setUserHeight({
      cm: debouncedFormState['userHeight.cm'].value,
      feet: debouncedFormState['userHeight.feet'].value,
      inches: debouncedFormState['userHeight.inches'].value,
    })
    setUserWeight(debouncedFormState.userWeight.value)
  }, [
    debouncedFormState,
    setUserName,
    setUserAge,
    setUserHeight,
    setUserWeight,
  ])

  const handleStateChanged = useCallback(
    (id: string, value: string, isValid: boolean, issues: ZodIssue[]) => {
      setFormState((prevState) => ({
        ...prevState,
        [id]: { value, isValid, issues },
      }))
    },
    []
  )

  const handleUnitChange = (newUnit: 'METRIC' | 'IMPERIAL') => {
    if (newUnit !== unit) {
      const { cm, feet, inches } = convertHeight(userHeight, newUnit)
      const newWeight = convertWeight(userWeight, newUnit)
      setUserHeight({ cm, feet, inches })
      setUserWeight(newWeight)
      setUnit(newUnit)
      setFormState((prevState) => ({
        ...prevState,
        'userHeight.cm': { ...prevState['userHeight.cm'], value: cm },
        'userHeight.feet': { ...prevState['userHeight.feet'], value: feet },
        'userHeight.inches': {
          ...prevState['userHeight.inches'],
          value: inches,
        },
        userWeight: { ...prevState.userWeight, value: newWeight },
      }))
    }
  }

  const isFormValid = Object.values(formState).every((field) => field.isValid)

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="HRM Connection"
              subheader="Connect your Heart Rate Monitor"
            />
            <CardContent>
              <HrmConnectionPanel isFormValid={isFormValid} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="User Settings"
              subheader="These settings are used to estimate calorie expenditure."
            />
            <CardContent>
              <UserSettings
                userName={formState.userName.value}
                userAge={formState.userAge.value}
                userHeight={formState.userHeight}
                userWeight={formState.userWeight.value}
                unit={unit}
                onStateChanged={handleStateChanged}
                setUnit={handleUnitChange}
              />
              <Box sx={{ mt: 2 }}>
                <Typography
                  variant="caption"
                  color={savePending ? 'text.secondary' : 'primary'}
                  sx={{
                    transition: 'color 0.3s ease',
                    fontWeight: savePending ? 'normal' : 'bold',
                  }}
                >
                  {savePending ? 'Saving...' : 'Settings saved'}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <WorkoutSummary maxHr={maxHr} restingHr={restingHr} />
        </Grid>
      </Grid>
    </Container>
  )
}

export default ConnectView

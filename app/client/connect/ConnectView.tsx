// app/client/connect/ConnectView.tsx
'use client'

import React, { useCallback, useEffect, useState } from 'react'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import { ZodIssue } from 'zod'
import UserSettings from './UserSettings'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useUserSettings } from '@/hooks/useUserSettings'
import { cmToFeetAndInches, feetAndInchesToCm, KG_TO_LBS } from '@/utils/units'
import WorkoutSummary from './WorkoutSummary'
import { useDebounce } from 'use-debounce'
import { useHrm } from '@/hooks/useHrm'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import BottomNavBar from '@/components/BottomNavBar'

const ConnectView: React.FC = () => {
  const {
    userName,
    setUserName,
    userAge,
    setUserAge,
    userGender,
    setUserGender,
    userHeight,
    setUserHeight,
    userWeight,
    setUserWeight,
    unit,
    setUnit,
    maxHr,
    restingHr,
  } = useUserSettings()

  const {
    isConnected,
    deviceStatus,
    onConnect,
    onDisconnect,
    onForgetDevice,
    isSupported,
    batteryLevel,
    bluetoothConnected,
  } = useHrm()

  const {
    startWorkout,
    endWorkout,
    resetWorkout,
    workoutStatus,
    hasStarted,
    workoutDuration,
    caloriesBurned,
  } = useWorkoutSession({ isConnected })

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
      let cm = parseFloat(userHeight.cm)
      let feet = parseFloat(userHeight.feet)
      let inches = parseFloat(userHeight.inches)

      if (newUnit === 'IMPERIAL') {
        const converted = cmToFeetAndInches(cm)
        feet = converted.feet
        inches = converted.inches
      } else {
        cm = feetAndInchesToCm(feet, inches)
      }

      const currentWeight = parseFloat(userWeight)
      const newWeight =
        newUnit === 'IMPERIAL'
          ? (currentWeight * KG_TO_LBS).toFixed(1)
          : (currentWeight / KG_TO_LBS).toFixed(1)

      setUserHeight({
        cm: isNaN(cm) ? '' : cm.toString(),
        feet: isNaN(feet) ? '' : feet.toString(),
        inches: isNaN(inches) ? '' : inches.toString(),
      })
      setUserWeight(newWeight)
      setUnit(newUnit)

      setFormState((prevState) => ({
        ...prevState,
        'userHeight.cm': {
          ...prevState['userHeight.cm'],
          value: isNaN(cm) ? '' : cm.toString(),
        },
        'userHeight.feet': {
          ...prevState['userHeight.feet'],
          value: isNaN(feet) ? '' : feet.toString(),
        },
        'userHeight.inches': {
          ...prevState['userHeight.inches'],
          value: isNaN(inches) ? '' : inches.toString(),
        },
        userWeight: { ...prevState.userWeight, value: newWeight },
      }))
    }
  }

  const isFormValid = Object.values(formState).every((field) => field.isValid)

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 10 }}>
      <Grid container spacing={4}>
        <Grid xs={12} md={6}>
          <Card>
            <CardHeader
              title="HRM Connection"
              subheader="Connect your Heart Rate Monitor"
            />
            <CardContent>
              <HrmConnectionPanel
                isConnected={isConnected}
                deviceStatus={deviceStatus}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
                onForgetDevice={onForgetDevice}
                isSupported={isSupported}
                batteryLevel={batteryLevel}
                isFormValid={isFormValid}
                bluetoothConnected={bluetoothConnected}
                onStartWorkout={startWorkout}
                onEndWorkout={endWorkout}
                onReset={resetWorkout}
                workoutStatus={workoutStatus}
                hasStarted={hasStarted}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={6}>
          <Card>
            <CardHeader
              title="User Settings"
              subheader="These settings are used to estimate calorie expenditure."
            />
            <CardContent>
              <UserSettings
                userName={formState.userName.value}
                userAge={formState.userAge.value}
                userGender={userGender}
                setUserGender={setUserGender}
                userHeight={formState.userHeight}
                userWeight={formState.userWeight.value}
                unit={unit}
                onStateChanged={handleStateChanged}
                setUnit={handleUnitChange}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12}>
          <WorkoutSummary
            maxHr={maxHr}
            restingHr={restingHr}
            duration={workoutDuration}
            caloriesBurned={caloriesBurned}
          />
        </Grid>
      </Grid>
      <BottomNavBar />
    </Container>
  )
}

export default ConnectView

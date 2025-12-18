'use client'

import { useEffect, useCallback, useState } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { debounce } from 'lodash'
import { z } from 'zod'

const UserProfileSchema = z.object({
  userName: z.string().min(1, 'Name is required'),
  userAge: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1, 'Age must be at least 1').max(120, 'Age must be 120 or less')
  ),
  userHeight: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z
      .number()
      .min(100, 'Height must be at least 100cm')
      .max(250, 'Height must be 250cm or less')
  ),
  userWeight: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z
      .number()
      .min(30, 'Weight must be at least 30kg')
      .max(200, 'Weight must be 200kg or less')
  ),
  assignedGenderAtBirth: z.union([
    z.literal('male'),
    z.literal('female'),
    z.literal('other'),
  ]),
})

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [userWeight, setUserWeight] = useLocalStorage('hrm-user-weight', '')
  const [assignedGenderAtBirth, setAssignedGenderAtBirth] = useLocalStorage(
    'hrm-user-gender',
    ''
  )
  const [errors, setErrors] = useState<z.ZodError | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
    disconnectionReason,
  } = useBluetoothHRM()

  const { connectionStatus, hrmData } = useWebSocket()

  useEffect(() => {
    const fetchProfile = async () => {
      if (userName) {
        try {
          const response = await fetch(`/api/profile/${userName}`)
          if (response.ok) {
            const profile = await response.json()
            setUserAge(profile.age?.toString() || '')
            setUserHeight(profile.height?.toString() || '')
            setUserWeight(profile.weight?.toString() || '')
            setAssignedGenderAtBirth(profile.assignedGenderAtBirth || '')
          }
        } catch (error) {
          console.error('Failed to fetch profile', error)
          setSaveError('Failed to load profile.')
        }
      }
    }
    fetchProfile()
  }, [
    userName,
    setUserAge,
    setUserHeight,
    setUserWeight,
    setAssignedGenderAtBirth,
  ])

  const saveProfile = useCallback(
    debounce(async (profileData) => {
      const result = UserProfileSchema.safeParse({
        userName,
        userAge,
        userHeight,
        userWeight,
        assignedGenderAtBirth,
      })
      if (result.success) {
        setErrors(null)
        setSaveError(null)
        if (userName) {
          try {
            const response = await fetch(`/api/profile/${userName}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(profileData),
            })
            if (!response.ok) {
              throw new Error('Failed to save profile')
            }
          } catch (error) {
            console.error('Failed to save profile', error)
            setSaveError('Failed to save profile.')
          }
        }
      } else {
        setErrors(result.error)
      }
    }, 500),
    [
      userName,
      userAge,
      userHeight,
      userWeight,
      assignedGenderAtBirth,
    ]
  )

  useEffect(() => {
    const profileData = {
      age: userAge ? parseInt(userAge, 10) : undefined,
      height: userHeight ? parseInt(userHeight, 10) : undefined,
      weight: userWeight ? parseInt(userWeight, 10) : undefined,
      assignedGenderAtBirth,
    }
    saveProfile(profileData)
  }, [userAge, userHeight, userWeight, assignedGenderAtBirth, saveProfile])

  let deviceStatusMessage = deviceStatus
  if (disconnectionReason === 'timeout') {
    deviceStatusMessage = 'Connection unstable. Trying to reconnect...'
  } else if (disconnectionReason === 'signal_loss') {
    deviceStatusMessage = 'Signal lost. Trying to reconnect...'
  }

  const handleConnect = () => {
    const age = userAge ? parseInt(userAge, 10) : 0
    const height = userHeight ? parseInt(userHeight, 10) : 0
    const weight = userWeight ? parseInt(userWeight, 10) : 0
    const gender = assignedGenderAtBirth as 'male' | 'female' | 'other'
    connectAndStream(userName, age, height, weight, gender)
  }

  const currentUserData = hrmData.find((d) => d.name === userName)
  const currentHR = currentUserData?.value || 0
  const totalCalories = currentUserData?.calories ?? 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  const {
    workoutDuration,
    caloriesBurned,
    resetWorkout,
    hasStarted,
    startWorkout,
    endWorkout,
    workoutStatus,
  } = useWorkoutSession({
    isConnected,
    totalCalories,
  })

  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={caloriesBurned}
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      userHeight={userHeight}
      setUserHeight={setUserHeight}
      userWeight={userWeight}
      setUserWeight={setUserWeight}
      assignedGenderAtBirth={assignedGenderAtBirth}
      setAssignedGenderAtBirth={setAssignedGenderAtBirth}
      isConnected={isConnected}
      deviceStatus={deviceStatusMessage}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={disconnect}
      onForgetDevice={forgetDevice}
      isSupported={isSupported}
      currentHR={currentHR}
      hrZoneProps={{
        percentage: hrZoneProps.percentage,
        progressColor: hrZoneProps.progressColor,
      }}
      connectionStatus={connectionStatus}
      bluetoothConnected={isConnected}
      hasStarted={hasStarted}
      onReset={resetWorkout}
      workoutStatus={workoutStatus}
      onStartWorkout={startWorkout}
      onEndWorkout={endWorkout}
      errors={errors}
      saveError={saveError}
    />
  )
}

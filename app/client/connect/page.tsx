'use client'

import { useEffect, useCallback } from 'react'
import useLocalStorage from '@/hooks/useLocalStorage'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { formatDuration } from '@/lib/utils'
import ConnectView from './ConnectView'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import { debounce } from 'lodash'

export default function ConnectPage() {
  const [userName, setUserName] = useLocalStorage('hrm-user-name', '')
  const [userAge, setUserAge] = useLocalStorage('hrm-user-age', '')
  const [userHeight, setUserHeight] = useLocalStorage('hrm-user-height', '')
  const [userWeight, setUserWeight] = useLocalStorage('hrm-user-weight', '')
  const [assignedGenderAtBirth, setAssignedGenderAtBirth] = useLocalStorage(
    'hrm-user-gender',
    ''
  )
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
      if (userName) {
        try {
          await fetch(`/api/profile/${userName}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(profileData),
          })
        } catch (error) {
          console.error('Failed to save profile', error)
        }
      }
    }, 500),
    [userName]
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
    />
  )
}

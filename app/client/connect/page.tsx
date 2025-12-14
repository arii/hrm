'use client'

import { useState, useEffect, useRef } from 'react'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import { formatDuration } from '../../../lib/utils'
import ConnectView from './ConnectView'

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)
  const [workoutDuration, setWorkoutDuration] = useState(0)
  const [caloriesBurned, setCaloriesBurned] = useState(0)

  // Destructure the new values from your updated hook
  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    batteryLevel,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  const { connectionStatus, hrmData } = useWebSocket()

  const handleConnect = () => {
    connectAndStream(userName, userAge)
  }

  const currentHR = hrmData.find((d) => d.name === userName)?.value || 0
  const maxHr = userAge ? 220 - parseInt(userAge) : 190
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)
  // Create a ref to hold the latest values for use in the interval
  const latestMetrics = useRef({
    currentHR,
    userAge: userAge ? parseInt(userAge) : 0,
    sessionStartTime,
  })

  useEffect(() => {
    latestMetrics.current = {
      currentHR,
      userAge: userAge ? parseInt(userAge) : 0,
      sessionStartTime,
    }
  }, [currentHR, userAge, sessionStartTime])

  useEffect(() => {
    if (isConnected) {
      if (!sessionStartTime) {
        setSessionStartTime(Date.now())
        setWorkoutDuration(0)
        setCaloriesBurned(0)
      }
    }
  }, [isConnected, sessionStartTime])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        // Use the ref here to get the latest values
        const {
          currentHR: hr,
          userAge: age,
          sessionStartTime: start,
        } = latestMetrics.current

        if (start) {
          // Update duration
          const durationInSeconds = Math.floor((Date.now() - start) / 1000)
          setWorkoutDuration(durationInSeconds)

          // Calculate calories if age and HR are valid
          if (age > 0 && hr > 0) {
            const weightKg = 75 // Standard weight
            const caloriesPerMinute =
              (age * 0.2017 -
                weightKg * 0.09036 +
                hr * 0.6309 -
                55.0969) /
              4.184
            const caloriesPerSecond = caloriesPerMinute / 60
            if (caloriesPerSecond > 0) {
              setCaloriesBurned((prevCalories) => prevCalories + caloriesPerSecond)
            }
          }
        }
      }, 1000)
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isConnected, sessionStartTime])

  return (
    <ConnectView
      duration={formatDuration(workoutDuration)}
      caloriesBurned={Math.round(caloriesBurned)}
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      isConnected={isConnected}
      deviceStatus={deviceStatus}
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
    />
  )
}

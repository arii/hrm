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

  const prevIsConnected = useRef(isConnected)

  useEffect(() => {
    if (isConnected && !prevIsConnected.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSessionStartTime(Date.now())
      setWorkoutDuration(0)
      setCaloriesBurned(0)
    }
    prevIsConnected.current = isConnected
  }, [isConnected])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isConnected && sessionStartTime) {
      interval = setInterval(() => {
        const {
          currentHR: hr,
          userAge: age,
          sessionStartTime: start,
        } = latestMetrics.current

        if (start) {
          const durationInSeconds = Math.floor((Date.now() - start) / 1000)
          setWorkoutDuration(durationInSeconds)

          if (age > 0 && hr > 0) {
            const weightKg = 75
            const caloriesPerMinute = (age * 0.2017 - weightKg * 0.09036 + hr * 0.6309 - 55.0969) / 4.184
            const caloriesPerSecond = caloriesPerMinute / 60
            if (caloriesPerSecond > 0) {
              setCaloriesBurned(
                (prevCalories) => prevCalories + caloriesPerSecond
              )
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

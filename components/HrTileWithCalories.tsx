// File: components/HrTileWithCalories.tsx
'use client'

import { useEffect } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import HrTile from './HrTile'
import { HrmData } from '@/types/websocket'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { useUserWeight } from '@/hooks/useUserWeight'
import { useHrZone } from '@/hooks/useHrZone'

interface HrTileWithCaloriesProps {
  user: HrmData
  isAlerting: boolean
  alertMessage?: string
}

const HrTileWithCalories = ({
  user,
  isAlerting,
  alertMessage,
}: HrTileWithCaloriesProps) => {
  const [userSettings] = useUserSettings()
  const { timerData } = useWebSocket()
  const [weightInKg] = useUserWeight()

  const { calories, resetCalories } = useCalorieCounter(
    user.value || 0,
    userSettings.userAge || 30,
    weightInKg || 70,
    timerData.isRunning
  )

  useEffect(() => {
    if (!timerData.isRunning) {
      resetCalories()
    }
  }, [timerData.isRunning, resetCalories])

  const hrZoneProps = useHrZone(user.value, user.maxHr || MAX_HR_DEFAULT)

  const hrTileProps = {
    name: user.name || '',
    bpm: user.value,
    percentMax: hrZoneProps.percentage,
    calories: calories,
    // TODO(issue-tracking): Track the connection status of the HrTile component with a separate issue (#000) for implementation.
    isConnected: true, // Hardcoded to true for now, as the connection status is handled at a higher level
    isAlerting: isAlerting,
    ...(alertMessage && { alertMessage }),
  }

  return <HrTile {...hrTileProps} />
}

export default HrTileWithCalories

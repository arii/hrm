// File: components/HrTileWithCalories.tsx
'use client'

import { useEffect } from 'react'
import { useUserSettings } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import HrTile from './HrTile'
import { HrmData } from '@/types/websocket'
import { MAX_HR_DEFAULT } from '@/utils/constants'
import { useHrZone } from '@/hooks/useHrZone'
import { UserPreferences } from '@/hooks/useUserPreferences'

interface HrTileWithCaloriesProps {
  user: HrmData
  isAlerting: boolean
  alertMessage?: string
  userPreferences: UserPreferences
}

const HrTileWithCalories = ({
  user,
  isAlerting,
  alertMessage,
  userPreferences,
}: HrTileWithCaloriesProps) => {
  const [userSettings] = useUserSettings()
  const { timerData } = useWebSocket()

  const { calories, resetCalories } = useCalorieCounter(
    user.value || 0,
    userSettings.userAge || 30,
    userPreferences.userWeight || 70,
    timerData.isRunning
  )

  useEffect(() => {
    if (!timerData.isRunning) {
      resetCalories()
    }
  }, [timerData.isRunning, resetCalories])

  const hrZoneProps = useHrZone(user.value, user.maxHr || MAX_HR_DEFAULT)

  // Use a runtime check for isConnected if it exists on the object but not the type,
  // or fall back to true. This heuristic helps until the type definition is updated.
  const isConnected =
    'isConnected' in user
      ? (user as { isConnected: boolean }).isConnected
      : true

  const hrTileProps = {
    name: user.name || '',
    bpm: user.value,
    percentMax: hrZoneProps.percentage,
    calories: calories,
    isConnected,
    isAlerting: isAlerting,
    ...(alertMessage && { alertMessage }),
  }

  return <HrTile {...hrTileProps} />
}

export default HrTileWithCalories

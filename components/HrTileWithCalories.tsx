// File: components/HrTileWithCalories.tsx
'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import HrTile from './HrTile'
import { HrmData } from '@/types/websocket'
import { MAX_HR_DEFAULT } from '@/utils/constants'

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
  const { timerData } = useWebSocket()

  // Use a runtime check for isConnected if it exists on the object but not the type,
  // or fall back to true. This heuristic helps until the type definition is updated.
  const isConnected =
    'isConnected' in user
      ? (user as { isConnected: boolean }).isConnected
      : true

  const hrTileProps = {
    name: user.name || '',
    bpm: user.value,
    percentMax: 0,
    calories: 0,
    isConnected,
    isAlerting: isAlerting,
    ...(alertMessage && { alertMessage }),
  }

  return <HrTile {...hrTileProps} />
}

export default HrTileWithCalories

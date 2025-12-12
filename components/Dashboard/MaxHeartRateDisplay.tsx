// src/components/Dashboard/MaxHeartRateDisplay.tsx
'use client'

import { Card, CardContent, Typography } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo } from 'react'

const MaxHeartRateDisplay = () => {
  const { hrmData } = useWebSocket()

  const maxHeartRate = useMemo(() => {
    if (hrmData.length === 0) {
      return '...'
    }
    return Math.max(...hrmData.map((data) => data.value))
  }, [hrmData])

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Max Heart Rate</Typography>
        <Typography variant="h4">{maxHeartRate} BPM</Typography>
      </CardContent>
    </Card>
  )
}

export default MaxHeartRateDisplay

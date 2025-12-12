// src/components/Dashboard/HeartRateDisplay.tsx
'use client'

import { Card, CardContent, Typography } from '@mui/material'
import { useWebSocket } from '@/context/WebSocketContext'

const HeartRateDisplay = () => {
  const { hrmData } = useWebSocket()
  let latestHeartRate: string | number = '...'
  if (hrmData && hrmData.length > 0) {
    const lastReading = hrmData[hrmData.length - 1]
    if (lastReading) {
      latestHeartRate = lastReading.value
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Live Heart Rate</Typography>
        <Typography variant="h4">{latestHeartRate} BPM</Typography>
      </CardContent>
    </Card>
  )
}

export default HeartRateDisplay

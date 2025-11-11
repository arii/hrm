'use client'

import { useState } from 'react'
import { Container, Typography, Button, Box } from '@mui/material'
import useWebSocket from '../../../hooks/useWebSocket'
import { HrmInputMessage } from '../../../types/websocket'
import BottomNavBar from '../../../components/BottomNavBar'

const HR_ZONES = [
  { label: 'Rest (60)', value: 60 },
  { label: 'Zone 1 (120)', value: 120 },
  { label: 'Zone 2 (140)', value: 140 },
  { label: 'Zone 3 (160)', value: 160 },
  { label: 'Zone 4 (180)', value: 180 },
  { label: 'Max (200)', value: 200 },
]

export default function MockPage() {
  const [currentHR, setCurrentHR] = useState(0)
  const { connectionStatus, sendData } = useWebSocket()

  const sendMockData = (heartRate: number) => {
    setCurrentHR(heartRate)
    const message: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: {
        value: heartRate,
        maxHr: 200,
        name: 'Mock HRM',
        age: 30,
      },
    }
    sendData(message)
  }

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Mock HRM Client
        </Typography>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" color="text.secondary">
            Current HR: {currentHR} BPM
          </Typography>
          <Typography variant="body2" color="text.secondary">
            WebSocket: {connectionStatus}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {HR_ZONES.map((zone) => (
            <Button
              key={zone.value}
              variant="outlined"
              size="large"
              onClick={() => sendMockData(zone.value)}
              disabled={connectionStatus !== 'Connected'}
            >
              {zone.label}
            </Button>
          ))}
        </Box>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => sendMockData(0)}
            disabled={connectionStatus !== 'Connected'}
          >
            Stop
          </Button>
        </Box>
      </Container>
      <BottomNavBar />
    </>
  )
}

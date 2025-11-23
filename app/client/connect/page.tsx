'use client'

import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import HrTile from '../../../components/HrTile'
import { useUserSettings } from '@/contexts/UserSettingsContext'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'

export default function ConnectPage() {
  const { userSettings } = useUserSettings()
  const { userName, userAge } = userSettings
  const [isConnected, setIsConnected] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)
  const { connectionStatus, hrmData } = useWebSocket()

  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    isConnected: bluetoothConnected,
  } = useBluetoothHRM()

  // Auto-connect only once when WebSocket first connects and we're not already connected
  useEffect(() => {
    if (
      userName &&
      userAge &&
      connectionStatus === 'Connected' &&
      !bluetoothConnected &&
      !deviceStatus.includes('Connecting')
    ) {
      connectAndStream(userName, String(userAge))
    }
  }, [
    connectionStatus,
    connectAndStream,
    bluetoothConnected,
    deviceStatus,
    userName,
    userAge,
  ])

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setIsConnected(bluetoothConnected)
  }, [bluetoothConnected])

  const handleConnect = async () => {
    setAlertMessage(null)
    if (!userName || userName.trim() === '') {
      setAlertMessage('Please set your name in the settings page.')
      return
    }
    if (!userAge || userAge < 1 || userAge > 120) {
      setAlertMessage('Please set a valid age (1-120) in the settings page.')
      return
    }
    await connectAndStream(userName, String(userAge))
  }

  // Find current user's heart rate data from WebSocket
  const currentUserData = hrmData.find(
    (user) => user.name === userName || user.name?.includes('Bluetooth HRM')
  )
  const currentHR = currentUserData?.value || 0
  const maxHr = 220 - (parseInt(userAge) || 30)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Connect Heart Rate Monitor
        </Typography>

        {!userName || !userAge ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please set your name and age on the{' '}
            <a href="/settings">settings page</a> before connecting.
          </Alert>
        ) : (
          <Typography align="center" sx={{ mb: 2 }}>
            Connecting as: <strong>{userName}</strong> (Age: {userAge})
          </Typography>
        )}

        {alertMessage && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}

        {deviceStatus.includes('Failed') && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {deviceStatus}
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {!isConnected ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleConnect}
              disabled={!userName || !userAge}
            >
              Connect Bluetooth HRM
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="large"
              onClick={disconnect}
              color="error"
            >
              Disconnect
            </Button>
          )}
        </Box>

        {isConnected && bluetoothConnected && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Connected! Heart rate data is being streamed.
          </Alert>
        )}

        {isConnected && currentHR > 0 && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <HrTile
                name={userName}
                bpm={currentHR}
                percentMax={hrZoneProps.percentage}
                background={hrZoneProps.progressColor}
              />
            </Grid>
          </Grid>
        )}

        {isConnected && currentHR === 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Connected but no heart rate detected. Make sure your heart rate
            monitor is properly positioned and active.
          </Alert>
        )}

        <Typography
          variant="body2"
          color="text.secondary"
          align="center"
          sx={{ mt: 2 }}
        >
          WebSocket: {connectionStatus}
        </Typography>
      </Container>
      <BottomNavBar />
    </>
  )
}

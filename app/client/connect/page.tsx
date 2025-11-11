'use client'

import { useState, useEffect } from 'react'

// Cookie helpers
const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

const getCookie = (name: string): string => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '')
}
import {
  Container,
  Typography,
  Button,
  TextField,
  Box,
  Alert,
  Grid,
} from '@mui/material'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import useWebSocket from '../../../hooks/useWebSocket'
import HrTile from '../../../components/HrTile'
import { getHrZoneProps } from '../../../utils/visualization'
import BottomNavBar from '../../../components/BottomNavBar'

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const { connectionStatus, hrmData } = useWebSocket()

  const {
    connectAndStream,
    deviceStatus,
    isConnected: bluetoothConnected,
  } = useBluetoothHRM()

  // Load saved values from cookies on mount and auto-connect if available
  useEffect(() => {
    const savedName = getCookie('hrm_user_name')
    const savedAge = getCookie('hrm_user_age')
    const savedDeviceId = getCookie('hrm_device_id')
    if (savedName) setUserName(savedName)
    if (savedAge) setUserAge(savedAge)

    // Auto-connect only once when WebSocket first connects and we're not already connected
    if (
      savedName &&
      savedAge &&
      savedDeviceId &&
      connectionStatus === 'Connected' &&
      !bluetoothConnected &&
      !deviceStatus.includes('Connecting')
    ) {
      connectAndStream(savedName, savedAge)
    }
  }, [connectionStatus, connectAndStream, bluetoothConnected, deviceStatus])

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        ;(window as any).__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setIsConnected(bluetoothConnected)
  }, [bluetoothConnected])

  const handleConnect = async () => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }
    if (!userAge.trim() || parseInt(userAge) < 1 || parseInt(userAge) > 120) {
      alert('Please enter a valid age (1-120)')
      return
    }
    // Save to cookies
    setCookie('hrm_user_name', userName.trim())
    setCookie('hrm_user_age', userAge.trim())
    await connectAndStream(userName, userAge)
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

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Your Age"
            type="number"
            value={userAge}
            onChange={(e) => setUserAge(e.target.value)}
            inputProps={{ min: 1, max: 120 }}
            sx={{ mb: 2 }}
          />
        </Box>

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
              disabled={!userName.trim() || !userAge.trim()}
            >
              Connect Bluetooth HRM
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                setIsConnected(false)
                // Clear saved device to force new pairing
                document.cookie =
                  'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
              }}
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
            Connected but no heart rate detected. Make sure your heart rate monitor is properly positioned and active.
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

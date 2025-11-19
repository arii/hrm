'use client'

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import HrTile from '../../../components/HrTile'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import useWebSocket from '../../../hooks/useWebSocket'
import { getHrZoneProps } from '../../../utils/visualization'

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

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const { connectionStatus, hrmData } = useWebSocket()
  const { connectAndStream, hrmState } = useBluetoothHRM()

  const isConnecting =
    hrmState.status === 'CONNECTING' || hrmState.status === 'RECONNECTING'
  const isConnected = hrmState.status === 'CONNECTED'

  // Load saved values from cookies on mount and auto-connect if available
  useEffect(() => {
    const savedName = getCookie('hrm_user_name')
    const savedAge = getCookie('hrm_user_age')
    const savedDeviceId = getCookie('hrm_device_id')
    if (savedName) setUserName(savedName)
    if (savedAge) setUserAge(savedAge)

    // Auto-connect logic
    if (
      savedName &&
      savedAge &&
      savedDeviceId &&
      connectionStatus === 'Connected' &&
      hrmState.status === 'DISCONNECTED'
    ) {
      connectAndStream(savedName, savedAge)
    }
  }, [connectionStatus, hrmState.status, connectAndStream])

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

        {hrmState.status === 'ERROR' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {hrmState.message}
          </Alert>
        )}

        {(hrmState.status === 'CONNECTING' ||
          hrmState.status === 'RECONNECTING') && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {hrmState.message}
          </Alert>
        )}

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {!isConnected ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleConnect}
              disabled={
                !userName.trim() || !userAge.trim() || isConnecting
              }
              startIcon={isConnecting && <CircularProgress size={20} />}
            >
              {isConnecting ? 'Connecting...' : 'Connect Bluetooth HRM'}
            </Button>
          ) : (
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                // Disconnect logic might go into the hook in the future
                document.cookie =
                  'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
                window.location.reload() // Force a state reset
              }}
              color="error"
            >
              Disconnect
            </Button>
          )}
        </Box>

        {isConnected && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {hrmState.message}
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

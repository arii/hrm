/**
 * File: app/client/connect/page.tsx
 * Refactored to prioritize HR Data visibility post-connection.
 */
'use client'

import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Fade,
} from '@mui/material'
import { useEffect, useState, useRef } from 'react'
import BottomNavBar from '@/components/BottomNavBar'
import HrTile from '@/components/HrTile'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '@/utils/visualization'
import { calculateCaloriesBurned } from '@/utils/calculations'
import LiveWorkoutStats from '@/components/LiveWorkoutStats'

// --- Interfaces ---
interface HeartRateDataPoint {
  timestamp: number
  value: number
}

// --- Helper Functions ---
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}:${s}`
}

const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
  return ''
}

export default function ConnectPage() {
  // State
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [liveDuration, setLiveDuration] = useState('00:00:00')
  const [liveCalories, setLiveCalories] = useState(0)

  // Refs
  const hrHistoryRef = useRef<HeartRateDataPoint[]>([])

  // Hooks
  const { connectionStatus, hrmData } = useWebSocket()
  const {
    connectAndStream,
    deviceStatus,
    isConnected: bluetoothConnected,
  } = useBluetoothHRM()

  // --- Effects ---

  // 1. Auto-load and Auto-connect
  useEffect(() => {
    const savedName = getCookie('hrm_user_name')
    const savedAge = getCookie('hrm_user_age')
    const savedDeviceId = getCookie('hrm_device_id')

    if (savedName) setUserName(savedName)
    if (savedAge) setUserAge(savedAge)

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

  // 2. Sync local connection state with Bluetooth hook
  useEffect(() => {
    setIsConnected(bluetoothConnected)
  }, [bluetoothConnected])

  // 3. Track HR History
  const currentUserData = hrmData.find(
    (user) => user.name === userName || user.name?.includes('Bluetooth HRM')
  )
  const currentHR = currentUserData?.value || 0

  useEffect(() => {
    if (isConnected && currentHR > 0) {
      hrHistoryRef.current.push({ timestamp: Date.now(), value: currentHR })
    }

    // Live Stats Calculation
    if (isConnected && hrHistoryRef.current.length > 1) {
      const age = parseInt(userAge) || 30
      const calories = calculateCaloriesBurned(age, hrHistoryRef.current)
      setLiveCalories(calories)

      const startTime = hrHistoryRef.current[0]!.timestamp
      const now = Date.now()
      const durationSeconds = (now - startTime) / 1000
      setLiveDuration(formatDuration(durationSeconds))
    } else {
      // Reset when not connected or not enough data
      setLiveDuration('00:00:00')
      setLiveCalories(0)
    }
  }, [isConnected, currentHR, userAge])

  // --- Handlers ---

  const handleConnect = async () => {
    if (!userName.trim()) return alert('Please enter your name')
    const ageNum = parseInt(userAge)
    if (!userAge.trim() || ageNum < 1 || ageNum > 120)
      return alert('Invalid age')

    // Reset state for a new session
    hrHistoryRef.current = []

    setCookie('hrm_user_name', userName.trim())
    setCookie('hrm_user_age', userAge.trim())
    await connectAndStream(userName, userAge)
  }

  const handleDisconnect = () => {
    // 2. Update State
    setIsConnected(false)

    // 3. Clear session data
    hrHistoryRef.current = []
    document.cookie =
      'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    window.location.reload() // Re-introducing reload for a clean state reset
  }

  // --- Data Derived ---
  const maxHr = 220 - (parseInt(userAge) || 30)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  return (
    <>
      <Container
        maxWidth="sm"
        sx={{
          py: 3,
          pb: 12, // Space for BottomNavBar
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* VIEW 1: ACTIVE SESSION (Connected) */}
        {isConnected ? (
          <Fade in={true}>
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              {/* 1. Status Header */}
              <Box sx={{ mb: 2, textAlign: 'center' }}>
                <Typography
                  variant="overline"
                  color="success.main"
                  fontWeight="bold"
                >
                  ● LIVE STREAMING
                </Typography>
              </Box>

              {/* 2. Main HR Tile (Top Priority) */}
              <Box sx={{ mb: 3 }}>
                <HrTile
                  name={userName}
                  bpm={currentHR}
                  percentMax={hrZoneProps.percentage}
                  isAlerting={currentHR === 0}
                  alertMessage="Waiting for data... Check device fit."
                />
              </Box>

              {/* 3. Live Workout Stats */}
              <LiveWorkoutStats
                duration={liveDuration}
                calories={liveCalories}
              />

              {/* 4. Minimized Profile Info */}
              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 2, bgcolor: 'background.paper' }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      SESSION PROFILE
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {userName}{' '}
                      <Typography component="span" color="text.secondary">
                        ({userAge}yo)
                      </Typography>
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    WS: {connectionStatus}
                  </Typography>
                </Box>
              </Paper>

              {/* 5. Disconnect (Pushed to bottom) */}
              <Box sx={{ mt: 'auto', pt: 2 }}>
                <Button
                  variant="outlined"
                  color="error"
                  size="large"
                  fullWidth
                  onClick={handleDisconnect}
                  sx={{
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 },
                  }}
                >
                  STOP & DISCONNECT
                </Button>
              </Box>
            </Box>
          </Fade>
        ) : (
          /* VIEW 2: CONNECTION FORM (Disconnected) */
          <Box sx={{ mt: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              align="center"
              fontWeight="bold"
            >
              Connect Device
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mb: 4 }}
            >
              Enter your details to calculate accurate heart rate zones.
            </Typography>

            <Box sx={{ mb: 4 }}>
              <TextField
                fullWidth
                label="Athlete Name"
                variant="outlined"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                sx={{ mb: 3 }}
              />
              <TextField
                fullWidth
                label="Age"
                type="number"
                variant="outlined"
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                inputProps={{ min: 1, max: 120 }}
              />
            </Box>

            {deviceStatus.includes('Failed') && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {deviceStatus}
              </Alert>
            )}

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleConnect}
              disabled={!userName.trim() || !userAge.trim()}
              sx={{ py: 2, fontSize: '1.1rem' }}
            >
              Connect Bluetooth HRM
            </Button>

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Server Status: {connectionStatus}
              </Typography>
            </Box>
          </Box>
        )}
      </Container>

      <BottomNavBar />
    </>
  )
}

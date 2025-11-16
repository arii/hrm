// File: app/client/connect/page.tsx
'use client'

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import HrTile from '@/components/HrTile'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import useWebSocket from '@/hooks/useWebSocket'
import { getHrZoneProps } from '@/utils/visualization'
import { setCookie, getCookie } from '@/utils/cookie'

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: '',
  })
  const { connectionStatus, hrmData } = useWebSocket()
  const { connectAndStream, deviceStatus, isConnected: bluetoothConnected } = useBluetoothHRM()

  // Load saved user info from cookies
  useEffect(() => {
    setUserName(getCookie('hrm_user_name') || '')
    setUserAge(getCookie('hrm_user_age') || '')
  }, [])

  const handleConnect = async () => {
    if (!userName.trim() || !userAge.trim()) {
      setSnackbar({ open: true, message: 'Please enter your name and age.' })
      return
    }
    const age = parseInt(userAge)
    if (isNaN(age) || age < 1 || age > 120) {
      setSnackbar({ open: true, message: 'Please enter a valid age (1-120).' })
      return
    }
    setCookie('hrm_user_name', userName.trim())
    setCookie('hrm_user_age', age.toString())
    await connectAndStream(userName, age.toString())
  }

  // Find the current user's HR data from the WebSocket feed
  const currentUserData = hrmData.find((user) => user.name === userName)
  const currentHR = currentUserData?.value || 0
  const maxHr = 220 - (parseInt(userAge) || 30)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  return (
    <>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h4" component="h1" gutterBottom align="center">
              Connect HRM
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              align="center"
              sx={{ mb: 3 }}
            >
              Enter your details and pair your Bluetooth heart rate monitor to get started.
            </Typography>

            <Stack spacing={2} sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Your Name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                variant="outlined"
              />
              <TextField
                fullWidth
                label="Your Age"
                type="number"
                value={userAge}
                onChange={(e) => setUserAge(e.target.value)}
                variant="outlined"
              />
            </Stack>

            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Button
                variant="contained"
                size="large"
                onClick={handleConnect}
                disabled={bluetoothConnected || !userName.trim() || !userAge.trim()}
              >
                {bluetoothConnected ? 'Connected' : 'Connect Bluetooth HRM'}
              </Button>
            </Box>

            {deviceStatus && (
              <Alert
                severity={
                  deviceStatus.includes('Failed')
                    ? 'error'
                    : deviceStatus.includes('Connecting')
                      ? 'info'
                      : 'success'
                }
                sx={{ mb: 2 }}
              >
                {deviceStatus}
              </Alert>
            )}
          </CardContent>
        </Card>

        {bluetoothConnected && currentHR > 0 && (
          <Box sx={{ mt: 3 }}>
            <HrTile
              name={userName}
              bpm={currentHR}
              percentMax={hrZoneProps.percentage}
              color={hrZoneProps.color}
            />
          </Box>
        )}

        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
          <Chip
            label={`WebSocket: ${connectionStatus}`}
            color={connectionStatus === 'Connected' ? 'success' : 'warning'}
            variant="outlined"
            size="small"
          />
        </Stack>
      </Container>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </>
  )
}

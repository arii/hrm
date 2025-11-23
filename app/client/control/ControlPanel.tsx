// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import {
  Box,
  Container,
  FormControlLabel,
  Switch,
  Typography,
  Skeleton, // Added from origin/leader
} from '@mui/material'
import Head from 'next/head'
import { useEffect, useState, useCallback } from 'react'
import useWebSocket from '../../../hooks/useWebSocket' // Keeping HEAD's useWebSocket
import useWakeLock from '../../../hooks/useWakeLock'
import SpotifyControls from './components/SpotifyControls'
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus, timerData, connect } = useWebSocket() // Connect added from origin/leader
  const {
    request: requestWakeLock,
    release: releaseWakeLock,
    isActive: isWakeLockActive,
    isSupported: isWakeLockSupported,
  } = useWakeLock()
  const [keepScreenOn, setKeepScreenOn] = useState(true)

  const manageWakeLock = useCallback(async () => {
    if (isWakeLockSupported && keepScreenOn && timerData.isRunning) { // Added isWakeLockSupported check
      await requestWakeLock()
    } else {
      await releaseWakeLock()
    }
  }, [isWakeLockSupported, keepScreenOn, timerData.isRunning, requestWakeLock, releaseWakeLock]) // Added isWakeLockSupported

  // Effect to manage wake lock when relevant state changes
  useEffect(() => {
    manageWakeLock()
  }, [manageWakeLock])

  // Effect to handle page visibility changes for both wake lock and WebSocket reconnect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Reconnect WebSocket if not connected (from origin/leader)
        if (connectionStatus !== 'Connected') {
          console.log(
            '[ControlPanel] Page visible, attempting to reconnect WebSocket...'
          )
          connect()
        }
        // Manage wake lock (from HEAD)
        manageWakeLock()
      } else {
        // Release wake lock when page is hidden (good practice)
        releaseWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseWakeLock() // Release on component unmount
    }
  }, [connectionStatus, connect, manageWakeLock, releaseWakeLock]) // Added connectionStatus, connect

  // Signal when page is ready for testing (existing block)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <Head>
        <title>HRM Control Panel</title>
        <meta
          name="description"
          content="Heart Rate Monitor Control Panel - Timer and Spotify Controls"
        />
      </Head>
      <Container
        maxWidth="xs"
        sx={{
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {/* Status Indicators */}
        <Box
          sx={{
            mb: 2,
            textAlign: 'center',
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: connectionStatus === 'Connected' ? 'green' : 'orange',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.1)',
              px: 2,
              py: 1,
              borderRadius: 1,
              display: 'inline-block',
            }}
          >
            Server: {connectionStatus}
          </Typography>
          {isWakeLockSupported && (
            <FormControlLabel
              control={
                <Switch
                  checked={keepScreenOn}
                  onChange={(e) => setKeepScreenOn(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {isWakeLockActive ? 'Screen On' : 'Screen Off'}
                </Typography>
              }
              sx={{ mr: 0 }}
            />
          )}
        </Box>

        <TimerControls />
        <SpotifyControls />
      </Container>
    </>
  )
}

export default ControlPanel
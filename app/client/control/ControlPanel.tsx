// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
<<<<<<< HEAD
import {
  Box,
  Container,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material'
import Head from 'next/head'
import { useEffect, useState, useCallback } from 'react'
import useWebSocket from '../../../hooks/useWebSocket'
import useWakeLock from '../../../hooks/useWakeLock'
import SpotifyControls from './components/SpotifyControls'
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus, timerData } = useWebSocket()
  const {
    request: requestWakeLock,
    release: releaseWakeLock,
    isActive: isWakeLockActive,
    isSupported: isWakeLockSupported,
  } = useWakeLock()
  const [keepScreenOn, setKeepScreenOn] = useState(true)

  const manageWakeLock = useCallback(async () => {
    if (keepScreenOn && timerData.isRunning) {
      await requestWakeLock()
    } else {
      await releaseWakeLock()
    }
  }, [keepScreenOn, timerData.isRunning, requestWakeLock, releaseWakeLock])

  useEffect(() => {
    manageWakeLock()
  }, [manageWakeLock])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        manageWakeLock()
=======
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Head from 'next/head'
import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import dynamic from 'next/dynamic'

const SpotifyControls = dynamic(
  () => import('./components/SpotifyControls'),
  { loading: () => <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 1, mb: 2 }}/> }
)
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus, connect } = useWebSocket()

  // Reconnect on page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        connectionStatus !== 'Connected'
      ) {
        console.log(
          '[ControlPanel] Page visible, attempting to reconnect WebSocket...'
        )
        connect() // Attempt to reconnect
>>>>>>> origin/leader
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
<<<<<<< HEAD

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseWakeLock() // Release on component unmount
    }
  }, [manageWakeLock, releaseWakeLock])
=======
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connectionStatus, connect])
>>>>>>> origin/leader

  // Signal when page is ready for testing
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

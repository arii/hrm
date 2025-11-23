// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Head from 'next/head'
import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import SpotifyControls from './components/SpotifyControls'
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
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [connectionStatus, connect])

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
        {/* Connection Status */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
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
        </Box>

        <TimerControls />
        <SpotifyControls />
      </Container>
    </>
  )
}

export default ControlPanel

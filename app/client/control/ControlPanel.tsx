// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Head from 'next/head'
import { useEffect } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import dynamic from 'next/dynamic'

const SpotifyControls = dynamic(() => import('./components/SpotifyControls'), {
  loading: () => (
    <Skeleton
      variant="rectangular"
      height={280}
      sx={{ borderRadius: 1, mb: 2 }}
    />
  ),
})
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus, connect, sendData } = useWebSocket()

  // Register this client as a controller
  useEffect(() => {
    if (connectionStatus === 'Connected') {
      console.log('[ControlPanel] Registering as controller')
      sendData({ type: 'REGISTER_CLIENT', role: 'controller' })
    }
  }, [connectionStatus, sendData])

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(window as any).__TEST_READY__ = true
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
          py: 1,
          px: 1,
          minHeight: '100vh',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Connection Status */}
        <Box sx={{ mb: 1, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: connectionStatus === 'Connected' ? 'green' : 'orange',
              fontWeight: 'bold',
              backgroundColor: 'rgba(0,0,0,0.1)',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              display: 'inline-block',
            }}
          >
            Server: {connectionStatus}
          </Typography>
        </Box>

        <TimerControls />
        <Box sx={{ height: 8 }} />
        <SpotifyControls />
      </Container>
    </>
  )
}

export default ControlPanel

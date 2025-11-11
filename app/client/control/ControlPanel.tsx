// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import Head from 'next/head'
import { Box, Container, Typography } from '@mui/material'
import useWebSocket from '../../../hooks/useWebSocket'
import SpotifyControls from './components/SpotifyControls'
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus } = useWebSocket()

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

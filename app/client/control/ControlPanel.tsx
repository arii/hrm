// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import { Box, Container, Typography, Chip, Stack } from '@mui/material'
import { useEffect } from 'react'
import useWebSocket from '../../../hooks/useWebSocket'
import SpotifyControls from './components/SpotifyControls'
import TimerControls from './components/TimerControls'

const ControlPanel = () => {
  const { connectionStatus } from useWebSocket()

  // Signal when page is ready for testing
  useEffect(() => {
    // A brief delay to allow the UI to settle before signaling readiness
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 500) // Reduced delay as components are simpler now

    return () => clearTimeout(timer)
  }, [])

  return (
    <Container
      maxWidth="xs"
      sx={{
        py: { xs: 2, sm: 4 }, // Increased vertical padding
      }}
    >
      <Stack spacing={3}>
        {/* Page Header */}
        <Box textAlign="center">
          <Typography variant="h4" component="h1" gutterBottom>
            Control Panel
          </Typography>
          <Chip
            label={`Server: ${connectionStatus}`}
            color={connectionStatus === 'Connected' ? 'success' : 'warning'}
            variant="outlined"
            size="small"
          />
        </Box>

        {/* Timer and Spotify Controls */}
        <TimerControls />
        <SpotifyControls />
      </Stack>
    </Container>
  )
}

export default ControlPanel

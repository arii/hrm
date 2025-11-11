// File: app/client/control/ControlPanel.tsx (Workout Control Panel - Phone UI)
/**
 * Workout Control Panel (Phone UI): Allows the user to control the Tabata Timer
 * and send Spotify playback commands. Simulates a mobile interface.
 */
'use client'
import Head from 'next/head'
import { Container } from '@mui/material'
import TimerControls from './components/TimerControls'
import SpotifyControls from './components/SpotifyControls'

const ControlPanel = () => {
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
        <TimerControls />
        <SpotifyControls />
      </Container>
    </>
  )
}

export default ControlPanel

'use client'

import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Divider from '@mui/material/Divider'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Button from '@mui/material/Button'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Link from 'next/link'
import Image from 'next/image'

export default function GuidePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography
        variant="h3"
        component="h1"
        gutterBottom
        sx={{ fontWeight: 'bold' }}
      >
        User Guide
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Comprehensive documentation for using the Heart Rate Monitor Dashboard,
        Timer, and Spotify integration.
      </Typography>

      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* 1. Web Bluetooth Monitoring */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom id="bluetooth">
            1. Web Bluetooth Monitoring
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography paragraph>
            The dashboard supports real-time heart rate monitoring using the Web
            Bluetooth API. This allows you to connect compatible BLE (Bluetooth
            Low Energy) heart rate monitors directly to your browser without
            needing a native mobile app.
          </Typography>

          <Box
            sx={{
              my: 3,
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Image
              src="/screenshots/connect-baseline.png"
              alt="Bluetooth Connection Screen"
              width={800}
              height={450}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            How to Connect:
          </Typography>
          <List dense>
            <ListItem>
              <ListItemText
                primary="Step 1: Navigate to the Connection Page"
                secondary="Click on 'Stream HR' in the bottom navigation bar or go to /client/connect."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Step 2: Enter User Details"
                secondary="Input your Name and Age. This information is used to calculate your Max Heart Rate and zones."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Step 3: Connect Device"
                secondary="Click the 'Connect HRM' button. A browser dialog will appear scanning for Bluetooth devices."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Step 4: Select Your Device"
                secondary="Choose your heart rate monitor from the list and pair it."
              />
            </ListItem>
          </List>

          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            component={Link}
            href="/client/connect"
            sx={{ mt: 2 }}
          >
            Go to Connection Page
          </Button>
        </Paper>

        {/* 2. Fitness Timer */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom id="timer">
            2. Fitness Timer
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography paragraph>
            The dashboard features a synchronized Tabata timer that is visible
            to all connected clients. It supports two main modes:{' '}
            <strong>Tabata</strong> (Interval Training) and{' '}
            <strong>Stopwatch</strong>.
          </Typography>

          <Box
            sx={{
              my: 3,
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Image
              src="/screenshots/dashboard-baseline.png"
              alt="Dashboard with Timer"
              width={800}
              height={450}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Features:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Shared State"
                secondary="The timer state is managed by the server. If you start the timer on your phone, it starts on the big screen dashboard instantly."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Audio Feedback"
                secondary="The dashboard plays audio cues for countdowns (3-2-1) and phase changes (Work/Rest). Ensure audio is enabled on the main dashboard display."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Control"
                secondary="Use the 'Phone Controls' page (/client/control) to start, stop, pause, and configure the timer remotely."
              />
            </ListItem>
          </List>

          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            component={Link}
            href="/client/control"
            sx={{ mt: 2 }}
          >
            Open Timer Controls
          </Button>
        </Paper>

        {/* 3. Google Doc Integration */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom id="googledoc">
            3. Google Doc Integration
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography paragraph>
            The dashboard embeds a Google Doc to display the daily training
            regimen. This ensures the workout plan is always front-and-center
            during the session.
          </Typography>

          <Typography variant="h6" gutterBottom>
            Usage:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Automatic Loading"
                secondary="The document loads automatically on the main dashboard."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Scrolling"
                secondary="You can scroll the document directly within the dashboard frame."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Updates"
                secondary="Changes made to the published Google Doc will reflect on the dashboard upon page refresh."
              />
            </ListItem>
          </List>
        </Paper>

        {/* 4. Spotify Integration */}
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h4" component="h2" gutterBottom id="spotify">
            4. Spotify Music Synchronization
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography paragraph>
            Seamlessly control music playback directly from the dashboard or
            your mobile controller. The system integrates with your Spotify
            Premium account to display "Now Playing" info and manage queues.
          </Typography>

          <Box
            sx={{
              my: 3,
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
            }}
          >
            <Image
              src="/screenshots/control-baseline.png"
              alt="Spotify Controls"
              width={800}
              height={450}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </Box>

          <Typography variant="h6" gutterBottom>
            Setup & Usage:
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="Authentication"
                secondary="The system requires a one-time login with your Spotify account. This is usually handled on the initial server setup or via the 'Stream HR' page."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Device Selection"
                secondary={
                  'You can select which Spotify Connect device to play music on (e.g., "Gym Speaker", "Sonos", "Web Player").'
                }
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Synchronized Volume"
                secondary="Adjusting volume on the Control page updates the volume on the Dashboard and the actual playback device."
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary="Playlist Management"
                secondary="Quickly switch between your saved playlists from the control panel."
              />
            </ListItem>
          </List>
        </Paper>
      </Box>
    </Container>
  )
}

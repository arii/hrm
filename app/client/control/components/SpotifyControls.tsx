// File: app/client/control/components/SpotifyControls.tsx
'use client'
import { Card, CardContent, Typography } from '@mui/material'
import { MusicNote } from '@mui/icons-material'
import useWebSocket from '@/hooks/useWebSocket'
import SpotifyPlayer from '@/components/SpotifyPlayer'

const SpotifyControls = () => {
  const { spotifyData } = useWebSocket()

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'

  return (
    <Card
      sx={{
        boxShadow: 3,
        mb: 3,
        backgroundColor: 'grey.800',
        color: 'white',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            color: '#1DB954',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MusicNote sx={{ mr: 1 }} /> Spotify
        </Typography>

        {hasSpotifyData ? (
          <SpotifyPlayer
            isMobileLayout={true}
            showDeviceSelector={true}
            showVolumeControl={true}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ color: 'grey.400', textAlign: 'center' }}
          >
            Login to Spotify on the main dashboard
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default SpotifyControls

// File: components/SpotifyDisplay.tsx
'use client'
import {
  Box,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { signIn, signOut, useSession } from 'next-auth/react'
import useWebSocket from '@/hooks/useWebSocket'
import SpotifyPlayer from './SpotifyPlayer'

const SpotifyDisplay = () => {
  const { spotifyData } = useWebSocket()
  const { data: session } = useSession()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const handleSpotifyLogin = () => {
    signIn('spotify', { callbackUrl: '/' })
  }

  const handleSpotifyLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (!session?.accessToken) {
    return (
      <Box
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          mb: 0,
        }}
      >
        <Button
          variant="contained"
          color="success"
          onClick={handleSpotifyLogin}
          sx={{ px: 4, py: 1 }}
        >
          🎵 Login with Spotify
        </Button>
      </Box>
    )
  }

  if (!spotifyData.trackName || spotifyData.trackName === 'Awaiting Login...') {
    return null
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 56,
        left: 0,
        right: 0,
        zIndex: 1100,
        boxShadow: 3,
        mb: 0,
      }}
    >
      <SpotifyPlayer
        isMobileLayout={isMobile}
        showDeviceSelector={true}
        showVolumeControl={true}
      />
      <Button
        variant="outlined"
        size="small"
        onClick={handleSpotifyLogout}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 2,
          color: 'common.white',
          borderColor: 'grey.600',
          '&:hover': {
            borderColor: 'grey.500',
            backgroundColor: 'grey.800',
          },
        }}
      >
        Logout
      </Button>
    </Box>
  )
}

export default SpotifyDisplay

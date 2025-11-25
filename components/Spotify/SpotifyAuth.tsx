// components/Spotify/SpotifyAuth.tsx
import React from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { signIn, signOut } from 'next-auth/react'

interface SpotifyAuthProps {
  isLoggedIn: boolean
}

const SpotifyAuth: React.FC<SpotifyAuthProps> = ({ isLoggedIn }) => {
  const handleSpotifyLogin = () => {
    signIn('spotify', { callbackUrl: '/' })
  }

  const handleSpotifyLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  if (!isLoggedIn) {
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
          data-testid="login-button"
        >
          🎵 Login with Spotify
        </Button>
      </Box>
    )
  }

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={handleSpotifyLogout}
      sx={{
        color: 'common.white',
        borderColor: 'grey.600',
        '&:hover': {
          borderColor: 'grey.500',
          backgroundColor: 'grey.800',
        },
        minWidth: 'auto',
        px: 1.5,
        fontSize: '0.75rem',
      }}
    >
      Logout
    </Button>
  )
}

export default SpotifyAuth

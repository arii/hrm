// components/spotify/SpotifyAuthOverlay.tsx
'use client'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

interface SpotifyAuthOverlayProps {
  onLogin: () => void
}

const SpotifyAuthOverlay = ({ onLogin }: SpotifyAuthOverlayProps) => {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
        Connect to Spotify
      </Typography>
      <Button variant="contained" color="primary" onClick={onLogin}>
        Login to Spotify
      </Button>
    </Box>
  )
}

export default SpotifyAuthOverlay

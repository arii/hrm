// components/spotify/SpotifyAuthOverlay.tsx
'use client'

import Box from '@mui/material/Box'
import AuthButton from '@/components/AuthButton'

const SpotifyAuthOverlay = () => {
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
        width: '100%',
      }}
    >
      <AuthButton providerId="spotify" providerName="Spotify" />
    </Box>
  )
}

export default SpotifyAuthOverlay

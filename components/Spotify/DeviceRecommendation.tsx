'use client'

import React from 'react'
import { Button } from '@mui/material'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'

/**
 * Component that recommends connecting to the 'HRM Web Player'
 * when no Spotify device is currently active.
 */
const DeviceRecommendation: React.FC = () => {
  const { activeDevice, hrmPlayer, execute } = useSpotifyCommand()

  if (!activeDevice && hrmPlayer) {
    return (
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<PlayCircleOutlineIcon />}
        onClick={() => execute('TRANSFER_PLAYBACK', { deviceId: hrmPlayer.id })}
        sx={{
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
        }}
      >
        Connect to HRM Web Player
      </Button>
    )
  }

  return null
}

export default DeviceRecommendation

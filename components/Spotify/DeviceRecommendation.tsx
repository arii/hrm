'use client'

import React from 'react'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import Button from '@mui/material/Button'

const DeviceRecommendation: React.FC = () => {
  const { activeDevice, hrmPlayer, execute } = useSpotifyCommand()

  if (!activeDevice && hrmPlayer) {
    return (
      <Button
        variant="contained"
        onClick={() => execute('TRANSFER_PLAYBACK', { deviceId: hrmPlayer.id })}
      >
        Connect to HRM Web Player
      </Button>
    )
  }

  return null
}

export default DeviceRecommendation

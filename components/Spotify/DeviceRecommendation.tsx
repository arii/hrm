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
  const [isTransferring, setIsTransferring] = React.useState(false)

  // Reset transferring state if the device becomes active
  React.useEffect(() => {
    if (activeDevice?.id === hrmPlayer?.id) {
      setIsTransferring(false)
    }
  }, [activeDevice?.id, hrmPlayer?.id])

  React.useEffect(() => {
    if (isTransferring) {
      const timer = setTimeout(() => setIsTransferring(false), 5000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [isTransferring])

  if (!activeDevice && hrmPlayer) {
    return (
      <Button
        variant="contained"
        color="secondary"
        size="small"
        startIcon={<PlayCircleOutlineIcon />}
        disabled={isTransferring}
        onClick={() => {
          setIsTransferring(true)
          execute('TRANSFER_PLAYBACK', { deviceId: hrmPlayer.id })
        }}
        sx={{
          borderRadius: 4,
          textTransform: 'none',
          fontWeight: 'bold',
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
        }}
      >
        {isTransferring
          ? 'Connecting to HRM Player...'
          : 'Connect to HRM Web Player'}
      </Button>
    )
  }

  return null
}

export default DeviceRecommendation

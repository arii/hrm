'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@mui/material'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'

/**
 * Fallback control that transfers playback to the 'HRM Web Player'
 * when no Spotify device is currently active. Auto-connect usually fires
 * first (see SpotifyDisplay); this remains for retry when it does not.
 */
const DeviceRecommendation: React.FC = () => {
  const { activeDevice, hrmPlayer, execute, playback } = useSpotifyCommand()
  const [transferring, setTransferring] = useState(false)
  const isPlaying = playback?.is_playing ?? false
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A transfer landing (or the player vanishing) ends the pending state.
  useEffect(() => {
    if (activeDevice || !hrmPlayer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTransferring(false)
    }
  }, [activeDevice, hrmPlayer])

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    },
    []
  )

  // Idle-only fallback: never offer to connect while anything plays.
  if (!activeDevice && hrmPlayer && !isPlaying) {
    return (
      <Button
        variant="contained"
        color="success"
        size="small"
        startIcon={<PlayCircleOutlineIcon />}
        disabled={transferring}
        onClick={() => {
          setTransferring(true)
          execute('TRANSFER_PLAYBACK', { deviceId: hrmPlayer.id })
          // Safety: re-enable if the server never confirms.
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          timeoutRef.current = setTimeout(() => setTransferring(false), 10000)
        }}
        sx={{
          // Dark text on green: white-on-#4CAF50 is 2.78:1 (fails AA even
          // for large text); black is ~7.6:1. Radius matches sibling badges.
          color: 'common.black',
          borderRadius: 1,
          textTransform: 'none',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
        }}
      >
        {transferring ? 'Connecting…' : 'Connect to HRM Web Player'}
      </Button>
    )
  }

  return null
}

export default DeviceRecommendation

'use client'

import { useWebSocket } from '@/context/WebSocketContext'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { BasicControls } from './BasicControls'
import { ProgressBar } from './ProgressBar'
import VolumeControl from './VolumeControl'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useDebounce } from '@/hooks/useDebounce'
import { useCallback, useEffect, useRef } from 'react'
import { SpotifyCommandMessage } from '@/types/websocket'
import { clampVolume } from '@/utils/number'

/**
 * @component PlaybackControls
 * @description A unified component for Spotify playback controls, including track info, progress, basic controls, and volume.
 */
export const PlaybackControls = () => {
  const { spotifyData, sendData, connectionStatus } = useWebSocket()
  const { volume, setVolume } = useVolumePreference()
  const debouncedVolume = useDebounce(volume, 500)
  const lastSentVolumeRef = useRef<string | null>(null)

  const { trackName, artist, isPlaying, progressMs, durationMs } = spotifyData

  const sendSpotifyCommand = useCallback(
    (command: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREVIOUS') => {
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
      }
      sendData(message)
    },
    [sendData]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return

      const sanitized = clampVolume(value)
      const messageKey = `volume:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: sanitized,
      }
      sendData(message)
      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, sendData]
  )

  useEffect(() => {
    sendVolumeCommand(debouncedVolume)
  }, [debouncedVolume, sendVolumeCommand])

  return (
    <Card
      sx={{
        p: 2,
        maxWidth: 400,
        mx: 'auto',
        borderRadius: 1.5,
        backgroundColor: 'grey.900',
        color: 'common.white',
      }}
    >
      <CardContent>
        {/* Track Info Section */}
        <Box sx={{ mb: 2, textAlign: 'center' }}>
          <Typography variant="h6" noWrap>
            {trackName || 'No track playing'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {artist || ''}
          </Typography>
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <ProgressBar progressMs={progressMs ?? 0} durationMs={durationMs ?? 0} />
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BasicControls
            isPlaying={isPlaying}
            onPlay={() => sendSpotifyCommand('PLAY')}
            onPause={() => sendSpotifyCommand('PAUSE')}
            onNext={() => sendSpotifyCommand('NEXT')}
            onPrevious={() => sendSpotifyCommand('PREVIOUS')}
          />
        </Box>

        {/* Volume Control */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <VolumeControl
            volume={volume}
            onVolumeChange={setVolume}
            onVolumeChangeCommitted={setVolume}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
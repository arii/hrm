'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { BasicControls } from './BasicControls'
import { ProgressBar } from './ProgressBar'
import VolumeControl from './VolumeControl'
import { SpotifyData } from '@/types/websocket'

interface PlaybackControlsProps {
  spotifyData: SpotifyData
  volume: number
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted: (volume: number) => void
}

/**
 * @component PlaybackControls
 * @description A unified component for Spotify playback controls, including track info, progress, basic controls, and volume.
 */
export const PlaybackControls = ({
  spotifyData,
  volume,
  onVolumeChange,
  onVolumeChangeCommitted,
}: PlaybackControlsProps) => {
  const { trackName, artist } = spotifyData

  return (
    <Card
      sx={{
        p: 2,
        maxWidth: 400,
        mx: 'auto',
        borderRadius: 2,
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
          <ProgressBar />
        </Box>

        {/* Control Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <BasicControls />
        </Box>

        {/* Volume Control */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <VolumeControl
            volume={volume}
            onVolumeChange={onVolumeChange}
            onVolumeChangeCommitted={onVolumeChangeCommitted}
          />
        </Box>
      </CardContent>
    </Card>
  )
}
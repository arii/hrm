'use client'
import Image from 'next/image'
import { Box, Typography, Skeleton } from '@mui/material'

interface SpotifyTrackDisplayProps {
  track: {
    name: string
    artist: string
    albumName: string
    albumArtUrl: string
  }
  isReady: boolean
  deviceId: string | null
  connectionStatus: string
}

const SpotifyTrackDisplay = ({
  track,
  isReady,
  deviceId,
  connectionStatus,
}: SpotifyTrackDisplayProps) => {
  if (connectionStatus === 'Connecting') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Skeleton variant="rectangular" width={64} height={64} />
        <Box>
          <Skeleton variant="text" width={150} />
          <Skeleton variant="text" width={100} />
        </Box>
      </Box>
    )
  }

  const hasTrack = track.name && track.name !== 'Awaiting Login...'

  if (!hasTrack) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 64,
            height: 64,
            backgroundColor: 'grey.800',
            borderRadius: 1,
          }}
        />
        <Typography variant="body2" sx={{ color: 'grey.500' }}>
          Nothing playing on Spotify.
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
      aria-live="polite"
      aria-atomic="true"
      data-testid="spotify-track-display"
    >
      {track.albumArtUrl ? (
        <Image
          src={track.albumArtUrl}
          alt={track.albumName || 'Album art'}
          width={64}
          height={64}
          style={{ borderRadius: '4px' }}
        />
      ) : (
        <Box
          sx={{
            width: 64,
            height: 64,
            backgroundColor: 'grey.800',
            borderRadius: 1,
          }}
        />
      )}
      <Box>
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, color: 'common.white' }}
          data-testid="spotify-now-playing-title"
        >
          {track.name}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: 'grey.400' }}
          data-testid="spotify-now-playing-artist"
        >
          {track.artist}
        </Typography>
        <Typography variant="caption" sx={{ color: 'grey.500' }}>
          {track.albumName}
        </Typography>
      </Box>
      {!isReady && (
        <Typography
          variant="caption"
          sx={{
            opacity: 0.8,
            backgroundColor: 'info.main',
            color: 'common.white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          🔄 Connecting Player...
        </Typography>
      )}
      {isReady && deviceId && (
        <Typography
          variant="caption"
          sx={{
            opacity: 0.8,
            backgroundColor: 'success.main',
            color: 'common.white',
            px: 1,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          🎵 Browser Player Active
        </Typography>
      )}
    </Box>
  )
}

export default SpotifyTrackDisplay

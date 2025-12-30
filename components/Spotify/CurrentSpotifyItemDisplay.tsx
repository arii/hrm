'use client'
import Image from 'next/image'
import { useWebSocket } from '@/context/WebSocketContext'
import { Box, Typography, Skeleton } from '@mui/material'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'

const CurrentSpotifyItemDisplay = () => {
  const { spotifyData, connectionStatus } = useWebSocket()
  const {
    isReady,
    deviceId,
    isAuthenticated: spotifyAuthenticated,
  } = useSpotifyWebPlayback()

  if (connectionStatus === 'Connecting') {
    return (
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
        data-testid="loading-skeletons"
      >
        <Skeleton variant="rectangular" width={64} height={64} />
        <Box>
          <Skeleton variant="text" width={150} />
          <Skeleton variant="text" width={100} />
        </Box>
      </Box>
    )
  }

  if (!spotifyData.trackName || spotifyData.trackName === 'Awaiting Login...') {
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
    >
      {spotifyData.albumArtUrl ? (
        <Image
          src={spotifyData.albumArtUrl}
          alt={spotifyData.albumName || 'Album art'}
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
        >
          {spotifyData.trackName}
        </Typography>
        <Typography variant="body2" sx={{ color: 'grey.400' }}>
          {spotifyData.artist}
        </Typography>
        <Typography variant="caption" sx={{ color: 'grey.500' }}>
          {spotifyData.albumName}
        </Typography>
      </Box>
      {spotifyAuthenticated && !isReady && (
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

export default CurrentSpotifyItemDisplay

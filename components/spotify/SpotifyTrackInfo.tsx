// components/spotify/SpotifyTrackInfo.tsx
'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface SpotifyTrackInfoProps {
  trackName: string | null
  artist: string | null
  isReady: boolean
  deviceId: string | null
  isAuthenticated: boolean
}

const SpotifyTrackInfo = ({
  trackName,
  artist,
  isReady,
  deviceId,
  isAuthenticated,
}: SpotifyTrackInfoProps) => {
  const isWaiting = trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting ? 'No Active Playback' : trackName
  const displayArtist = isWaiting ? '' : `— ${artist}`

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {displayTrackName} {displayArtist}
      </Typography>
      {isAuthenticated && !isReady && (
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

export default SpotifyTrackInfo

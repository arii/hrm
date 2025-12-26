// components/spotify/SpotifyTrackInfo.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface SpotifyTrackInfoProps {
  trackName: string
  artistName: string
  albumArtUrl?: string
}

const SpotifyTrackInfo = ({
  trackName,
  artistName,
}: SpotifyTrackInfoProps) => {
  const isWaiting = trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting ? 'No Active Playback' : trackName
  const displayArtist = isWaiting ? '' : `— ${artistName}`

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {displayTrackName} {displayArtist}
      </Typography>
    </Box>
  )
}

export default SpotifyTrackInfo

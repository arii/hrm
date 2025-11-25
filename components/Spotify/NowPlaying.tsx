// components/Spotify/NowPlaying.tsx
import React from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface NowPlayingProps {
  trackName: string
  artist: string
}

const NowPlaying: React.FC<NowPlayingProps> = ({ trackName, artist }) => {
  const isWaiting = trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting ? 'No Active Playback' : trackName
  const displayArtist = isWaiting ? '' : `— ${artist}`

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {displayTrackName} {displayArtist}
      </Typography>
    </Box>
  )
}

export default NowPlaying

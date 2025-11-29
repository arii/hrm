
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { Typography, Box } from '@mui/material'

const TrackInfo = () => {
  const { spotifyData } = useWebSocket()
  const isWaiting = spotifyData.trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting ? 'No Active Playback' : spotifyData.trackName
  const displayArtist = isWaiting ? '' : `— ${spotifyData.artist}`

  return (
    <Box>
      <Typography variant="body1" sx={{ fontWeight: 600 }}>
        {displayTrackName}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {displayArtist}
      </Typography>
    </Box>
  )
}

export default TrackInfo

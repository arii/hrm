'use client'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

interface SpotifyPlaybackContextDisplayProps {
  contextName?: string
  contextType?: string
}

const SpotifyPlaybackContextDisplay = ({
  contextName,
  contextType,
}: SpotifyPlaybackContextDisplayProps) => {
  if (!contextName || !contextType) {
    return null
  }

  const formattedContextType =
    contextType.charAt(0).toUpperCase() + contextType.slice(1)

  return (
    <Box sx={{ ml: 2, display: 'inline-block' }}>
      <Typography variant="caption" sx={{ opacity: 0.7 }}>
        {`From ${formattedContextType}: ${contextName}`}
      </Typography>
    </Box>
  )
}

export default SpotifyPlaybackContextDisplay

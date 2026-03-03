import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface SpotifyTrackDisplayProps {
  trackName: string
  artistName: string
}

const SpotifyTrackDisplay = ({
  trackName,
  artistName,
}: SpotifyTrackDisplayProps) => {
  return (
    <Box
      sx={{
        textAlign: 'center',
        mb: 2,
        minHeight: '4rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <Typography
        variant="subtitle1"
        sx={{ fontWeight: 'medium', lineHeight: 1.2 }}
      >
        {trackName}
      </Typography>
      <Typography variant="body2" sx={{ color: 'grey.400', lineHeight: 1.2 }}>
        {artistName}
      </Typography>
    </Box>
  )
}

export default SpotifyTrackDisplay

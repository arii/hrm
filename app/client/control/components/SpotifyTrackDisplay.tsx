import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface SpotifyTrackDisplayProps {
  name: string
  artist: string
}

/** Now-playing track block for the control page (#9298). */
const SpotifyTrackDisplay = ({ name, artist }: SpotifyTrackDisplayProps) => (
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
      {name}
    </Typography>
    <Typography variant="body2" sx={{ color: 'grey.400', lineHeight: 1.2 }}>
      {artist}
    </Typography>
  </Box>
)

export default SpotifyTrackDisplay

import MusicNote from '@mui/icons-material/MusicNote'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import SpotifySearchInput from '@/components/SpotifySearchInput'

/** Card header + track search for the control page (#9298). */
const SpotifyControlsHeader = ({
  onTrackSelect,
}: {
  onTrackSelect: (uri: string) => void
}) => (
  <>
    <Typography
      variant="h6"
      sx={{
        mb: 2,
        color: '#1DB954',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MusicNote sx={{ mr: 1 }} /> Spotify
    </Typography>

    <Box sx={{ mb: 2 }}>
      <SpotifySearchInput onTrackSelect={onTrackSelect} />
    </Box>
  </>
)

export default SpotifyControlsHeader

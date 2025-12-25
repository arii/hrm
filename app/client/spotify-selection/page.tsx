// app/client/spotify-selection/page.tsx
'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import FormControl from '@mui/material/FormControl'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { SelectChangeEvent } from '@mui/material/Select'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import dynamic from 'next/dynamic'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import useVolumePreference from '@/hooks/useVolumePreference'
import VolumeSlider from '@/components/Spotify/VolumeSlider'
import { Alert, CardActions, CircularProgress } from '@mui/material'
import { useSpotifyControl } from '@/hooks/useSpotifyControl'

const PlaylistSelector = dynamic(
  () => import('../../../components/Spotify/PlaylistSelector'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={200} />,
  }
)

const SpotifySelectionPage = () => {
  const {
    spotifyData,
    availableDevices,
    selectedDeviceId,
    setSelectedDeviceId,
    sendCommand,
    loading,
    error,
    success,
  } = useSpotifyControl()
  const { volume, setVolume } = useVolumePreference()

  const handlePlaylistPlay = (uri: string) => {
    sendCommand('PLAY', { playlistUri: uri })
  }

  const handleDeviceChange = (event: SelectChangeEvent<string>) => {
    setSelectedDeviceId(event.target.value)
  }

  const handleVolumeChange = (
    _event: Event,
    newValue: number | number[]
  ) => {
    const newVolume = newValue as number
    setVolume(newVolume)
    sendCommand('SET_VOLUME', { volumePercent: newVolume })
  }

  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Spotify Control
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ textAlign: 'center' }}>
          {spotifyData.trackName &&
          spotifyData.trackName !== 'Awaiting Login...' &&
          spotifyData.trackName !== 'Requires Login' ? (
            <>
              <Typography variant="h6">Now Playing</Typography>
              <Typography>
                {spotifyData.trackName} - {spotifyData.artist}
              </Typography>
            </>
          ) : (
            <Typography>
              Login to Spotify on the main dashboard to use this feature.
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Controls & Device Selection
          </Typography>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="device-select-label">Device</InputLabel>
            <Select
              labelId="device-select-label"
              id="device-select"
              value={selectedDeviceId}
              label="Device"
              onChange={handleDeviceChange}
              disabled={availableDevices.length === 0}
            >
              {availableDevices.map((device) => (
                <MenuItem key={device.id} value={device.id}>
                  {device.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 2,
            }}
          >
            <IconButton
              onClick={() => sendCommand('PREVIOUS')}
              disabled={loading['PREVIOUS']}
            >
              {loading['PREVIOUS'] ? (
                <CircularProgress size={24} />
              ) : (
                <SkipPreviousIcon />
              )}
            </IconButton>
            <IconButton
              onClick={() =>
                sendCommand(spotifyData.isPlaying ? 'PAUSE' : 'PLAY')
              }
              disabled={loading['PLAY'] || loading['PAUSE']}
            >
              {loading['PLAY'] || loading['PAUSE'] ? (
                <CircularProgress size={24} />
              ) : spotifyData.isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayArrowIcon />
              )}
            </IconButton>
            <IconButton
              onClick={() => sendCommand('NEXT')}
              disabled={loading['NEXT']}
            >
              {loading['NEXT'] ? (
                <CircularProgress size={24} />
              ) : (
                <SkipNextIcon />
              )}
            </IconButton>
          </Box>
        </CardContent>
        <CardActions sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <VolumeSlider
            volume={volume}
            handleVolumeChange={handleVolumeChange}
            showValue={false}
            width="80%"
          />
        </CardActions>
      </Card>

      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Select a Playlist
          </Typography>
          <PlaylistSelector
            onPlaylistSelected={handlePlaylistPlay}
            onPlaylistPlay={handlePlaylistPlay}
          />
        </CardContent>
      </Card>
    </Container>
  )
}

export default SpotifySelectionPage

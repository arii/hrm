// components/Spotify/SpotifyQuickSettings.tsx
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import {
  useSpotifyData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useSpotifyVolumeSync } from '@/hooks/useSpotifyVolumeSync'
import { useSyncedPlaying } from '@/lib/spotify/optimisticPlayback'
import VolumeSlider from '../shared/VolumeSlider'
import { TransportColumn } from './TransportColumn'

/**
 * One-tap playback settings for the playlist page: previous, play/pause,
 * next and music volume, all on the surface (no menus).
 */
const SpotifyQuickSettings = () => {
  const spotifyData = useSpotifyData()
  const { connectionStatus } = useWebSocketConnection()
  const { execute, activeDevice } = useSpotifyCommand()
  const displayPlaying = useSyncedPlaying(
    spotifyData.playback?.is_playing ?? false
  )
  const volume = useSpotifyVolumeSync({
    serverVolume: spotifyData.playback.volume_percent,
    serverMuted: spotifyData.playback.isMuted,
    connectionStatus,
    selectedDeviceId: activeDevice?.id ?? '',
    devices: spotifyData.devices,
    executeSpotify: execute,
  })

  return (
    <Box
      data-testid="spotify-quick-settings"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: 'grey.900',
        color: 'common.white',
        borderRadius: 2,
        px: 2,
        py: 1,
      }}
    >
      <TransportColumn
        displayPlaying={displayPlaying}
        executeSpotify={execute}
      />
      <VolumeSlider
        volume={volume.displayVolume}
        muted={volume.isMuted}
        onVolumeChange={volume.handleVolumeChange}
        onVolumeChangeCommitted={volume.handleVolumeChangeCommitted}
        onToggleMute={volume.handleToggleMute}
        showValue
        disabled={!activeDevice}
      />
      {!activeDevice && (
        <Typography variant="caption" sx={{ color: 'grey.400' }}>
          No active Spotify device yet. Tap a playlist to start one.
        </Typography>
      )}
    </Box>
  )
}

export default SpotifyQuickSettings

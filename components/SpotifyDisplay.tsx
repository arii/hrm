'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useSpotifyRemoteExecution } from '@/hooks/useSpotifyRemoteExecution'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { DeviceRecommendation } from '@/components/Spotify/DeviceRecommendation'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { signOut } from 'next-auth/react'
import AuthButton from './AuthButton'
import VolumeSlider from './shared/VolumeSlider'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'
import { useState } from 'react'

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { player, isReady } = useSpotifyWebPlayback()
  const { execute, playback, hrmPlayer, activeDevice } = useSpotifyCommand()
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

  // Enable remote Spotify control from controllers
  useSpotifyRemoteExecution(player)

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const handlePlayPauseToggle = () => {
    const command = playback.isPlaying ? 'PAUSE' : 'PLAY'
    execute(command)
  }

  const handleDeviceSelect = (deviceId: string) => {
    execute('TRANSFER_PLAYBACK', { deviceId })
    setDeviceMenuAnchor(null)
  }

  const [localVolume, setLocalVolume] = useState<number | null>(null)

  const handleVolumeChange = (newVolume: number) => {
    setLocalVolume(newVolume)
  }

  const handleVolumeCommitted = (newVolume: number) => {
    setLocalVolume(null)
    execute('SET_VOLUME', { volumePercent: newVolume })
  }

  if (!isLoggedIn) {
    return (
      <Box
        data-testid="spotify-auth-container"
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

  const isWaiting = playback.trackName === 'Awaiting Login...'
  const displayTrackName = isWaiting ? 'No Active Playback' : playback.trackName
  const displayArtist = isWaiting ? '' : `— ${playback.artist}`

  return (
    <Box
      data-testid="spotify-display-container"
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        playback.isPlaying ? 'Playing' : 'Paused'
      }${isReady ? ', Browser player ready' : ''}`}
      sx={{
        backgroundColor: 'grey.900',
        color: 'common.white',
        px: { xs: 2, sm: 3 },
        py: 1.5,
        borderRadius: 2,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        position: 'fixed',
        bottom: 56,
        left: 0,
        right: 0,
        zIndex: 1100,
        boxShadow: 3,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'start',
          gap: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600 }}
          data-testid="spotify-now-playing"
        >
          {displayTrackName} {displayArtist}
        </Typography>
        {!activeDevice && hrmPlayer && <DeviceRecommendation />}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          justifySelf: 'center',
        }}
      >
        <IconButton
          size="small"
          onClick={() => execute('PREVIOUS')}
          sx={{
            color: 'common.white',
            '&:hover': { backgroundColor: 'grey.800' },
          }}
          aria-label="Previous track"
          data-testid="spotify-previous-button"
        >
          <SkipPreviousIcon />
        </IconButton>
        <IconButton
          size="medium"
          onClick={handlePlayPauseToggle}
          sx={{
            color: 'common.white',
            backgroundColor: 'grey.700',
            '&:hover': { backgroundColor: 'grey.600' },
          }}
          aria-label={playback.isPlaying ? 'Pause' : 'Play'}
          data-testid="spotify-play-pause-button"
        >
          {playback.isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <IconButton
          size="small"
          onClick={() => execute('NEXT')}
          sx={{
            color: 'common.white',
            '&:hover': { backgroundColor: 'grey.800' },
          }}
          aria-label="Next track"
          data-testid="spotify-next-button"
        >
          <SkipNextIcon />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'end',
          gap: 1,
        }}
      >
        <VolumeSlider
          volume={localVolume ?? playback.volumePercent}
          muted={playback.isMuted}
          onVolumeChange={handleVolumeChange}
          onVolumeChangeCommitted={handleVolumeCommitted}
          onToggleMute={() => handleVolumeCommitted(playback.isMuted ? 50 : 0)}
          showValue={true}
        />
        <SpotifyDeviceSelector
          availableDevices={playback.devices || []}
          deviceMenuAnchor={deviceMenuAnchor}
          onDeviceSelect={handleDeviceSelect}
          onMenuOpen={(e) => setDeviceMenuAnchor(e.currentTarget)}
          onMenuClose={() => setDeviceMenuAnchor(null)}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={handleLogout}
          data-testid="spotify-logout-button"
          sx={{
            color: 'common.white',
            borderColor: 'grey.600',
            '&:hover': {
              borderColor: 'grey.500',
              backgroundColor: 'grey.800',
            },
            minWidth: 'auto',
            px: 1.5,
            fontSize: '0.75rem',
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  )
}

export default SpotifyDisplay

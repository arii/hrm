'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useSpotifyVolume } from '@/hooks/useSpotifyVolume'
import { useSpotifyDeviceSync } from '@/hooks/useSpotifyDeviceSync'
import { useSpotifyPlayback } from '@/hooks/useSpotifyPlayback'
import PauseIcon from '@mui/icons-material/Pause'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import { signOut } from 'next-auth/react'
import AuthButton from './AuthButton'
import VolumeSlider from './shared/VolumeSlider'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'
import DeviceRecommendation from './Spotify/DeviceRecommendation'

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const {
    track,
    isPlaying,
    volumePercent,
    isMuted: serverMuted,
  } = useSpotifyPlayback()

  // Mute state management (Local to dashboard display)
  const [isMuted, setIsMuted] = useState(serverMuted ?? false)
  const lastVolumeRef = useRef<number>(volumePercent ?? 70)

  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

  // Synchronize mute state with WebSocket data
  useEffect(() => {
    if (typeof serverMuted === 'boolean') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsMuted(serverMuted)
    }
  }, [serverMuted])

  const devices = spotifyData.devices || []

  const { handleDeviceSelect, resolveTargetDeviceId, hasActiveDevice } =
    useSpotifyDeviceSync({
      devices,
      onTransferPlayback: (deviceId) =>
        executeSpotify('TRANSFER_PLAYBACK', { deviceId }),
    })

  const targetDeviceId = resolveTargetDeviceId()

  const {
    volume: displayVolume,
    handleVolumeChange,
    handleVolumeChangeCommitted,
  } = useSpotifyVolume({
    serverVolume: volumePercent,
    targetDeviceId,
    onLocalVolumeChange: (val) => {
      if (val > 0) {
        lastVolumeRef.current = val
        setIsMuted(false)
      } else {
        setIsMuted(true)
      }
    },
  })

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useDashboardRegistration(player)

  // Handler for the VolumeSlider's mute button
  const handleToggleMute = useCallback(() => {
    const newMutedState = !isMuted
    const newVolume = newMutedState ? 0 : lastVolumeRef.current || 50

    setIsMuted(newMutedState)
    executeSpotify('SET_VOLUME', {
      volume: newVolume,
      deviceId: targetDeviceId,
    })
  }, [isMuted, targetDeviceId, executeSpotify])

  const handlePlayPauseToggle = () => {
    if (isPlaying) {
      executeSpotify('PAUSE')
    } else {
      executeSpotify('PLAY')
    }
  }

  const onDeviceSelect = (deviceId: string) => {
    handleDeviceSelect(deviceId)
    setDeviceMenuAnchor(null)
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
          minHeight: '64px',
        }}
      >
        <AuthButton providerId="spotify" providerName="Spotify" />
      </Box>
    )
  }

  if (isLoggedIn) {
    const isWaiting = track.name === 'Awaiting Login...'
    const displayTrackName = isWaiting ? 'No Active Playback' : track.name
    const displayArtist = isWaiting ? '' : `— ${track.artist}`

    return (
      <Box
        data-testid="spotify-display-container"
        aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
          isPlaying ? 'Playing' : 'Paused'
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
          minHeight: '64px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifySelf: 'start',
            gap: 2,
            minHeight: '32px',
          }}
        >
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
            data-testid="spotify-now-playing"
          >
            {displayTrackName} {displayArtist}
          </Typography>
          {!isReady && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'info.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
              }}
            >
              🔄 Connecting Player...
            </Typography>
          )}
          {isReady && deviceId && (
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                backgroundColor: 'success.main',
                color: 'common.white',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                whiteSpace: 'nowrap',
              }}
            >
              🎵 Browser Player Active
            </Typography>
          )}
          <DeviceRecommendation />
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
            onClick={() => executeSpotify('PREVIOUS')}
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
            aria-label={spotifyData.playback.is_playing ? 'Pause' : 'Play'}
            data-testid="spotify-play-pause-button"
          >
            {spotifyData.playback.is_playing ? (
              <PauseIcon />
            ) : (
              <PlayArrowIcon />
            )}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => executeSpotify('NEXT')}
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
            volume={displayVolume}
            muted={isMuted}
            onVolumeChange={handleVolumeChange}
            onVolumeChangeCommitted={handleVolumeChangeCommitted}
            onToggleMute={handleToggleMute}
            showValue={true}
            disabled={!hasActiveDevice}
          />
          <SpotifyDeviceSelector
            availableDevices={devices}
            deviceMenuAnchor={deviceMenuAnchor}
            onDeviceSelect={onDeviceSelect}
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

  return null
}

export default SpotifyDisplay

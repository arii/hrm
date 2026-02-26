'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useSpotifyDeviceSync } from '@/hooks/useSpotifyDeviceSync'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AuthButton from './AuthButton'
import DeviceRecommendation from './Spotify/DeviceRecommendation'
import SpotifyPlaybackControls from './Spotify/SpotifyPlaybackControls'
import SpotifyTrackDisplay from './Spotify/SpotifyTrackDisplay'
import SpotifyVolumeControl from './Spotify/SpotifyVolumeControl'
import SpotifyDeviceSelector from './SpotifyDeviceSelector'

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useDashboardRegistration(player)

  // Use the sync hook for volume and device logic
  const {
    displayVolume,
    isMuted,
    selectedDeviceId,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
    handleDeviceSelect,
  } = useSpotifyDeviceSync(spotifyData, executeSpotify, connectionStatus)

  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

  // Window focus listener to refresh devices
  useEffect(() => {
    const handleFocus = () => {
      if (isLoggedIn) {
        executeSpotify('GET_DEVICES')
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isLoggedIn, executeSpotify])

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  const handlePlayPauseToggle = () => {
    if (spotifyData.playback.is_playing) {
      executeSpotify('PAUSE')
    } else {
      executeSpotify('PLAY')
    }
  }

  const hasActiveDevice =
    !!selectedDeviceId ||
    spotifyData.devices?.some((device) => device.is_active)

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

  // Determine display text for accessible label
  const isWaiting = spotifyData.playback.track.name === 'Awaiting Login...'
  const displayTrackName = isWaiting
    ? 'No Active Playback'
    : spotifyData.playback.track.name
  const displayArtist = isWaiting
    ? ''
    : `— ${spotifyData.playback.track.artist}`

  return (
    <Box
      data-testid="spotify-display-container"
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        spotifyData.playback.is_playing ? 'Playing' : 'Paused'
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
        <SpotifyTrackDisplay
          track={spotifyData.playback.track}
          isReady={isReady}
          deviceId={deviceId}
          connectionStatus={connectionStatus}
        />
        <DeviceRecommendation />
      </Box>

      <SpotifyPlaybackControls
        isPlaying={spotifyData.playback.is_playing}
        onPlayPause={handlePlayPauseToggle}
        onNext={() => executeSpotify('NEXT')}
        onPrevious={() => executeSpotify('PREVIOUS')}
        disabled={!hasActiveDevice}
      />

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifySelf: 'end',
          gap: 1,
        }}
      >
        <SpotifyVolumeControl
          volume={displayVolume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onVolumeChangeCommitted={handleVolumeChangeCommitted}
          onToggleMute={handleToggleMute}
          disabled={!hasActiveDevice}
        />
        <SpotifyDeviceSelector
          availableDevices={spotifyData.devices || []}
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

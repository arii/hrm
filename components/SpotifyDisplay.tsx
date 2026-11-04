'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useSpotifyVolumeSync } from '@/hooks/useSpotifyVolumeSync'
import { useWebSocket } from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'
import type { SpotifyDevice } from '@/types/core'
import {
  setOptimisticPlaying,
  useSyncedPlaying,
} from '@/lib/spotify/optimisticPlayback'
import { useLatchedSpotifyPresence } from '@/hooks/useLatchedSpotifyPresence'
import { useSpotifyAutoTransfer } from '@/hooks/useSpotifyAutoTransfer'
import { useSpotifyDeviceSelection } from '@/hooks/useSpotifyDeviceSelection'
import {
  resolvePlayerBadges,
  resolveTrackDisplay,
} from '@/lib/spotify/playerBadges'
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
import DeviceRecommendation from './Spotify/DeviceRecommendation'

interface StatusColumnProps {
  displayTrackName: string
  displayArtist: string
  showConnectingBadge: boolean
  showActiveBadge: boolean
  showAutoPending: boolean
  showConnectButton: boolean
}

/** Left column: now-playing text plus the single status affordance. */
const StatusColumn = ({
  displayTrackName,
  displayArtist,
  showConnectingBadge,
  showActiveBadge,
  showAutoPending,
  showConnectButton,
}: StatusColumnProps) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifySelf: 'start',
      gap: 2,
      minHeight: '32px',
      minWidth: 0,
    }}
  >
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
      data-testid="spotify-now-playing"
    >
      {displayTrackName} {displayArtist}
    </Typography>
    {showConnectingBadge && (
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'info.main',
          color: 'common.black',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        🔄 Connecting Player...
      </Typography>
    )}
    {showActiveBadge && (
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'success.main',
          color: 'common.black',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        🎵 Browser Player Active
      </Typography>
    )}
    {showAutoPending && (
      <Typography
        variant="caption"
        sx={{
          backgroundColor: 'info.main',
          color: 'common.black',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Connecting…
      </Typography>
    )}
    {showConnectButton && <DeviceRecommendation />}
  </Box>
)

interface TransportColumnProps {
  displayPlaying: boolean
  executeSpotify: ExecuteSpotify
}

/** Center column: previous / play-pause / next transport controls. */
const TransportColumn = ({
  displayPlaying,
  executeSpotify,
}: TransportColumnProps) => {
  const handlePlayPauseToggle = () => {
    if (displayPlaying) {
      setOptimisticPlaying(false)
      executeSpotify('PAUSE')
    } else {
      setOptimisticPlaying(true)
      executeSpotify('PLAY')
    }
  }

  return (
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
        aria-label={displayPlaying ? 'Pause' : 'Play'}
        data-testid="spotify-play-pause-button"
      >
        {displayPlaying ? <PauseIcon /> : <PlayArrowIcon />}
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
  )
}

interface DeviceColumnProps {
  displayVolume: number
  isMuted: boolean
  handleVolumeChange: (volume: number) => void
  handleVolumeChangeCommitted: (volume: number) => void
  handleToggleMute: () => void
  selectedDeviceId: string
  devices: SpotifyDevice[] | null | undefined
  deviceMenuAnchor: HTMLElement | null
  deviceDispatch: ReturnType<typeof useSpotifyDeviceSelection>['deviceDispatch']
  executeSpotify: ExecuteSpotify
}

/** Right column: volume, device selector, and logout. */
const DeviceColumn = ({
  displayVolume,
  isMuted,
  handleVolumeChange,
  handleVolumeChangeCommitted,
  handleToggleMute,
  selectedDeviceId,
  devices,
  deviceMenuAnchor,
  deviceDispatch,
  executeSpotify,
}: DeviceColumnProps) => {
  const hasActiveDevice =
    !!selectedDeviceId || devices?.some((device) => device.is_active)

  const handleDeviceSelect = (deviceId: string) => {
    deviceDispatch({ type: 'SELECT_DEVICE', payload: deviceId })
    executeSpotify('TRANSFER_PLAYBACK', { deviceId })
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    window.location.reload()
  }

  return (
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
        availableDevices={devices || []}
        deviceMenuAnchor={deviceMenuAnchor}
        onDeviceSelect={handleDeviceSelect}
        onMenuOpen={(e) =>
          deviceDispatch({
            type: 'OPEN_DEVICE_MENU',
            payload: e.currentTarget,
          })
        }
        onMenuClose={() => deviceDispatch({ type: 'CLOSE_DEVICE_MENU' })}
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
  )
}

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const { spotifyData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()

  // Latched server truth over the flapping device list (see hook).
  const stable = useLatchedSpotifyPresence(spotifyData.devices)

  // Device selection state (volume state lives in useSpotifyVolumeSync)
  const { selectedDeviceId, deviceMenuAnchor, deviceDispatch } =
    useSpotifyDeviceSelection(spotifyData.devices)

  const {
    displayVolume,
    isMuted,
    handleVolumeChange,
    handleVolumeChangeCommitted,
    handleToggleMute,
  } = useSpotifyVolumeSync({
    serverVolume: spotifyData.playback.volume_percent,
    serverMuted: spotifyData.playback.isMuted,
    connectionStatus,
    selectedDeviceId,
    devices: spotifyData.devices,
    executeSpotify,
  })

  const { player, isReady, deviceId } = useSpotifyWebPlayback()

  // Enable remote Spotify control from controllers
  useDashboardRegistration(player)

  const isPlaying = spotifyData.playback?.is_playing ?? false
  // Displayed state: shared optimistic value while fresh so every surface
  // (dashboard, control page) flips instantly and in sync. Guards keep
  // using the server value so guesses never drive transfers.
  const displayPlaying = useSyncedPlaying(isPlaying)
  // Auto-connect: silently select the browser player when nothing else is
  // active (see hook for the never-steal, never-blind guards).
  const autoPending = useSpotifyAutoTransfer({
    isReady,
    deviceId,
    connectionStatus,
    devices: spotifyData.devices,
    stableActive: stable.active,
    isPlaying,
    executeSpotify,
  })

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

  const { displayTrackName, displayArtist } = resolveTrackDisplay(
    spotifyData.playback.track.name,
    spotifyData.playback.track.artist
  )

  // Strict player-state display: exactly one status affordance at a
  // time (see resolvePlayerBadges for the policy).
  const {
    showActiveBadge,
    showConnectingBadge,
    showAutoPending,
    showConnectButton,
  } = resolvePlayerBadges({
    hrmActive: stable.hrmActive,
    listActive: stable.active,
    autoPending,
    displayPlaying,
    sdkReady: isReady && !!deviceId,
    listed: stable.listed,
  })

  return (
    <Box
      data-testid="spotify-display-container"
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        displayPlaying ? 'Playing' : 'Paused'
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
      <StatusColumn
        displayTrackName={displayTrackName}
        displayArtist={displayArtist}
        showConnectingBadge={showConnectingBadge}
        showActiveBadge={showActiveBadge}
        showAutoPending={showAutoPending}
        showConnectButton={showConnectButton}
      />
      <TransportColumn
        displayPlaying={displayPlaying}
        executeSpotify={executeSpotify}
      />
      <DeviceColumn
        displayVolume={displayVolume}
        isMuted={isMuted}
        handleVolumeChange={handleVolumeChange}
        handleVolumeChangeCommitted={handleVolumeChangeCommitted}
        handleToggleMute={handleToggleMute}
        selectedDeviceId={selectedDeviceId}
        devices={spotifyData.devices}
        deviceMenuAnchor={deviceMenuAnchor}
        deviceDispatch={deviceDispatch}
        executeSpotify={executeSpotify}
      />
    </Box>
  )
}

export default SpotifyDisplay

'use client'
// File: app/components/dashboard/SpotifyDisplay.tsx
import { useSpotifyAuth } from '@/hooks/useSpotifyAuth'
import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
import { useDashboardRegistration } from '@/hooks/useDashboardRegistration'
import { useSpotifyVolumeSync } from '@/hooks/useSpotifyVolumeSync'
import {
  useSpotifyData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useSyncedPlaying } from '@/lib/spotify/optimisticPlayback'
import { useLatchedSpotifyPresence } from '@/hooks/useLatchedSpotifyPresence'
import { useSpotifyAutoTransfer } from '@/hooks/useSpotifyAutoTransfer'
import { useSpotifyDeviceSelection } from '@/hooks/useSpotifyDeviceSelection'
import {
  resolvePlayerBadges,
  resolveTrackDisplay,
} from '@/lib/spotify/playerBadges'
import Box from '@mui/material/Box'
import { usePathname } from 'next/navigation'
import AuthButton from './AuthButton'
import { StatusColumn } from './Spotify/StatusColumn'
import { TransportColumn } from './Spotify/TransportColumn'
import { DeviceColumn } from './Spotify/DeviceColumn'
import { SPOTIFY_BAR_BOTTOM_OFFSET } from '@/constants/layout'

const SpotifyDisplay = () => {
  const { isLoggedIn } = useSpotifyAuth()
  const spotifyData = useSpotifyData()
  const { connectionStatus } = useWebSocketConnection()
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

  // Dashboard-only visibility: the bar stays mounted on every route so
  // the Web Playback SDK instance never drops, but its UI is hidden
  // off-dashboard via CSS (no early return — all hooks above run).
  const pathname = usePathname()
  const isDashboard = pathname === '/'

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
        aria-hidden={!isDashboard}
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 0,
          borderRadius: 2,
          display: isDashboard ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: SPOTIFY_BAR_BOTTOM_OFFSET,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
          minHeight: '3rem',
          maxHeight: '6rem',
          overflow: 'hidden',
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
      aria-hidden={!isDashboard}
      aria-label={`Now playing: ${displayTrackName} ${displayArtist}, Status: ${
        displayPlaying ? 'Playing' : 'Paused'
      }${isReady ? ', Browser player ready' : ''}`}
      sx={{
        backgroundColor: 'grey.900',
        color: 'common.white',
        // The sm value is the target-composition pin: scaled viewports
        // are always ≥ SCALE_TO_FIT_MIN_WIDTH, which tracks the sm
        // breakpoint, so the canvas never sees the xs value.
        px: { xs: 2, sm: 3 },
        py: 0,
        borderRadius: 2,
        display: isDashboard ? 'grid' : 'none',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        position: 'fixed',
        bottom: SPOTIFY_BAR_BOTTOM_OFFSET,
        left: 0,
        right: 0,
        zIndex: 1100,
        boxShadow: 3,
        width: '100%',
        minHeight: '3rem',
        maxHeight: '6rem',
        overflow: 'hidden',
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

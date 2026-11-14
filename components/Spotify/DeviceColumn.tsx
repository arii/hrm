import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import { signOut } from 'next-auth/react'
import VolumeSlider from '../shared/VolumeSlider'
import SpotifyDeviceSelector from '../SpotifyDeviceSelector'
import type { SpotifyDevice } from '@/types/core'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'
import type { useSpotifyDeviceSelection } from '@/hooks/useSpotifyDeviceSelection'

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
export const DeviceColumn = ({
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
        minWidth: 0,
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

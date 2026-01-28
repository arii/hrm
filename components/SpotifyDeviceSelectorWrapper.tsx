'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent } from 'react'
import { SpotifyDevice } from '@/types/spotify'

interface SpotifyDeviceSelectorWrapperProps {
  availableDevices: SpotifyDevice[]
  deviceMenuAnchor: HTMLElement | null
  onDeviceSelect: (deviceId: string) => void
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void
  onMenuClose: () => void
}

const SpotifyDeviceSelectorWrapper = ({
  availableDevices,
  deviceMenuAnchor,
  onDeviceSelect,
  onMenuOpen,
  onMenuClose,
}: SpotifyDeviceSelectorWrapperProps) => {
  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  return (
    <>
      <IconButton
        size="small"
        onClick={onMenuOpen}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select playback device"
        data-testid="spotify-device-selector-button"
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={deviceMenuAnchor}
        open={deviceMenuOpen}
        onClose={onMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        data-testid="spotify-device-selector-menu"
      >
        {availableDevices.length > 0 ? (
          availableDevices.map((device) => (
            <MenuItem
              key={device.id}
              onClick={() => onDeviceSelect(device.id)}
              selected={device.is_active}
              data-testid={`spotify-device-selector-item-${device.id}`}
            >
              {device.name} {device.is_active && '✓'}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled data-testid="spotify-device-selector-no-devices">
            No devices available
          </MenuItem>
        )}
      </Menu>
    </>
  )
}

export default SpotifyDeviceSelectorWrapper

'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent } from 'react'
import { SpotifyDevice } from '@/types'

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
      >
        {availableDevices.length > 0 ? (
          availableDevices.map((device) => (
            <MenuItem
              key={device.id}
              onClick={() => onDeviceSelect(device.id)}
              selected={device.is_active}
            >
              {device.name} {device.is_active === true && '✓'}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No devices available</MenuItem>
        )}
      </Menu>
    </>
  )
}

export default SpotifyDeviceSelectorWrapper

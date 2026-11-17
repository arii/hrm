'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent } from 'react'
import { SpotifyDevice } from '@/types/core'

/**
 * One entry per device name: every dashboard reload mints a new "HRM Web
 * Player" id, so stale ids linger in Spotify's list. Keeps the active
 * entry, else the last one listed (the newest registration).
 */
export const dedupeDevicesByName = (
  devices: SpotifyDevice[]
): SpotifyDevice[] => {
  const byName = new Map<string, SpotifyDevice>()
  for (const device of devices) {
    const key = device.name ?? device.id ?? ''
    const kept = byName.get(key)
    if (!kept || !kept.is_active) byName.set(key, device)
  }
  return [...byName.values()]
}

interface SpotifyDeviceSelectorProps {
  availableDevices: SpotifyDevice[]
  deviceMenuAnchor: HTMLElement | null
  onDeviceSelect: (deviceId: string) => void
  onMenuOpen: (event: MouseEvent<HTMLElement>) => void
  onMenuClose: () => void
}

const SpotifyDeviceSelector = ({
  availableDevices,
  deviceMenuAnchor,
  onDeviceSelect,
  onMenuOpen,
  onMenuClose,
}: SpotifyDeviceSelectorProps) => {
  const deviceMenuOpen = Boolean(deviceMenuAnchor)
  const devices = dedupeDevicesByName(availableDevices)

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
        data-testid="spotify-device-select"
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={deviceMenuAnchor}
        open={deviceMenuOpen}
        onClose={onMenuClose}
        // No scroll lock: locking adds body padding for the vanished
        // scrollbar, visibly shoving the cards sideways while the fixed
        // footer stays put. A transient dropdown needs no lock.
        disableScrollLock
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        data-testid="spotify-device-selector-menu"
        PaperProps={{
          'data-testid': 'spotify-device-selector-menu-paper',
        }}
      >
        {devices.length > 0 ? (
          devices.map((device) => (
            <MenuItem
              key={device.id}
              onClick={() => onDeviceSelect(device.id)}
              selected={device.is_active}
              data-testid={`spotify-device-select-option-${device.id}`}
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

export default SpotifyDeviceSelector

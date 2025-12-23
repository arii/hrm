'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { useSharedSpotifyDevices } from '@/context/SpotifyDevicesContext'
import { useState, MouseEvent } from 'react'

const SpotifyDeviceSelectorWrapper = () => {
  const { devices: availableDevices, handleDeviceSelected } =
    useSharedSpotifyDevices()
  const [deviceMenuAnchor, setDeviceMenuAnchor] = useState<null | HTMLElement>(
    null
  )

  const handleMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setDeviceMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setDeviceMenuAnchor(null)
  }

  const handleDeviceSelect = (deviceId: string) => {
    handleDeviceSelected(deviceId)
    handleMenuClose()
  }

  const deviceMenuOpen = Boolean(deviceMenuAnchor)

  return (
    <>
      <IconButton
        size="small"
        onClick={handleMenuOpen}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select Spotify Connect device"
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={deviceMenuAnchor}
        open={deviceMenuOpen}
        onClose={handleMenuClose}
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
              onClick={() => handleDeviceSelect(device.id)}
              selected={device.is_active}
            >
              {device.name}
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

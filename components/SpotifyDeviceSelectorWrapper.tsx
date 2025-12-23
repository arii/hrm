'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { useSharedSpotifyDevices } from '@/context/SpotifyDevicesContext'

const SpotifyDeviceSelectorWrapper = () => {
  const {
    availableDevices,
    deviceMenuAnchor,
    handleDeviceSelected,
    handleMenuOpen,
    handleMenuClose,
  } = useSharedSpotifyDevices()
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
              onClick={() => handleDeviceSelected(device.id)}
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

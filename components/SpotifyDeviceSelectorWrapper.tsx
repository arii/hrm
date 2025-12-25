'use client'

import { IconButton, Menu, MenuItem } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { useState, MouseEvent } from 'react'
import { useSpotifyDevicesContext } from '@/context/SpotifyDevicesContext'

const SpotifyDeviceSelectorWrapper = () => {
  const { devices, handleDeviceSelected, selectedDeviceId } =
    useSpotifyDevicesContext()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleSelect = (deviceId: string) => {
    handleDeviceSelected(deviceId)
    handleClose()
  }

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select playback device"
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {devices.length > 0 ? (
          devices.map((device) => (
            <MenuItem
              key={device.id}
              onClick={() => handleSelect(device.id)}
              selected={device.id === selectedDeviceId}
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

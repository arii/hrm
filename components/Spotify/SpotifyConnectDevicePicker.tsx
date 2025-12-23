'use client'

import { IconButton, Menu, MenuItem, CircularProgress, Box } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent, useState, useEffect } from 'react'
import { SpotifyDevice } from '@/types/core'

interface SpotifyConnectDevicePickerProps {
  devices: SpotifyDevice[]
  loading: boolean
  error: string | null
  refreshDevices: () => void
  onDeviceSelect: (deviceId: string) => void
}

const SpotifyConnectDevicePicker = ({
  devices,
  loading,
  error,
  refreshDevices,
  onDeviceSelect,
}: SpotifyConnectDevicePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDeviceSelect = (deviceId: string) => {
    onDeviceSelect(deviceId)
    handleClose()
  }

  useEffect(() => {
    if (open) {
      refreshDevices()
    }
  }, [open, refreshDevices])

  return (
    <>
      <IconButton
        id="device-button"
        size="small"
        onClick={handleClick}
        sx={{
          color: 'common.white',
          '&:hover': { backgroundColor: 'grey.800' },
        }}
        aria-label="Select playback device"
        aria-controls={open ? 'device-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <SpeakerIcon fontSize="small" />
      </IconButton>
      <Menu
        id="device-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'device-button',
        }}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
      >
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: 2,
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <MenuItem disabled>Error loading devices</MenuItem>
        ) : devices.length > 0 ? (
          devices.map((device) => (
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

export default SpotifyConnectDevicePicker

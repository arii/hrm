'use client'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'
import {
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Tooltip,
} from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent, useState } from 'react'
import ComputerIcon from '@mui/icons-material/Computer'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import SpeakerGroupIcon from '@mui/icons-material/SpeakerGroup'
import DevicesIcon from '@mui/icons-material/Devices'

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type.toLowerCase()) {
    case 'computer':
      return <ComputerIcon fontSize="small" sx={{ mr: 1 }} />
    case 'smartphone':
      return <SmartphoneIcon fontSize="small" sx={{ mr: 1 }} />
    case 'speaker':
      return <SpeakerGroupIcon fontSize="small" sx={{ mr: 1 }} />
    default:
      return <DevicesIcon fontSize="small" sx={{ mr: 1 }} />
  }
}

const SpotifyDevicePicker = () => {
  const { devices, selectedDeviceId, loading, error, transferPlayback } =
    useSpotifyDevices()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleDeviceSelect = (deviceId: string) => {
    transferPlayback(deviceId)
    handleClose()
  }

  const activeDeviceName =
    devices.find((d) => d.id === selectedDeviceId)?.name || 'No active device'

  if (loading) {
    return <CircularProgress size={24} />
  }

  if (error) {
    return (
      <Tooltip title={error}>
        <SpeakerIcon fontSize="small" color="error" />
      </Tooltip>
    )
  }

  return (
    <>
      <Tooltip title={`Device: ${activeDeviceName}`}>
        <IconButton
          id="basic-button"
          onClick={handleClick}
          size="small"
          sx={{ color: 'common.white', '&:hover': { backgroundColor: 'grey.800' } }}
          aria-controls={open ? 'device-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={open ? 'true' : undefined}
        >
          <SpeakerIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="device-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
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
        {devices.length > 0 ? (
          devices.map((device) => (
            <MenuItem
              key={device.id}
              selected={device.id === selectedDeviceId}
              onClick={() => handleDeviceSelect(device.id)}
            >
              <DeviceIcon type={device.type} />
              {device.name}
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>No devices found</MenuItem>
        )}
      </Menu>
    </>
  )
}

export default SpotifyDevicePicker

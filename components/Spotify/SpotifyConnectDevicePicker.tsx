'use client'

import { IconButton, Menu, MenuItem, CircularProgress } from '@mui/material'
import SpeakerIcon from '@mui/icons-material/Speaker'
import { MouseEvent, useState, useEffect } from 'react'
import { SpotifyDevice } from '@/types/core'
import { API_SPOTIFY_DEVICES } from '@/constants/apiEndpoints'
import logger from '@/utils/logger'

interface SpotifyConnectDevicePickerProps {
  onDeviceSelect: (deviceId: string) => void
}

const SpotifyConnectDevicePicker = ({
  onDeviceSelect,
}: SpotifyConnectDevicePickerProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [devices, setDevices] = useState<SpotifyDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
    const fetchDevices = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(API_SPOTIFY_DEVICES)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setDevices(Array.isArray(data) ? data : [])
      } catch (e) {
        const errorMessage =
          e instanceof Error ? e.message : 'An unknown error occurred'
        setError(errorMessage)
        logger.error({ error: e }, 'Failed to fetch Spotify devices')
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      fetchDevices()
    }
  }, [open])

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
          <MenuItem disabled>
            <CircularProgress size={20} />
          </MenuItem>
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

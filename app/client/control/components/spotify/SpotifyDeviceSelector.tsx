// File: app/client/control/components/spotify/SpotifyDeviceSelector.tsx
import Box from '@mui/material/Box'
import FormControl from '@mui/material/FormControl'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import Typography from '@mui/material/Typography'
import { useEffect, useRef } from 'react'
import { SpotifyDevice } from '@/types/core'

interface SpotifyDeviceSelectorProps {
  devices: SpotifyDevice[]
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
  onDeviceSync: (deviceId: string) => void
  hrmDevice?: SpotifyDevice
  disabled?: boolean
}

const SpotifyDeviceSelector = ({
  devices,
  selectedDeviceId,
  onDeviceChange,
  onDeviceSync,
  hrmDevice,
  disabled,
}: SpotifyDeviceSelectorProps) => {
  const prevActiveIdRef = useRef<string | undefined>(undefined)

  // Sync selected device with active device
  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    const activeId = activeDevice?.id

    // Helper: determine if device should be updated to activeId
    const shouldUpdateToActive = () => {
      // Initial sync or active device changed externally
      if (!prevActiveIdRef.current || activeId !== prevActiveIdRef.current) {
        return Boolean(activeId)
      }
      // Selected device no longer exists or no device selected
      const selectedStillExists = devices.some((d) => d.id === selectedDeviceId)
      return (!selectedDeviceId || !selectedStillExists) && Boolean(activeId)
    }

    if (shouldUpdateToActive()) {
      onDeviceSync(activeId!)
    }
    prevActiveIdRef.current = activeId
  }, [devices, selectedDeviceId, onDeviceSync])

  // Auto-select HRM Web Player if no active device is available
  useEffect(() => {
    if (
      devices.length > 0 &&
      !selectedDeviceId &&
      !devices.some((d) => d.is_active) &&
      hrmDevice
    ) {
      onDeviceSync(hrmDevice.id)
    }
  }, [devices, selectedDeviceId, hrmDevice, onDeviceSync])

  if (devices.length === 0) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
        Device
      </Typography>
      <FormControl fullWidth size="small">
        <Select
          value={selectedDeviceId}
          onChange={(e) => onDeviceChange(e.target.value as string)}
          disabled={disabled}
          sx={{
            color: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'grey.600',
            },
            '& .MuiSvgIcon-root': {
              color: 'white',
            },
          }}
          data-testid="spotify-device-select"
        >
          {devices.map((device) => (
            <MenuItem
              key={device.id}
              value={device.id}
              data-testid={`spotify-device-select-option-${device.id}`}
            >
              {device.name} {device.is_active && '(Active)'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  )
}

export default SpotifyDeviceSelector

// components/ConnectedBluetoothHRTile.tsx
'use client'

import { Grid } from '@mui/material'
import { useBluetoothHRMContext } from '../contexts/BluetoothHRMContext'
import useWebSocket from '../hooks/useWebSocket'
import { getHrZoneProps } from '../utils/visualization'
import HrTile from './HrTile'

/**
 * Renders a single focused HR tile for the directly connected Bluetooth HRM, if present.
 * Keeps the dashboard page lean by encapsulating derivation logic.
 */
export default function ConnectedBluetoothHRTile() {
  const { isConnected } = useBluetoothHRMContext()
  const { hrmData } = useWebSocket()

  if (!isConnected) return null

  const connectedHrm = hrmData.find((d) => d.name?.includes('Bluetooth HRM'))
  if (!connectedHrm) return null

  const zone = getHrZoneProps(connectedHrm.value, connectedHrm.maxHr ?? 190)

  return (
    <Grid
      item
      xs={12}
      sm={6}
      md={4}
      lg={3}
      data-testid="connected-bluetooth-hrm-tile"
    >
      <HrTile
        name={connectedHrm.name ?? 'Bluetooth HRM'}
        bpm={connectedHrm.value}
        percentMax={zone.percentage}
        background={zone.progressColor}
      />
    </Grid>
  )
}

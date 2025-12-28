// app/client/connect/components/UnitSystemSelection.tsx
'use client'

import React from 'react'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { MeasurementSystem } from '@/types'

interface UnitSystemSelectionProps {
  unitSystem: MeasurementSystem
  handleUnitChange: (
    _event: React.MouseEvent<HTMLElement>,
    newUnit: MeasurementSystem | null
  ) => void
}

const UnitSystemSelection: React.FC<UnitSystemSelectionProps> = ({
  unitSystem,
  handleUnitChange,
}) => {
  return (
    <ToggleButtonGroup
      value={unitSystem}
      exclusive
      onChange={handleUnitChange}
      aria-label="Unit system"
      fullWidth
    >
      <ToggleButton value="IMPERIAL" aria-label="imperial units">
        Imperial (lbs, ft, in)
      </ToggleButton>
      <ToggleButton value="METRIC" aria-label="metric units">
        Metric (kg, cm)
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export default UnitSystemSelection

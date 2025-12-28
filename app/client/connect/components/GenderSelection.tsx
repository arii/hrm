// app/client/connect/components/GenderSelection.tsx
'use client'

import React from 'react'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { Gender } from '../../../types'

interface GenderSelectionProps {
  gender: Gender
  handleGenderChange: (
    _event: React.MouseEvent<HTMLElement>,
    newGender: Gender | null
  ) => void
}

const GenderSelection: React.FC<GenderSelectionProps> = ({
  gender,
  handleGenderChange,
}) => {
  return (
    <ToggleButtonGroup
      value={gender}
      exclusive
      onChange={handleGenderChange}
      aria-label="Gender"
      fullWidth
    >
      <ToggleButton value="MALE" aria-label="male">
        Male
      </ToggleButton>
      <ToggleButton value="FEMALE" aria-label="female">
        Female
      </ToggleButton>
    </ToggleButtonGroup>
  )
}

export default GenderSelection

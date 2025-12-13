'use client'

import React from 'react'
import IconButton from '@mui/material/IconButton'
import RepeatIcon from '@mui/icons-material/Repeat'
import RepeatOneIcon from '@mui/icons-material/RepeatOne'

type RepeatState = 'off' | 'track' | 'context'

interface RepeatButtonProps {
  repeatState: RepeatState
  onToggleRepeat: (state: RepeatState) => void
}

const RepeatButton: React.FC<RepeatButtonProps> = ({
  repeatState,
  onToggleRepeat,
}) => {
  const handleToggle = () => {
    const nextState: RepeatState =
      repeatState === 'off'
        ? 'context'
        : repeatState === 'context'
          ? 'track'
          : 'off'
    onToggleRepeat(nextState)
  }

  return (
    <IconButton
      size="small"
      onClick={handleToggle}
      sx={{
        color: repeatState !== 'off' ? 'primary.main' : 'common.white',
        '&:hover': { backgroundColor: 'grey.800' },
      }}
      aria-label={`Repeat mode: ${repeatState}`}
    >
      {repeatState === 'track' ? <RepeatOneIcon /> : <RepeatIcon />}
    </IconButton>
  )
}

export default RepeatButton

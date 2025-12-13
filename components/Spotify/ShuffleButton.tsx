'use client'

import React from 'react'
import IconButton from '@mui/material/IconButton'
import ShuffleIcon from '@mui/icons-material/Shuffle'

interface ShuffleButtonProps {
  shuffleState: boolean
  onToggleShuffle: (state: boolean) => void
}

const ShuffleButton: React.FC<ShuffleButtonProps> = ({
  shuffleState,
  onToggleShuffle,
}) => {
  return (
    <IconButton
      size="small"
      onClick={() => onToggleShuffle(!shuffleState)}
      sx={{
        color: shuffleState ? 'primary.main' : 'common.white',
        '&:hover': { backgroundColor: 'grey.800' },
      }}
      aria-label={shuffleState ? 'Disable shuffle' : 'Enable shuffle'}
    >
      <ShuffleIcon />
    </IconButton>
  )
}

export default ShuffleButton

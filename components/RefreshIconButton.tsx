'use client'

import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { memo } from 'react'

interface RefreshIconButtonProps {
  onClick: () => void
  'aria-label': string
}

const RefreshIconButton = ({ onClick, ...props }: RefreshIconButtonProps) => {
  return (
    <IconButton
      onClick={onClick}
      data-testid="refresh-icon-button"
      sx={(theme) => ({
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        width: 48,
        height: 48,
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
        backdropFilter: 'blur(4px)',
        '&:hover': {
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
        },
      })}
      {...props}
    >
      <RefreshIcon fontSize="small" />
    </IconButton>
  )
}

export default memo(RefreshIconButton)

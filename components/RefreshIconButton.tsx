'use client'

import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { memo } from 'react'

interface RefreshIconButtonProps {
  onClick: () => void
  'aria-label': string
}

/**
 * Standardized refresh button used across the dashboard components.
 * Adheres to the 48px touch target requirement and consistent styling.
 */
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

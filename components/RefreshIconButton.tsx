'use client'

<<<<<<< HEAD
import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { memo } from 'react'

interface RefreshIconButtonProps {
=======
interface RefreshIconButtonProps extends IconButtonProps {
>>>>>>> origin/leader
  onClick: () => void
}

<<<<<<< HEAD
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
=======
const RefreshIconButton = ({ onClick, ...props }: RefreshIconButtonProps) => (
  <IconButton
    onClick={onClick}
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
      width: 48,
      height: 48,
    })}
    {...props}
  >
    <RefreshIcon fontSize="small" />
  </IconButton>
)
>>>>>>> origin/leader

export default memo(RefreshIconButton)

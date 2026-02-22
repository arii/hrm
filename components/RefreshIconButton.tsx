'use client'

import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton, IconButtonProps } from '@mui/material'
import { memo } from 'react'

interface RefreshIconButtonProps extends IconButtonProps {
  onClick: () => void
}

const RefreshIconButton = ({
  onClick,
  sx,
  ...props
}: RefreshIconButtonProps) => {
  return (
    <IconButton onClick={onClick} sx={sx} {...props}>
      <RefreshIcon fontSize="small" />
    </IconButton>
  )
}

export default memo(RefreshIconButton)

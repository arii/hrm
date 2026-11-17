'use client'

import RefreshIcon from '@mui/icons-material/Refresh'
import { IconButton, IconButtonProps } from '@mui/material'
import { keyframes } from '@emotion/react'
import { memo } from 'react'

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`

interface RefreshIconButtonProps extends IconButtonProps {
  onClick: () => void
  spinning?: boolean
}

const RefreshIconButton = ({
  onClick,
  spinning = false,
  sx,
  ...props
}: RefreshIconButtonProps) => {
  return (
    <IconButton onClick={onClick} sx={sx} aria-busy={spinning} {...props}>
      <RefreshIcon
        sx={{
          animation: spinning ? `${spin} 0.8s linear infinite` : 'none',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    </IconButton>
  )
}

export default memo(RefreshIconButton)

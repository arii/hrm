'use client'

import React, { useRef } from 'react'
import { SnackbarProvider, closeSnackbar } from 'notistack'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { styled, alpha } from '@mui/material/styles'

// Custom styled component for the snackbar items
const StyledSnackbarProvider = styled(SnackbarProvider)(({ theme }) => {
  const commonStyles = {
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.common.white,
    '& .MuiSnackbarContent-message': {
      fontWeight: 'bold',
    },
  }

  return {
    '&.notistack-variant-success': {
      backgroundColor: theme.palette.success.main,
      ...commonStyles,
    },
    '&.notistack-variant-error': {
      backgroundColor: theme.palette.error.main,
      ...commonStyles,
    },
    '&.notistack-variant-warning': {
      backgroundColor: theme.palette.warning.main,
      ...commonStyles,
    },
    '&.notistack-variant-info': {
      backgroundColor: theme.palette.info.main,
      ...commonStyles,
    },
    '&.notistack-MuiContent-root': {
        color: theme.palette.text.primary,
        backgroundColor: 'transparent',
        boxShadow: 'none',
        backgroundImage: `linear-gradient(to right, ${alpha(
          theme.palette.background.paper,
          0.7
        )}, ${alpha(theme.palette.background.paper, 0.95)})`,
        border: `1px solid ${theme.palette.divider}`,
        backdropFilter: 'blur(8px)',
    }
  }
})

// Add a close button to all snackbars
const CloseButton = ({ snackbarKey }: { snackbarKey: string | number }) => (
  <IconButton
    onClick={() => closeSnackbar(snackbarKey)}
    sx={{ color: 'inherit' }}
    size="small"
  >
    <CloseIcon fontSize="small" />
  </IconButton>
)

export default function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const notistackRef = useRef<SnackbarProvider>(null)

  return (
    <StyledSnackbarProvider
      ref={notistackRef}
      maxSnack={3}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      autoHideDuration={3000}
      action={(key) => <CloseButton snackbarKey={key} />}
    >
      {children}
    </StyledSnackbarProvider>
  )
}

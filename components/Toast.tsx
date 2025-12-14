import React from 'react'
import { Alert, AlertTitle, Snackbar, IconButton } from '@mui/material'
import {
  CheckCircleOutline,
  ErrorOutline,
  InfoOutlined,
  WarningAmberOutlined,
  Close,
} from '@mui/icons-material'
import { Toast as ToastType, ToastType as Type } from '@/types/toast'

interface ToastProps {
  toast: ToastType
  onClose: (id: number) => void
}

const icons: Record<Type, React.ElementType> = {
  success: CheckCircleOutline,
  error: ErrorOutline,
  info: InfoOutlined,
  warning: WarningAmberOutlined,
}

const titles: Record<Type, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Info',
  warning: 'Warning',
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const { id, message, type, duration = 6000 } = toast
  const Icon = icons[type]
  const title = titles[type]

  return (
    <Snackbar
      open={true}
      autoHideDuration={duration}
      onClose={() => onClose(id)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      role="alert"
      aria-live="assertive"
      sx={{
        position: 'relative',
        top: 0,
        right: 0,
        left: 0,
        zIndex: 1400,
        transform: 'none',
        transition: 'none',
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <Alert
        severity={type}
        icon={<Icon data-testid={`${type}-icon`} fontSize="inherit" />}
        action={
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={() => onClose(id)}
          >
            <Close fontSize="inherit" />
          </IconButton>
        }
        sx={{ width: '100%', maxWidth: '600px', mb: 2 }}
      >
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  )
}

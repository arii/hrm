import { enqueueSnackbar } from 'notistack'

export const showSuccess = (message: string) => {
  enqueueSnackbar(message, { variant: 'success' })
}

export const showError = (message: string) => {
  enqueueSnackbar(message, { variant: 'error' })
}

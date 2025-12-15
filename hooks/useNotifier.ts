'use client'

import { useSnackbar, VariantType } from 'notistack'

export const useNotifier = () => {
  const { enqueueSnackbar } = useSnackbar()

  const showNotification = (
    message: string,
    variant: VariantType = 'default'
  ) => {
    enqueueSnackbar(message, { variant })
  }

  return { showNotification }
}

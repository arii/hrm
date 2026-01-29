import { enqueueSnackbar } from 'notistack'
import { showSuccess, showError } from '@/lib/notifications'

jest.mock('notistack', () => ({
  enqueueSnackbar: jest.fn(),
}))

describe('notification utilities', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('showSuccess calls enqueueSnackbar with success variant', () => {
    showSuccess('Test success message')
    expect(enqueueSnackbar).toHaveBeenCalledWith('Test success message', {
      variant: 'success',
    })
  })

  it('showError calls enqueueSnackbar with error variant', () => {
    showError('Test error message')
    expect(enqueueSnackbar).toHaveBeenCalledWith('Test error message', {
      variant: 'error',
      persist: undefined,
    })
  })

  it('showError calls enqueueSnackbar with persist option', () => {
    showError('Test persistent error', { persist: true })
    expect(enqueueSnackbar).toHaveBeenCalledWith('Test persistent error', {
      variant: 'error',
      persist: true,
    })
  })
})

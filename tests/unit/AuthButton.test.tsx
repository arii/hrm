// tests/unit/AuthButton.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useSession, signIn, signOut } from 'next-auth/react'
import AuthButton from '@/components/AuthButton'

// Mock next-auth
jest.mock('next-auth/react')

const useSessionMock = useSession as jest.Mock
const signInMock = signIn as jest.Mock
const signOutMock = signOut as jest.Mock

describe('AuthButton', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders login button when unauthenticated', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated' })
    render(<AuthButton />)
    expect(screen.getByText('Login with Spotify')).toBeInTheDocument()
  })

  it('calls signIn when login button is clicked', async () => {
    const user = userEvent.setup()
    useSessionMock.mockReturnValue({ status: 'unauthenticated' })
    render(<AuthButton />)
    await user.click(screen.getByText('Login with Spotify'))
    expect(signInMock).toHaveBeenCalledWith('spotify', {
      callbackUrl: '/',
      redirect: true,
    })
  })

  it('renders logout button when authenticated', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('opens confirmation dialog on logout click', async () => {
    const user = userEvent.setup()
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    await user.click(screen.getByText('Logout'))
    expect(screen.getByText('Confirm Logout')).toBeInTheDocument()
  })

  it('calls signOut on logout confirmation', async () => {
    const user = userEvent.setup()
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    await user.click(screen.getByText('Logout'))
    // After the dialog opens, there are two "Logout" buttons.
    // We target the one inside the dialog role.
    const dialog = screen.getByRole('dialog')
    const logoutButtonInDialog = within(dialog).getByRole('button', {
      name: /logout/i,
    })
    await user.click(logoutButtonInDialog)
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('closes dialog on cancel', async () => {
    const user = userEvent.setup()
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    await user.click(screen.getByText('Logout'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})

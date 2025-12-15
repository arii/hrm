// tests/unit/AuthButton.test.tsx
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, within } from '@testing-library/react'
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

  it('calls signIn when login button is clicked', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated' })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Login with Spotify'))
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

  it('opens confirmation dialog on logout click', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    expect(screen.getByText('Confirm Logout')).toBeInTheDocument()
  })

  it('calls signOut on logout confirmation', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    // After the dialog opens, there are two "Logout" buttons.
    // We target the one inside the dialog role.
    const dialog = screen.getByRole('dialog')
    const logoutButtonInDialog = within(dialog).getByRole('button', {
      name: /logout/i,
    })
    fireEvent.click(logoutButtonInDialog)
    expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
  })

  it('closes dialog on cancel', () => {
    useSessionMock.mockReturnValue({ status: 'authenticated' })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

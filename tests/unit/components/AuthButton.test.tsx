/**
 * @jest-environment jsdom
 */
// tests/unit/components/AuthButton.test.tsx
import '@testing-library/jest-dom'
import { render, screen, fireEvent, within } from '@testing-library/react'
import AuthButton from '@/components/AuthButton'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useSnackbar } from '@/context/SnackbarContext'

// Mock next-auth/react
jest.mock('next-auth/react')

// Mock SnackbarContext
jest.mock('@/context/SnackbarContext')

const useSessionMock = useSession as jest.Mock
const signInMock = signIn as jest.Mock
const signOutMock = signOut as jest.Mock
const useSnackbarMock = useSnackbar as jest.Mock

describe('AuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useSnackbarMock.mockReturnValue({
      openSnackbar: jest.fn(),
    })
  })
  it('renders login button when logged out', () => {
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
    render(<AuthButton />)
    expect(screen.getByText('Login with Spotify')).toBeInTheDocument()
  })

  it('calls signIn when login button is clicked', () => {
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Login with Spotify'))
    expect(signInMock).toHaveBeenCalledWith('spotify')
  })

  it('renders loading state', () => {
    useSessionMock.mockReturnValue({ data: null, status: 'loading' })
    render(<AuthButton />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders logout button when logged in', () => {
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    expect(screen.getByText('Logged in as Test User')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('shows confirmation dialog on logout click', () => {
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    expect(
      screen.getByText('Are you sure you want to log out?')
    ).toBeInTheDocument()
  })

  it('calls signOut when logout is confirmed', () => {
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    const dialog = screen.getByRole('dialog')
    const logoutButton = within(dialog).getByRole('button', { name: /logout/i })
    fireEvent.click(logoutButton)
    expect(signOutMock).toHaveBeenCalled()
  })

  it('does not call signOut when logout is cancelled', () => {
    useSessionMock.mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it('shows snackbar on signIn error', async () => {
    const openSnackbarMock = jest.fn()
    useSnackbarMock.mockReturnValue({ openSnackbar: openSnackbarMock })
    useSessionMock.mockReturnValue({ data: null, status: 'unauthenticated' })
    signInMock.mockResolvedValue({ error: 'Test error' })

    render(<AuthButton />)
    fireEvent.click(screen.getByText('Login with Spotify'))

    await screen.findByText('Login with Spotify') // Wait for async operations to complete

    expect(openSnackbarMock).toHaveBeenCalledWith('Error: Test error', 'error')
  })
})

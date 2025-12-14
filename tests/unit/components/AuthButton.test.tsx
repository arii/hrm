/**
 * @jest-environment jsdom
 */
// tests/unit/components/AuthButton.test.tsx
import { render, screen, fireEvent, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSession, signIn, signOut } from 'next-auth/react'
import AuthButton from '@/components/AuthButton'

// Mock the next-auth/react module
jest.mock('next-auth/react')

describe('AuthButton', () => {
  it('renders login button when not authenticated', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    render(<AuthButton />)
    expect(screen.getByText('Login with Spotify')).toBeInTheDocument()
  })

  it('calls signIn when login button is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Login with Spotify'))
    expect(signIn).toHaveBeenCalledWith('spotify')
  })

  it('renders logout button when authenticated', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('opens confirmation dialog when logout button is clicked', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    expect(screen.getByText('Confirm Logout')).toBeInTheDocument()
  })

  it('calls signOut when logout is confirmed', () => {
    ;(useSession as jest.Mock).mockReturnValue({
      data: { user: { name: 'Test User' } },
      status: 'authenticated',
    })
    render(<AuthButton />)
    fireEvent.click(screen.getByText('Logout'))
    const dialog = screen.getByRole('dialog')
    const logoutButton = within(dialog).getByRole('button', { name: /logout/i })
    fireEvent.click(logoutButton)
    expect(signOut).toHaveBeenCalled()
  })
})

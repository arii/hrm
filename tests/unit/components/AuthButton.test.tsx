/**
 * @jest-environment jsdom
 */
// tests/unit/components/AuthButton.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import AuthButton from '@/components/AuthButton'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

const mockSignIn = signIn as jest.Mock

describe('AuthButton', () => {
  let savedBasePath: string | undefined
  let savedAuthUrl: string | undefined

  beforeEach(() => {
    savedBasePath = process.env.NEXT_PUBLIC_BASE_PATH
    savedAuthUrl = process.env.NEXTAUTH_URL
    delete process.env.NEXT_PUBLIC_BASE_PATH
    delete process.env.NEXTAUTH_URL
    mockSignIn.mockReset()
    mockSignIn.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (savedBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = savedBasePath
    if (savedAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = savedAuthUrl
  })

  it('should have the correct aria-label', () => {
    render(<AuthButton providerId="spotify" providerName="Spotify" />)
    const button = screen.getByRole('button', { name: /login with spotify/i })
    expect(button).toHaveAttribute('aria-label', 'Login with Spotify')
  })

  it('should land on site root after login without a base path', async () => {
    render(<AuthButton providerId="spotify" providerName="Spotify" />)
    fireEvent.click(screen.getByRole('button', { name: /login with spotify/i }))
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(
        'spotify',
        expect.objectContaining({ callbackUrl: '/' })
      )
    )
  })

  it('should land inside the base path when configured', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    render(<AuthButton providerId="spotify" providerName="Spotify" />)
    fireEvent.click(screen.getByRole('button', { name: /login with spotify/i }))
    await waitFor(() =>
      expect(mockSignIn).toHaveBeenCalledWith(
        'spotify',
        expect.objectContaining({ callbackUrl: '/hrm' })
      )
    )
  })
})

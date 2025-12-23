/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { signIn } from 'next-auth/react'
import SpotifyLoginButton from '@/components/SpotifyLoginButton'
import { ErrorProvider, useError } from '@/context/ErrorContext'

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}))

// Mock the uuid package to prevent ESM import errors in Jest
jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-v4',
}))

const mockAddError = jest.fn()

jest.mock('@/context/ErrorContext', () => ({
  ...jest.requireActual('@/context/ErrorContext'),
  useError: () => ({
    addError: mockAddError,
  }),
}))

describe('SpotifyLoginButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('calls addError when signIn fails', async () => {
    ;(signIn as jest.Mock).mockResolvedValue({ error: 'Test error' })

    render(
      <ErrorProvider>
        <SpotifyLoginButton />
      </ErrorProvider>
    )

    fireEvent.click(screen.getByText('Login with Spotify'))

    await screen.findByText('Logging in...')

    expect(mockAddError).toHaveBeenCalledWith(
      'Authentication failed. Please try again.'
    )
  })
})

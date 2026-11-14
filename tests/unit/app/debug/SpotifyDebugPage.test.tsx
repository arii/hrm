/**
 * @jest-environment jsdom
 */
import SpotifyDebugPage from '@/app/debug/spotify/page'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { notFound } from 'next/navigation'

jest.mock('next/navigation', () => ({
  // Real notFound() throws so Next renders the 404 boundary.
  notFound: jest.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

jest.mock('@/lib/env', () => ({
  env: {},
}))

jest.mock('@/app/debug/spotify/SpotifyDebugContent', () => ({
  __esModule: true,
  default: () => <div data-testid="spotify-debug-content" />,
}))

const mockEnv = jest.requireMock('@/lib/env').env as Record<
  string,
  string | undefined
>
const mockNotFound = notFound as jest.Mock

describe('SpotifyDebugPage production gate (OQ-3a)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    for (const key of Object.keys(mockEnv)) delete mockEnv[key]
  })

  it('renders 404 in production without the TESTING bypass', () => {
    mockEnv.NODE_ENV = 'production'
    expect(() => render(<SpotifyDebugPage />)).toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('renders the debug page in production with TESTING=true (VRT)', () => {
    mockEnv.NODE_ENV = 'production'
    mockEnv.TESTING = 'true'
    render(<SpotifyDebugPage />)

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(screen.getByTestId('spotify-debug-content')).toBeInTheDocument()
  })

  it('renders the debug page outside production', () => {
    mockEnv.NODE_ENV = 'development'
    render(<SpotifyDebugPage />)

    expect(mockNotFound).not.toHaveBeenCalled()
    expect(screen.getByTestId('spotify-debug-content')).toBeInTheDocument()
  })
})

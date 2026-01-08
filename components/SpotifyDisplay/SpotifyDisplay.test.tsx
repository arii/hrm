/**
 * @jest-environment jsdom
 */
import { WebSocketProvider } from '@/context/WebSocketContext'
import React from 'react'
import SpotifyDisplay from '../SpotifyDisplay'
import { assertNoA11yViolations } from '../../tests/utils/a11y'
import { AudioProvider } from '@/context/AudioContext'
import { ErrorProvider } from '@/context/ErrorContext'
import { SessionProvider, useSession } from 'next-auth/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/lib/theme'

// Mock the useAudio hook
jest.mock('@/hooks/useAudio', () => ({
  useAudio: () => ({
    initializeAudio: jest.fn(),
    playLongBeep: jest.fn(),
    playShortBeep: jest.fn(),
    volume: 1,
    setVolume: jest.fn(),
    muted: false,
    toggleMute: jest.fn(),
  }),
}))

jest.mock('next-auth/react')
const mockedUseSession = useSession as jest.Mock

describe('<SpotifyDisplay /> Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })
    await assertNoA11yViolations(
      <ThemeProvider theme={theme}>
        <SessionProvider>
          <ErrorProvider>
            <WebSocketProvider>
              <AudioProvider>
                <SpotifyDisplay />
              </AudioProvider>
            </WebSocketProvider>
          </ErrorProvider>
        </SessionProvider>
      </ThemeProvider>
    )
  })

  it('should have no accessibility violations in logged-in state', async () => {
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          name: 'Test User',
          email: 'test@example.com',
          image: '',
        },
        expires: '2099-12-31T23:59:59.999Z',
      },
      status: 'authenticated',
    })
    await assertNoA11yViolations(
      <ThemeProvider theme={theme}>
        <SessionProvider>
          <ErrorProvider>
            <WebSocketProvider>
              <AudioProvider>
                <SpotifyDisplay />
              </AudioProvider>
            </WebSocketProvider>
          </ErrorProvider>
        </SessionProvider>
      </ThemeProvider>
    )
  })
})

/** @jest-environment jsdom */

import ControlPage from '@/app/client/control/page'
import { ErrorProvider } from '@/context/ErrorContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// Mock child components that have complex internal logic
jest.mock('@/app/client/control/components/TimerControls', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-timer-controls">Timer Controls</div>,
}))
jest.mock('@/app/client/control/components/SpotifyControls', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="mock-spotify-controls">Spotify Controls</div>
  ),
}))

describe('ControlPage Integration', () => {
  it('should render all child components within the providers', async () => {
    render(
      <SessionProvider session={null}>
        <ErrorProvider>
          <WebSocketProvider>
            <ControlPage />
          </WebSocketProvider>
        </ErrorProvider>
      </SessionProvider>
    )

    // Wait for all components to be rendered, including dynamic ones
    await waitFor(() => {
      expect(screen.getByTestId('mock-timer-controls')).toBeInTheDocument()
      expect(screen.getByTestId('mock-spotify-controls')).toBeInTheDocument()
    })
  })
})

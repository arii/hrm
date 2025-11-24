import React from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

// Create a test theme
const testTheme = createTheme({
  palette: {
    mode: 'light',
  },
})

// Custom render function that includes MUI theme provider
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  theme?: typeof testTheme
}

export function renderWithTheme(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { theme = testTheme, ...renderOptions } = options

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

// Mock WebSocket context provider
export const mockWebSocketContext = {
  connectionStatus: 'Connected' as const,
  lastMessage: null,
  sendMessage: jest.fn(),
  isConnected: true,
  currentUserData: null,
  timerState: {
    isRunning: false,
    currentPhase: 'STOPPED',
    timeRemaining: 0,
    currentRound: 0,
    totalRounds: 4,
    mode: 'TABATA',
  },
  spotifyData: {
    isPlaying: false,
    trackName: 'No track playing',
    artistName: '',
    deviceId: null,
    volume: 50,
  },
}

// Mock function for testing hooks
export const mockHookReturn = (returnValue: any) => {
  return jest.fn(() => returnValue)
}

// Helper to create mock event
export const createMockEvent = (overrides = {}) => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  ...overrides,
})

// Helper for async testing
export const waitForNextTick = () => new Promise(resolve => setImmediate(resolve))

// Re-export testing utilities for convenience
export { screen, fireEvent, waitFor, act } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'

/**
 * @jest-environment jsdom
 */
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext'
import React from 'react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { assertNoA11yViolations } from '@/tests/utils/a11y'
import { AudioProvider } from '@/context/AudioContext'
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

// Mock the useWebSocket hook
jest.mock('@/context/WebSocketContext', () => ({
  __esModule: true,
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => children,
  useWebSocket: () => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    readyState: 1, // Represents OPEN
    isConnected: true,
    error: null,
    closeConnection: jest.fn(),
    hrmData: [],
    timerData: {},
    spotifyData: {},
    activeAlerts: [],
    sendData: jest.fn(),
    connectionStatus: 'Connected',
  }),
}))

describe('<HrmConnectionPanel /> Accessibility', () => {
  it('should have no accessibility violations in default state', async () => {
    await assertNoA11yViolations(
      <ThemeProvider theme={theme}>
        <WebSocketProvider>
          <AudioProvider>
            <HrmConnectionPanel />
          </AudioProvider>
        </WebSocketProvider>
      </ThemeProvider>
    )
  })
})

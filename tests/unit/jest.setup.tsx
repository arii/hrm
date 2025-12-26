// jest.setup.js
import '@testing-library/jest-dom'
import React from 'react'

const mockContextValue = {
  spotifyData: {
    trackName: 'Test Track',
    artistName: 'Test Artist',
    albumName: 'Test Album',
    albumArtUrl: 'http://example.com/art.jpg',
    progressMs: 1000,
    durationMs: 3000,
    isPlaying: true,
  },
  timerData: {},
  hrmData: {},
  connectionStatus: 'Connected',
  setConnectionStatus: jest.fn(),
  sendData: jest.fn(),
}

// Create a mock context object
const WebSocketContext = React.createContext(mockContextValue)

// Mock the entire module
jest.mock('@/context/WebSocketContext', () => ({
  __esModule: true,
  // The hook returns the mock value
  useWebSocket: () => mockContextValue,
  // The context object is exported
  WebSocketContext: WebSocketContext,
  // The provider is a simple component that renders its children
  WebSocketProvider: ({ children }: { children: React.ReactNode }) => (
    <WebSocketContext.Provider value={mockContextValue}>
      {children}
    </WebSocketContext.Provider>
  ),
}))

// Mock navigator.bluetooth
if (typeof navigator !== 'undefined') {
  const mockBluetooth = {
    requestDevice: jest.fn(),
  }
  Object.defineProperty(navigator, 'bluetooth', {
    value: mockBluetooth,
    writable: true,
  })
}

/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render } from '@testing-library/react'
import ControlPanel from '@/app/client/control/ControlPanel'
import { ThemeProvider, createTheme } from '@mui/material/styles'

// Mock the WebSocket context to provide default values for child components
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    connectionStatus: 'Connected',
    connect: jest.fn(),
    sendData: jest.fn(),
    timerData: {
      isRunning: false,
      isPaused: false,
      phase: 'IDLE',
      timeRemaining: 0,
      totalTime: 0,
      workIntervals: 0,
    },
    spotifyData: {
      isPlaying: false,
      trackName: null,
      artistName: null,
      albumArtUrl: null,
      durationMs: 0,
      progressMs: 0,
    },
    // Provide other necessary mock data if components require it
  }),
}))

// Mock dynamic imports for child components to isolate the ControlPanel
jest.mock('next/dynamic', () => () => {
  const MockedComponent = (props: Record<string, unknown>) => {
    const { loading, ...rest } = props
    // A simple placeholder that includes any passed props
    return <div data-testid="mocked-dynamic-component" {...rest} />
  }
  MockedComponent.displayName = 'MockedDynamicComponent'
  return MockedComponent
})

describe('ControlPanel Component', () => {
  it('should match snapshot', () => {
    const theme = createTheme()
    const { asFragment } = render(
      <ThemeProvider theme={theme}>
        <ControlPanel />
      </ThemeProvider>
    )
    expect(asFragment()).toMatchSnapshot()
  })
})

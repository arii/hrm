/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, act, screen, waitFor } from '@testing-library/react'
import {
  WebSocketProvider,
  useWebSocket,
} from '../../../context/WebSocketContext'

// --- Mocks ---
const mockSend = jest.fn()
const mockClose = jest.fn()
let mockReadyState = WebSocket.CONNECTING
const eventHandlers: { [key: string]: (event?: any) => void } = {}

const mockWebSocket = jest.fn((url) => {
  const ws = {
    url,
    send: mockSend,
    close: mockClose,
    get readyState() {
      return mockReadyState
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }

  Object.defineProperties(ws, {
    onopen: {
      configurable: true,
      get: () => eventHandlers.open,
      set: (handler) => {
        eventHandlers.open = handler
      },
    },
    onclose: {
      configurable: true,
      get: () => eventHandlers.close,
      set: (handler) => {
        eventHandlers.close = handler
      },
    },
    onerror: {
      configurable: true,
      get: () => eventHandlers.error,
      set: (handler) => {
        eventHandlers.error = handler
      },
    },
    onmessage: {
      configurable: true,
      get: () => eventHandlers.message,
      set: (handler) => {
        eventHandlers.message = handler
      },
    },
  })

  return ws
})

// Mocks the global WebSocket constructor. The `any` assertion is necessary as the mock
// does not fully implement the WebSocket interface, which is acceptable for test purposes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.WebSocket = mockWebSocket as any
Object.assign(global.WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
})

const mockGetItem = jest.fn()
const mockSetItem = jest.fn()
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
  writable: true,
})

Object.defineProperty(window.crypto, 'randomUUID', {
  value: () => 'test-client-id',
  writable: true,
})
// --- End Mocks ---

describe('WebSocketProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSend.mockClear()
    mockClose.mockClear()
    mockWebSocket.mockClear()
    mockGetItem.mockClear()
    mockSetItem.mockClear()
    mockReadyState = WebSocket.CONNECTING
    Object.keys(eventHandlers).forEach((key) => delete eventHandlers[key])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render children', () => {
    render(
      <WebSocketProvider>
        <div>child</div>
      </WebSocketProvider>
    )
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('should attempt to connect on mount and update status', async () => {
    const TestComponent = () => {
      const { connectionStatus } = useWebSocket()!
      return <div>{connectionStatus}</div>
    }

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    expect(screen.getByText('Connecting...')).toBeInTheDocument()

    act(() => {
      if (eventHandlers.open) {
        mockReadyState = WebSocket.OPEN
        eventHandlers.open()
      }
    })

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    expect(mockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('ws://localhost/ws')
    )
    expect(mockWebSocket).toHaveBeenCalledWith(
      expect.stringContaining('clientId=test-client-id')
    )
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'GET_STATE' }))
  })

  it('should handle disconnection and attempt to reconnect with exponential backoff', async () => {
    const TestComponent = () => {
      const { connectionStatus } = useWebSocket()!
      return <div>{connectionStatus}</div>
    }

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    // Initial connection
    act(() => {
      if (eventHandlers.open) {
        mockReadyState = WebSocket.OPEN
        eventHandlers.open()
      }
    })
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    // Simulate disconnection
    act(() => {
      if (eventHandlers.close) {
        mockReadyState = WebSocket.CLOSED
        eventHandlers.close({ code: 1006, reason: 'Abnormal Closure' })
      }
    })
    await waitFor(() => {
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument()
    })

    // 1st reconnect attempt
    act(() => {
      jest.advanceTimersByTime(1000) // Initial delay
    })

    // Fail the next 9 attempts
    for (let i = 0; i < 9; i++) {
      act(() => {
        if (eventHandlers.close) {
          eventHandlers.close({ code: 1006, reason: 'Abnormal Closure' })
        }
      })
      act(() => {
        jest.advanceTimersByTime(1000 * 2 ** (i + 1)) // Exponential backoff
      })
    }

    // Final attempt fails
    act(() => {
      if (eventHandlers.close) {
        eventHandlers.close({ code: 1006, reason: 'Abnormal Closure' })
      }
    })
    await waitFor(() => {
      expect(
        screen.getByText(
          'Failed to connect. Please check your connection and refresh the page.'
        )
      ).toBeInTheDocument()
    })
  })

  it('should queue messages when disconnected and send them on reconnect', async () => {
    const TestComponent = () => {
      const { connectionStatus, sendData } = useWebSocket()!
      return (
        <div>
          <div>{connectionStatus}</div>
          <button onClick={() => sendData({ type: 'TEST_MESSAGE' })}>
            Send
          </button>
        </div>
      )
    }

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    // Not connected yet, so message should be queued
    act(() => {
      screen.getByText('Send').click()
    })
    expect(mockSend).not.toHaveBeenCalled()
    expect(mockSetItem).toHaveBeenCalledWith(
      'pendingActions',
      JSON.stringify([{ type: 'TEST_MESSAGE' }])
    )

    // Connect
    act(() => {
      if (eventHandlers.open) {
        mockReadyState = WebSocket.OPEN
        eventHandlers.open()
      }
    })
    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument()
    })

    // Queued message should be sent
    expect(mockSend).toHaveBeenCalledWith(
      JSON.stringify({ type: 'TEST_MESSAGE' })
    )
    // The GET_STATE call + the queued message
    expect(mockSend).toHaveBeenCalledTimes(2)
    // Pending actions should be cleared from localStorage
    expect(mockSetItem).toHaveBeenCalledWith('pendingActions', '[]')
  })

  it('should send pings and reconnect if pong is not received', async () => {
    render(
      <WebSocketProvider>
        <div />
      </WebSocketProvider>
    )

    // Connect
    act(() => {
      if (eventHandlers.open) {
        mockReadyState = WebSocket.OPEN
        eventHandlers.open()
      }
    })

    // Advance time to trigger heartbeat
    act(() => {
      jest.advanceTimersByTime(30000)
    })
    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'PING' }))

    // Advance time to trigger pong timeout
    act(() => {
      jest.advanceTimersByTime(15000)
    })
    expect(mockClose).toHaveBeenCalled()
  })

  it('should throttle connection warnings', () => {
    const logger = require('../../../utils/logger').default
    logger.warn = jest.fn()

    const TestComponent = () => {
      const { sendData } = useWebSocket()!
      return (
        <button onClick={() => sendData({ type: 'TEST_MESSAGE' })}>
          Send
        </button>
      )
    }

    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )

    // Not connected yet, so messages should be queued
    act(() => {
      screen.getByText('Send').click()
      screen.getByText('Send').click()
      screen.getByText('Send').click()
    })
    expect(logger.warn).toHaveBeenCalledTimes(1)

    // Advance time past the throttle period
    act(() => {
      jest.advanceTimersByTime(5000)
    })

    act(() => {
      screen.getByText('Send').click()
    })
    expect(logger.warn).toHaveBeenCalledTimes(2)
  })
})

/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext'
import { ReactNode } from 'react'

// --- Mocks ---

// Mock the useConnectivity hook to give us control over the online status
const mockUseConnectivity = jest.fn()
jest.mock('@/context/ConnectivityContext', () => ({
  useConnectivity: () => mockUseConnectivity(),
}))

// Mock the global WebSocket class to intercept connections
const mockSend = jest.fn()
const mockClose = jest.fn()
let mockWebSocketInstance: MockWebSocket | null = null

class MockWebSocket {
  url: string
  onopen: () => void = () => {}
  onclose: (event: { code: number; reason: string }) => void = () => {}
  readyState: number = 0 // CONNECTING

  constructor(url: string) {
    this.url = url
    mockWebSocketInstance = this
    this.readyState = 0
  }

  // --- Test utility methods to simulate server events ---
  _open() {
    this.readyState = 1 // OPEN
    // CRITICAL: Wrap the event handler call in `act` to ensure React processes the state update
    act(() => {
      this.onopen()
    })
  }

  _close(code = 1000, reason = 'Test close') {
    this.readyState = 3 // CLOSED
    act(() => {
      this.onclose({ code, reason })
    })
  }

  // --- WebSocket API methods ---
  send(data: any) {
    if (this.readyState !== 1) {
      throw new Error('WebSocket is not open')
    }
    mockSend(data)
  }
  close() {
    if (this.readyState === 3) return // Already closed
    mockClose()
    this.readyState = 2 // CLOSING
    this._close()
  }
}

global.WebSocket = MockWebSocket as any

// --- Test Suite ---

describe('WebSocketProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketInstance = null
    mockUseConnectivity.mockReturnValue({ isOnline: true }) // Default to online
    jest.useFakeTimers() // Use fake timers for all tests to control reconnect logic
  })

  afterEach(() => {
    jest.useRealTimers() // Clean up fake timers
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  )

  it('should not attempt to connect if the browser is offline', () => {
    mockUseConnectivity.mockReturnValue({ isOnline: false })
    renderHook(() => useWebSocket(), { wrapper })
    expect(mockWebSocketInstance).toBeNull()
  })

  it('should connect when online and set connection status to "Connected"', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper })

    expect(result.current.connectionStatus).toBe('Connecting...')
    expect(mockWebSocketInstance).not.toBeNull()

    mockWebSocketInstance?._open()

    expect(result.current.connectionStatus).toBe('Connected')
  })

  it('should send GET_STATE message upon successful connection', () => {
    renderHook(() => useWebSocket(), { wrapper })
    expect(mockWebSocketInstance).not.toBeNull()

    mockWebSocketInstance?._open()

    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'GET_STATE' }))
  })

  it('should set status to "Disconnected" and attempt to reconnect on close', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper })

    mockWebSocketInstance?._open()
    expect(result.current.connectionStatus).toBe('Connected')

    mockWebSocketInstance?._close(1006, 'Abnormal closure')
    expect(result.current.connectionStatus).toBe('Disconnected')

    act(() => {
      jest.advanceTimersByTime(1500) // Advance past the initial backoff delay + jitter
    })

    expect(result.current.connectionStatus).toBe('Reconnecting...')
    expect(mockWebSocketInstance).not.toBeNull()
    expect(mockClose).not.toHaveBeenCalled() // The old instance should be gone, not closed by our code
  })

  it('should disconnect when the browser goes offline', () => {
    const { result, rerender } = renderHook(() => useWebSocket(), { wrapper })

    mockWebSocketInstance?._open()
    expect(result.current.connectionStatus).toBe('Connected')

    mockUseConnectivity.mockReturnValue({ isOnline: false })
    act(() => {
      rerender({})
    })

    // The useEffect cleanup logic should call disconnect(), which calls ws.close()
    expect(mockClose).toHaveBeenCalled()
    expect(result.current.connectionStatus).toBe('Disconnected')
  })
})

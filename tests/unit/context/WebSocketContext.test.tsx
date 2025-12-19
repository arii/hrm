/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext'
import { ReactNode } from 'react'

// Mock the useConnectivity hook
const mockUseConnectivity = jest.fn()
jest.mock('@/context/ConnectivityContext', () => ({
  useConnectivity: () => mockUseConnectivity(),
}))

// Mock WebSocket
const mockSend = jest.fn()
const mockClose = jest.fn()
let mockWebSocketInstance: MockWebSocket | null = null

class MockWebSocket {
  url: string
  onopen: () => void = () => {}
  onclose: (event: { code: number; reason: string }) => void = () => {}

  constructor(url: string) {
    if (url.includes('invalid-url')) {
      throw new Error('Invalid URL')
    }
    this.url = url
    mockWebSocketInstance = this
  }

  _open() {
    this.onopen()
  }

  _close(code = 1000, reason = 'Test close') {
    this.onclose({ code, reason })
  }

  send(data: any) {
    mockSend(data)
  }

  close() {
    mockClose()
    this._close()
  }
}

global.WebSocket = MockWebSocket as any

describe('WebSocketProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockWebSocketInstance = null
    mockUseConnectivity.mockReturnValue({ isOnline: true })
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  )
  const wrapperWithInvalidUrl = ({ children }: { children: ReactNode }) => (
    <WebSocketProvider serverUrl="invalid-url">{children}</WebSocketProvider>
  )

  it('should not connect if offline', () => {
    mockUseConnectivity.mockReturnValue({ isOnline: false })
    renderHook(() => useWebSocket(), { wrapper })
    expect(mockWebSocketInstance).toBeNull()
  })

  it('should connect when online and update status to "Connected"', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper })

    act(() => {
        mockWebSocketInstance?._open()
    })

    expect(result.current.connectionStatus).toBe('Connected')
  });

  it('should send GET_STATE on connect', () => {
    renderHook(() => useWebSocket(), { wrapper })

    act(() => {
        mockWebSocketInstance?._open()
    })

    expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'GET_STATE' }))
  })

  it('should attempt to reconnect on close', () => {
    const { result } = renderHook(() => useWebSocket(), { wrapper })
    act(() => {
        mockWebSocketInstance?._open()
    })
    expect(result.current.connectionStatus).toBe('Connected')

    act(() => {
      mockWebSocketInstance?._close(1006, 'Abnormal closure')
    })
    expect(result.current.connectionStatus).toBe('Disconnected')

    act(() => jest.advanceTimersByTime(1500))
    expect(result.current.connectionStatus).toBe('Reconnecting...')
  })

  it('should disconnect when offline', () => {
    const { result, rerender } = renderHook(() => useWebSocket(), { wrapper })
    act(() => {
        mockWebSocketInstance?._open()
    })
    expect(result.current.connectionStatus).toBe('Connected')

    mockUseConnectivity.mockReturnValue({ isOnline: false })
    act(() => rerender({}))

    expect(mockClose).toHaveBeenCalled()
    expect(result.current.connectionStatus).toBe('Disconnected')
  })

  it('should set status to "Failed to connect" on connection error', () => {
    const { result } = renderHook(() => useWebSocket(), {
      wrapper: wrapperWithInvalidUrl,
    })

    expect(result.current.connectionStatus).toContain('Failed to connect')
  })
})

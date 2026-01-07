/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  WebSocketProvider,
  useWebSocket,
} from '../../../context/WebSocketContext'

// Define a minimal WebSocket mock that satisfies the WebSocket interface
class MockWebSocketImplementation implements WebSocket {
  CONNECTING = 0
  OPEN = 1
  CLOSING = 2
  CLOSED = 3

  binaryType: BinaryType = 'blob'
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  readyState = WebSocket.OPEN
  url = 'ws://mockserver'

  onopen: ((this: WebSocket, ev: Event) => any) | null = null
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null
  onerror: ((this: WebSocket, ev: Event) => any) | null = null
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null

  close = jest.fn()
  send = jest.fn()

  addEventListener = jest.fn()
  removeEventListener = jest.fn()
  dispatchEvent = jest.fn()

  triggerOpen = () => {
    if (this.onopen) {
      this.onopen(new Event('open'))
    }
  }
}

// Mock the WebSocket object globally
let mockWebSocketInstance: MockWebSocketImplementation
global.WebSocket = jest.fn(() => {
  mockWebSocketInstance = new MockWebSocketImplementation()
  return mockWebSocketInstance
})

describe('WebSocketProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(global.WebSocket as jest.Mock).mockClear()
  })

  it('should create and store a sessionId in localStorage', () => {
    renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    expect(localStorage.getItem('hrm_session_id')).not.toBeNull()
  })

  it('should send a RECOVER_SESSION message on connection', async () => {
    const { result } = renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    // Manually trigger the connection and the open event
    act(() => {
      result.current.connect()
      mockWebSocketInstance.triggerOpen()
    })

    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"RECOVER_SESSION"')
      )
      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"GET_STATE"')
      )
    })
  })
})

/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onopen: ((this: WebSocket, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: ((this: WebSocket, ev: Event) => any) | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
let mockWebSocketInstances: MockWebSocketImplementation[] = []
global.WebSocket = jest.fn(() => {
  const instance = new MockWebSocketImplementation()
  mockWebSocketInstances.push(instance)
  return instance
})

describe('WebSocketProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    ;(global.WebSocket as jest.Mock).mockClear()
    mockWebSocketInstances = [] // Clear instances for each test
  })

  it('should create and store a sessionId in localStorage', () => {
    renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    expect(localStorage.getItem('hrm_session_id')).not.toBeNull()
  })

  it('should send a RECOVER_SESSION message on connection', async () => {
    // Render the hook, which will cause WebSocketProvider to mount and try to connect
    renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    // Expect exactly one WebSocket instance to have been created
    expect(mockWebSocketInstances.length).toBe(1)
    const wsInstance = mockWebSocketInstances[0]
    wsInstance.triggerOpen()

    await waitFor(() => {
      expect(wsInstance.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"RECOVER_SESSION"')
      )
      expect(wsInstance.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"GET_STATE"')
      )
    })
  })
})

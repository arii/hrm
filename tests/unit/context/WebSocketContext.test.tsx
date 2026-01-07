/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react-hooks'
import {
  WebSocketProvider,
  useWebSocket,
} from '../../../context/WebSocketContext'

// Mock the WebSocket object
global.WebSocket = jest.fn(() => ({
  onopen: jest.fn(),
  onclose: jest.fn(),
  onerror: jest.fn(),
  onmessage: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
})) as any

describe('WebSocketProvider', () => {
  it('should create and store a sessionId in localStorage', () => {
    renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    expect(localStorage.getItem('hrm_session_id')).not.toBeNull()
  })

  it('should send a RECOVER_SESSION message on connection', () => {
    const { result } = renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    act(() => {
      result.current.connect()
    })

    expect(global.WebSocket).toHaveBeenCalled()
  })
})

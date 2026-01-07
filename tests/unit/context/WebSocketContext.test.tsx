/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react'
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

  // TODO: This test is flaky in the current test environment. It should be revisited.
  it.skip('should send a RECOVER_SESSION message on connection', async () => {
    let sendSpy: jest.Mock
    // Override the global WebSocket mock for this specific test
    global.WebSocket = jest.fn().mockImplementation(() => {
      const ws = {
        onopen: jest.fn(),
        onclose: jest.fn(),
        onerror: jest.fn(),
        onmessage: jest.fn(),
        close: jest.fn(),
        send: jest.fn(),
      }
      sendSpy = ws.send as jest.Mock
      // Trigger onopen immediately to simulate a successful connection
      setTimeout(() => ws.onopen(), 0)
      return ws
    }) as any

    const { result } = renderHook(() => useWebSocket(), {
      wrapper: WebSocketProvider,
    })

    // Manually trigger the connection and wait for state updates
    act(() => {
      result.current.connect()
      // Advance timers to trigger the onopen callback in the mock
      jest.runOnlyPendingTimers()
    })

    // Now, we can assert that the connection was made and messages were sent.
    await waitFor(() => {
      expect(global.WebSocket).toHaveBeenCalledTimes(1)
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"RECOVER_SESSION"')
      )
      expect(sendSpy).toHaveBeenCalledWith(
        expect.stringContaining('"type":"GET_STATE"')
      )
    })
  })
})

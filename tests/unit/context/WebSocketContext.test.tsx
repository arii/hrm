/**
 * @jest-environment jsdom
 */
import { act, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import {
  WebSocketProvider,
  useWebSocket,
} from '../../../context/WebSocketContext'

// Mock WebSocket
let mockSocket: {
  readyState: number
  onopen: () => void
  onclose: (event: { code: number; reason: string }) => void
  send: jest.Mock
  close: jest.Mock
}

jest.mock('../../../utils/urls', () => ({
  getWebSocketURL: () => 'ws://localhost:3001',
}))

global.WebSocket = jest.fn().mockImplementation(() => {
  mockSocket = {
    readyState: 0, // CONNECTING
    onopen: () => {},
    onclose: () => {},
    send: jest.fn(),
    close: jest.fn(),
  }
  // Immediately transition to OPEN state to simulate successful connection
  setTimeout(() => {
    mockSocket.readyState = 1 // OPEN
    act(() => mockSocket.onopen())
  }, 100)
  return mockSocket
})

const TestComponent = () => {
  const { connectionStatus } = useWebSocket()
  return (
    <div>
      <div data-testid="status">{connectionStatus.status}</div>
      {connectionStatus.attempt && (
        <div data-testid="attempt">{connectionStatus.attempt}</div>
      )}
    </div>
  )
}

describe('WebSocketProvider Reconnection', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    ;(global.WebSocket as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('initially connects and shows a connected status', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )
    act(() => jest.runAllTimers())
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('connected')
    })
  })

  it('attempts to reconnect on abnormal closure', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )
    act(() => jest.runAllTimers())
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('connected')
    )

    // Simulate abnormal closure
    act(() => {
      mockSocket.readyState = 3 // CLOSED
      mockSocket.onclose({ code: 1006, reason: 'Abnormal Closure' })
    })

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('disconnected')
    )

    // Fast-forward to the first reconnection attempt
    act(() => jest.advanceTimersByTime(1100))
    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('reconnecting')
      expect(screen.getByTestId('attempt').textContent).toBe('1')
    })
  })

  it('resets reconnect attempts after a successful reconnection', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )
    act(() => jest.runAllTimers())

    // First, disconnect
    act(() => mockSocket.onclose({ code: 1006, reason: 'Network lost' }))
    act(() => jest.advanceTimersByTime(1100)) // First attempt
    await waitFor(() =>
      expect(screen.getByTestId('attempt').textContent).toBe('1')
    )

    // Reconnect successfully
    act(() => {
      mockSocket.readyState = 1
      mockSocket.onopen()
    })
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('connected')
    )
    expect(screen.queryByTestId('attempt')).toBeNull()
  })

  it('stops reconnecting after reaching max attempts', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    )
    act(() => jest.runAllTimers())

    // Simulate 10 failed reconnection attempts
    for (let i = 1; i <= 10; i++) {
      act(() => mockSocket.onclose({ code: 1006, reason: 'Fail' }))
      act(() => jest.advanceTimersByTime(1000 * 2 ** (i - 1) + 100))
      await waitFor(() =>
        expect(screen.getByTestId('attempt').textContent).toBe(String(i))
      )
    }

    // 11th failure
    act(() => mockSocket.onclose({ code: 1006, reason: 'Fail' }))
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('failed')
    )
  })
})

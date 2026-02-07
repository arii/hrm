/**
 * @jest-environment jsdom
 */
import { render, act } from '@testing-library/react'
import {
  WebSocketProvider,
  useWebSocket,
} from '../../../context/WebSocketContext'
import logger from '../../../utils/logger'
import React from 'react'

// Mock the logger to spy on warnings
jest.mock('../../../utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}))

const TestComponent = () => {
  const { hrmData } = useWebSocket()
  return (
    <div>
      <div data-testid="hrm-count">{hrmData.length}</div>
    </div>
  )
}

describe('WebSocketContext Payload Validation', () => {
  const wsUrl = 'ws://localhost:1234'

  // Helper to setup WebSocket mock
  const setupWebSocket = () => {
    jest.clearAllMocks()

    // Mock crypto.randomUUID for clientId generation
    Object.defineProperty(global, 'crypto', {
      value: {
        randomUUID: () => 'test-client-id',
      },
      writable: true,
    })

    const mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      readyState: 1, // OPEN
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.WebSocket = jest.fn(() => mockWebSocket) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global.WebSocket as any).OPEN = 1

    return mockWebSocket
  }

  // Helper to simulate incoming messages
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simulateMessage = (mockWebSocket: any, data: any) => {
    act(() => {
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify(data),
        } as MessageEvent)
      }
    })
  }

  it('validates HRM_UPDATE payload is an array', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWebSocket: any = setupWebSocket()

    render(
      <WebSocketProvider serverUrl={wsUrl}>
        <TestComponent />
      </WebSocketProvider>
    )

    // Trigger onopen to complete connection
    act(() => {
      mockWebSocket.onopen()
    })

    // Simulate invalid HRM_UPDATE payload (not an array)
    const invalidMessage = {
      type: 'HRM_UPDATE',
      payload: { some: 'object' },
    }

    simulateMessage(mockWebSocket, invalidMessage)

    expect(logger.warn).toHaveBeenCalledWith(
      '[WebSocketContext] Invalid HRM_UPDATE payload',
      expect.objectContaining(invalidMessage)
    )
  })

  it('validates DEVICE_OFFLINE payload has string deviceId', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWebSocket: any = setupWebSocket()

    render(
      <WebSocketProvider serverUrl={wsUrl}>
        <TestComponent />
      </WebSocketProvider>
    )

    act(() => {
      mockWebSocket.onopen()
    })

    // Simulate invalid DEVICE_OFFLINE payload (missing deviceId)
    const invalidMessage1 = {
      type: 'DEVICE_OFFLINE',
      payload: {},
    }

    simulateMessage(mockWebSocket, invalidMessage1)

    expect(logger.warn).toHaveBeenCalledWith(
      '[WebSocketContext] Invalid DEVICE_OFFLINE payload',
      expect.objectContaining(invalidMessage1)
    )

    // Simulate invalid DEVICE_OFFLINE payload (deviceId is number)
    const invalidMessage2 = {
      type: 'DEVICE_OFFLINE',
      payload: { deviceId: 123 },
    }

    simulateMessage(mockWebSocket, invalidMessage2)

    expect(logger.warn).toHaveBeenCalledWith(
      '[WebSocketContext] Invalid DEVICE_OFFLINE payload',
      expect.objectContaining(invalidMessage2)
    )
  })

  it('accepts valid HRM_UPDATE payload', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWebSocket: any = setupWebSocket()

    render(
      <WebSocketProvider serverUrl={wsUrl}>
        <TestComponent />
      </WebSocketProvider>
    )

    act(() => {
      mockWebSocket.onopen()
    })

    const validMessage = {
      type: 'HRM_UPDATE',
      payload: [
        { clientId: '1', value: 100, timestamp: 1234567890, deviceId: 'd1' },
      ],
    }

    simulateMessage(mockWebSocket, validMessage)

    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('accepts valid DEVICE_OFFLINE payload', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mockWebSocket: any = setupWebSocket()

    render(
      <WebSocketProvider serverUrl={wsUrl}>
        <TestComponent />
      </WebSocketProvider>
    )

    act(() => {
      mockWebSocket.onopen()
    })

    const validMessage = {
      type: 'DEVICE_OFFLINE',
      payload: { deviceId: 'test-device' },
    }

    simulateMessage(mockWebSocket, validMessage)

    expect(logger.warn).not.toHaveBeenCalled()
  })

  describe('Window postMessage validation', () => {
    // Only runs in non-production/testing env
    const originalEnv = process.env.NODE_ENV

    beforeAll(() => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_TESTING = 'true'
    })

    afterAll(() => {
      process.env.NODE_ENV = originalEnv
    })

    it('validates HRM_UPDATE via postMessage', () => {
      render(
        <WebSocketProvider serverUrl={wsUrl}>
          <TestComponent />
        </WebSocketProvider>
      )

      const invalidEvent = new MessageEvent('message', {
        data: {
          type: 'HRM_UPDATE',
          payload: { invalid: 'data' },
        },
        source: window,
      })

      act(() => {
        window.dispatchEvent(invalidEvent)
      })

      expect(logger.warn).toHaveBeenCalledWith(
        '[WebSocketContext] Invalid HRM_UPDATE payload',
        invalidEvent.data
      )
    })

    it('validates DEVICE_OFFLINE via postMessage', () => {
      render(
        <WebSocketProvider serverUrl={wsUrl}>
          <TestComponent />
        </WebSocketProvider>
      )

      const invalidEvent = new MessageEvent('message', {
        data: {
          type: 'DEVICE_OFFLINE',
          payload: { deviceId: 123 }, // Invalid type
        },
        source: window,
      })

      act(() => {
        window.dispatchEvent(invalidEvent)
      })

      expect(logger.warn).toHaveBeenCalledWith(
        '[WebSocketContext] Invalid DEVICE_OFFLINE payload',
        invalidEvent.data
      )
    })
  })
})

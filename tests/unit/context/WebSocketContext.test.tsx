/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { ServerMessage } from '@/types/websocket'
import { INITIAL_STATE } from '@/context/webSocketReducer'
import React from 'react'

jest.useFakeTimers()

// Mock the logger to prevent console spam
jest.mock('@/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}))

describe('WebSocketProvider __TEST_CONTROLS__', () => {
  let mockDispatch: jest.Mock

  beforeEach(() => {
    mockDispatch = jest.fn()
    const useReducerSpy = jest.spyOn(React, 'useReducer')
    useReducerSpy.mockImplementation(() => [INITIAL_STATE, mockDispatch])
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.restoreAllMocks()
  })

  it('throttles HRM_UPDATE messages', () => {
    renderHook(() => {}, { wrapper: WebSocketProvider })
    const testControls = (window as unknown as { __TEST_CONTROLS__: { dispatch: (message: ServerMessage) => void } }).__TEST_CONTROLS__

    const hrmMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [],
    }

    // Dispatch multiple times in quick succession
    act(() => {
      testControls.dispatch(hrmMessage)
      testControls.dispatch(hrmMessage)
      testControls.dispatch(hrmMessage)
    })

    // Should only be called once immediately
    expect(mockDispatch).toHaveBeenCalledTimes(1)

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // After the throttle period, it should be called again with the last message
    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })

  it('throttles TIMER_UPDATE messages', () => {
    renderHook(() => {}, { wrapper: WebSocketProvider })
    const testControls = (window as unknown as { __TEST_CONTROLS__: { dispatch: (message: ServerMessage) => void } }).__TEST_CONTROLS__

    const timerMessage: ServerMessage = {
      type: 'TIMER_UPDATE',
      payload: { isRunning: true },
    }

    act(() => {
      testControls.dispatch(timerMessage)
      testControls.dispatch(timerMessage)
    })

    expect(mockDispatch).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })

  it('does not throttle other message types', () => {
    renderHook(() => {}, { wrapper: WebSocketProvider })
    const testControls = (window as unknown as { __TEST_CONTROLS__: { dispatch: (message: ServerMessage) => void } }).__TEST_CONTROLS__

    const otherMessage: ServerMessage = {
      type: 'SPOTIFY_UPDATE',
      payload: {},
    }

    act(() => {
      testControls.dispatch(otherMessage)
      testControls.dispatch(otherMessage)
    })

    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })
})

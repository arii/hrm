'use client'
import { useEffect } from 'react'
import type { Dispatch } from 'react'
import type { ServerMessage } from '../../types/websocket'

export type WebSocketDispatch = Dispatch<
  ServerMessage | { type: 'RESET_STATE' }
>

// This encapsulates the logic to avoid running it on every render inside the component
export const isTestEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false
  return (
    process.env.NODE_ENV !== 'production' ||
    process.env.NEXT_PUBLIC_TESTING === 'true' ||
    window.location.search.includes('testing=true')
  )
}

// Playwright reads connection state off the body dataset instead of
// probing the socket; safe to call from any environment.
export const markConnectionStatus = (
  status: 'connected' | 'disconnected'
): void => {
  if (isTestEnvironment()) {
    document.body.dataset.connectionStatus = status
  }
}

// Registers the reducer dispatch under window.__TEST_CONTROLS__ so tests
// can drive state transitions directly. Must run before the connection
// lifecycle hook mounts, so the real connect/disconnect callbacks can be
// attached to the already-created controls object.
export const useTestControlsDispatch = (dispatch: WebSocketDispatch): void => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (isTestEnvironment()) {
        window.__TEST_CONTROLS__ = {
          ...window.__TEST_CONTROLS__,
          dispatch,
          disconnect: () => {},
          connect: () => {},
        }
      }
    }
    return () => {
      if (typeof window !== 'undefined' && window.__TEST_CONTROLS__) {
        if (window.__TEST_CONTROLS__.dispatch === dispatch) {
          delete window.__TEST_CONTROLS__.dispatch
        }
      }
    }
  }, [dispatch])
}

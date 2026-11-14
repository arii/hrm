'use client'
import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useState,
  useReducer,
  useMemo,
} from 'react'
import throttle from 'lodash.throttle'
import logger from '@/utils/logger'
import { resolveClientId } from '@/utils/clientId'
import {
  ActiveAlert,
  ClientCommandMessage,
  ServerMessage,
  SpotifyData,
  TimerData,
} from '../types/websocket'
import { getWebSocketURL } from '../utils/urls'

import { INITIAL_STATE, reducer } from './webSocketReducer'
import { ConnectedHrmData as HrmData } from '../types/websocket'
import { useWebSocketLifecycle } from './ws/connectionLifecycle'
import { useTestControlsDispatch } from './ws/testHooks'

export type { HrmData }

export interface WebSocketConnectionValue {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

// One context per message type so a timer tick never re-renders Spotify
// or HRM subscribers (and vice versa). The reducer stays single — only
// the fan-out is split — so state transitions are byte-identical. Slice
// values are referentially stable for untouched slices because the
// reducer spreads state.
// Exported for the Storybook mock provider (same pattern as the old
// single WebSocketContext); app code uses the hooks above.
export const HrmDataContext = createContext<HrmData[] | null>(null)
export const TimerDataContext = createContext<TimerData | null>(null)
export const SpotifyDataContext = createContext<SpotifyData | null>(null)
export const ActiveAlertsContext = createContext<ActiveAlert[] | null>(null)
export const SpotifyInitContext = createContext<boolean | null>(null)
export const ConnectionContext = createContext<WebSocketConnectionValue | null>(
  null
)

const useSliceContext = <T,>(context: Context<T | null>, name: string): T => {
  const value = useContext(context)
  if (value === null) {
    throw new Error(`${name} must be used within a WebSocketProvider`)
  }
  return value
}

export const useHrmData = (): HrmData[] =>
  useSliceContext(HrmDataContext, 'useHrmData')
export const useTimerData = (): TimerData =>
  useSliceContext(TimerDataContext, 'useTimerData')
export const useSpotifyData = (): SpotifyData =>
  useSliceContext(SpotifyDataContext, 'useSpotifyData')
export const useActiveAlerts = (): ActiveAlert[] =>
  useSliceContext(ActiveAlertsContext, 'useActiveAlerts')
export const useSpotifyServiceInitialized = (): boolean =>
  useSliceContext(SpotifyInitContext, 'useSpotifyServiceInitialized')
export const useWebSocketConnection = (): WebSocketConnectionValue =>
  useSliceContext(ConnectionContext, 'useWebSocketConnection')

export const WebSocketProvider = ({
  children,
  serverUrl,
  clientId: explicitClientId,
}: {
  children: ReactNode
  serverUrl?: string
  clientId?: string
}) => {
  const [clientId] = useState(() => {
    if (explicitClientId) {
      return explicitClientId
    }
    if (typeof window === 'undefined') {
      return null
    }
    try {
      const queryClientId = new URLSearchParams(window.location.search).get(
        'clientId'
      )
      if (queryClientId) {
        return queryClientId
      }
    } catch (error) {
      logger.error('Failed to read clientId query override', error)
    }
    // Reading window.localStorage itself can throw when storage is
    // blocked, so resolve each store defensively: resolveClientId only
    // guards getItem/setItem calls, not acquisition of the store.
    const safeStore = (
      get: () => Pick<Storage, 'getItem' | 'setItem'>,
      kind: string
    ): Pick<Storage, 'getItem' | 'setItem'> => {
      try {
        return get()
      } catch (error) {
        logger.error(`Failed to access ${kind}Storage`, error)
        return { getItem: () => null, setItem: () => {} }
      }
    }
    return resolveClientId(
      {
        local: safeStore(() => window.localStorage, 'local'),
        session: safeStore(() => window.sessionStorage, 'session'),
      },
      window.location.pathname
    )
  })

  // Memoize the WebSocket URL to prevent re-computation on every render
  const wsUrl = useMemo(() => {
    const url = serverUrl || getWebSocketURL()
    if (!clientId) return null // Return null if clientId isn't generated yet

    try {
      const urlObject = new URL(url)
      urlObject.searchParams.set('clientId', clientId)
      return urlObject.toString()
    } catch (_error) {
      logger.error('Invalid WebSocket URL', { url, error: _error })
      return url // Fallback to the original URL on error
    }
  }, [serverUrl, clientId])

  const [appState, dispatch] = useReducer(reducer, INITIAL_STATE)

  // useMemo (not a ref) so the throttled dispatcher is created once
  // without reading a ref during render; dispatch from useReducer is
  // stable, so the throttle instance never recreates.
  const throttledDispatch = useMemo(
    () =>
      throttle((message: ServerMessage) => {
        dispatch(message)
      }, 100),
    [dispatch]
  )

  // Registers the reducer dispatch under window.__TEST_CONTROLS__ before
  // the lifecycle hook attaches the real connect/disconnect callbacks.
  useTestControlsDispatch(dispatch)

  const { connectionStatus, sendData, connect, disconnect } =
    useWebSocketLifecycle({ wsUrl, dispatch, throttledDispatch })

  // Stable across data dispatches: the callbacks are useCallbacks and
  // only connectionStatus re-keys it.
  const connectionValue = useMemo(
    () => ({ connectionStatus, sendData, connect, disconnect }),
    [connectionStatus, sendData, connect, disconnect]
  )

  return (
    <ConnectionContext.Provider value={connectionValue}>
      <HrmDataContext.Provider value={appState.hrmData}>
        <TimerDataContext.Provider value={appState.timerData}>
          <SpotifyDataContext.Provider value={appState.spotifyData}>
            <ActiveAlertsContext.Provider value={appState.activeAlerts}>
              <SpotifyInitContext.Provider
                value={appState.spotifyServiceInitialized ?? false}
              >
                {children}
              </SpotifyInitContext.Provider>
            </ActiveAlertsContext.Provider>
          </SpotifyDataContext.Provider>
        </TimerDataContext.Provider>
      </HrmDataContext.Provider>
    </ConnectionContext.Provider>
  )
}

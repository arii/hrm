import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage } from './websocket'
import TabataTimer from '../services/tabataTimer'

// Define a comprehensive interface for the global test controls
// This allows various parts of the application to attach test-specific
// functions to the window object in a type-safe manner.
export interface TestControls {
  // From useBluetoothHRM hook
  setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>
  setSignalStatus?: Dispatch<SetStateAction<{ last: number; slow: number }>>

  // From WebSocketProvider context
  dispatch?: (message: ServerMessage) => void
  disconnect?: () => void
  connect?: () => void
}

declare global {
  var spotifyService: SpotifyService | undefined
  var tabataService: TabataTimer | undefined
  var isSpotifyInitialized: boolean | undefined

  interface Window {
    /** Flag used by Playwright to ensure the application is fully hydrated and ready for interaction. */
    __TEST_READY__?: boolean
    /** Flag used by Playwright to verify that the WebSocket connection is active. */
    __TEST_WEBSOCKET_READY__?: boolean

    /**
     * Centralized object for manual state manipulation during E2E/Visual tests.
     * This allows various parts of the application to attach test-specific
     * functions to the window object in a type-safe manner.
     */
    __TEST_CONTROLS__?: {
      /** WebSocket-specific test controls used to simulate incoming server messages. */
      dispatch?: (message: ServerMessage) => void
      /** Manually disconnect the WebSocket connection. */
      disconnect?: () => void
      /** Manually trigger a WebSocket reconnection. */
      connect?: () => void
      /** Force the Bluetooth HRM status to a specific state (e.g., CONNECTED, ERROR). */
      setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
      /** Set a custom message to be displayed in the HRM status UI. */
      setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>
    }
  }
}

export {}

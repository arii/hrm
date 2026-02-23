import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage } from './websocket'
import TabataTimer from '../services/tabataTimer'

declare global {
  var spotifyService: SpotifyService | undefined
  var tabataService: TabataTimer | undefined
  var isSpotifyInitialized: boolean | undefined

  interface Window {
    /** Flag used by Playwright to ensure the application is fully hydrated and ready for interaction. */
    __TEST_READY__?: boolean
<<<<<<< HEAD
=======
    /** Flag used by Playwright to verify that the WebSocket connection is active. */
    __TEST_WEBSOCKET_READY__?: boolean
<<<<<<< HEAD
    /** Centralized object for manual state manipulation during E2E/Visual tests. */
>>>>>>> c705c04a (chore: optimize VRT cleanup and standardize on fixtures)
    TEST_CONTROLS?: TestControls
    /** WebSocket-specific test controls used by Playwright. @deprecated Use TEST_CONTROLS instead. */
=======

    /**
     * Centralized object for manual state manipulation during E2E/Visual tests.
     * This allows various parts of the application to attach test-specific
     * functions to the window object in a type-safe manner.
     */
>>>>>>> 2d78ed1f (test(vrt): unify and automate test control cleanup)
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

    /** @deprecated Use __TEST_CONTROLS__ instead. */
    TEST_CONTROLS?: Window['__TEST_CONTROLS__']
  }
}

export {}

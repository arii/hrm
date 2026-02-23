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
<<<<<<< HEAD
=======
    /** Flag used by Playwright to verify that the WebSocket connection is active. */
    __TEST_WEBSOCKET_READY__?: boolean
    /** Centralized object for manual state manipulation during E2E/Visual tests. */
>>>>>>> c705c04a (chore: optimize VRT cleanup and standardize on fixtures)
    TEST_CONTROLS?: TestControls
    /** WebSocket-specific test controls used by Playwright. @deprecated Use TEST_CONTROLS instead. */
    __TEST_CONTROLS__?: {
      dispatch: (message: ServerMessage) => void
      disconnect: () => void
      connect: () => void
    }
  }
}

export {}

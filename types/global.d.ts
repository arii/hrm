import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage, SpotifyData } from './websocket'
import TabataTimer from '../services/tabataTimer'

// Define a comprehensive interface for the global test controls
// This allows various parts of the application to attach test-specific
// functions to the window object in a type-safe manner.
export interface TestControls {
  // From useBluetoothHRM hook
  setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>

  // From WebSocketProvider context
  dispatch?: (message: ServerMessage | { type: 'RESET_STATE' }) => void
  disconnect?: () => void
  connect?: () => void

  // From Spotify components
  setSpotifyServiceInitialized?: (initialized: boolean) => void
  injectSpotifyData?: (data: SpotifyData) => void
}

declare global {
  var spotifyService: SpotifyService | undefined
  var tabataService: TabataTimer | undefined
  var isSpotifyInitialized: boolean | undefined

  interface Window {
    __TEST_READY__?: boolean
    __TEST_CONTROLS__?: TestControls
  }
}

export {}

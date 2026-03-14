import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage } from './websocket'
import TabataTimer from '../services/tabataTimer'

// Define a comprehensive interface for the global test controls
// This allows various parts of the application to attach test-specific
// functions to the window object in a type-safe manner.
export interface TestControls {
  // From useLoading hook
  setIsLoading?: (isLoading: boolean) => void

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
    __TEST_READY__?: boolean
    __TEST_CONTROLS__?: TestControls
  }
}

export {}

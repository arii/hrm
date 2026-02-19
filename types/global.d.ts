import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from '@/types/interfaces'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

// Define a comprehensive interface for the global test controls
// This allows various parts of the application to attach test-specific
// functions to the window object in a type-safe manner.
export interface TestControls {
  // From useBluetoothHRM hook
  setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>

  // From WebSocketProvider context
  dispatch?: (message: unknown) => void
  disconnect?: () => void
  connect?: () => void
}

declare global {
  var spotifyService: SpotifyService | undefined

  interface Window {
    __TEST_READY__?: boolean
    __TEST_WEBSOCKET_READY__?: boolean
    __TEST_CONTROLS__?: TestControls
  }
}

export {}

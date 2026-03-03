import { Dispatch, SetStateAction } from 'react'
import { SpotifyService } from './interfaces'
import { BluetoothConnectionStatus } from './bluetooth'
import { ServerMessage } from './websocket'
import TabataTimer from '../services/tabataTimer'

declare global {
  interface TestControls {
    setHrmStatus?: Dispatch<SetStateAction<BluetoothConnectionStatus>>
    setCustomHrmStatusMessage?: Dispatch<SetStateAction<string | null>>
    dispatch?: (message: ServerMessage | { type: 'RESET_STATE' }) => void
    disconnect?: () => void
    connect?: () => void
  }

  var spotifyService: SpotifyService | undefined
  var tabataService: TabataTimer | undefined
  var isSpotifyInitialized: boolean | undefined

  interface Window {
    __TEST_READY__?: boolean
    __TEST_CONTROLS__?: TestControls
  }
}

export {}

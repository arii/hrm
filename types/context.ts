import { HrmStreamData } from './core'

// Client-side extension of HrmStreamData to include connection status
export interface ClientHrmData extends HrmStreamData {
  isConnected: boolean
}

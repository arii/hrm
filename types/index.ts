import { HrmData } from '@/types/websocket'

export interface EnhancedHrmDataForTile extends HrmData {
  isAlerting: boolean
  alertMessage?: string
  isActive?: boolean
}

// NOTE: We are intentionally not using the UserSettings from the context here,
// as the context itself handles persistence. This type is for component props
// where only the settings values are needed.
export type UserSettings = {
  userName: string | null
  userAge: number | null
  userWeight: number | null
  gender: 'MALE' | 'FEMALE' | null
  restingHr: number | null
  maxHr: number | null
  deviceId: string | null
}

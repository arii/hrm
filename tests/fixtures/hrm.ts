import { HrmData } from '@/types/websocket'

export const mockHrmData: HrmData[] = [
  {
    clientId: '1',
    name: 'Test User',
    value: 120,
    maxHr: 190,
    calories: 100,
    timestamp: Date.now(),
  },
  {
    clientId: '2',
    name: 'Another User',
    value: 130,
    maxHr: 185,
    calories: 110,
    timestamp: Date.now(),
  },
]

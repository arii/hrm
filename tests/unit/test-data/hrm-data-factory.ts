import { HrmData } from '@/types/websocket'
import { v4 as uuidv4 } from 'uuid'

export const createHrmData = (overrides: Partial<HrmData> = {}): HrmData => ({
  clientId: uuidv4(),
  value: 120,
  maxHr: 190,
  name: 'Test User',
  age: 30,
  calories: 100,
  totalCalories: 200,
  ...overrides,
})

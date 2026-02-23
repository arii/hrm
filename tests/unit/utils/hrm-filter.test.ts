import { filterHrmData } from '@/utils/hrm'
import { HrmData } from '@/types/websocket'
import { HRM_STALE_THRESHOLD_MS } from '@/utils/constants'

describe('filterHrmData (Server Side Logic)', () => {
  const now = 1000000
  const validUser: HrmData = {
    clientId: 'valid',
    name: 'Real User',
    value: 120,
    calories: 100,
    updatedAt: now,
    maxHr: 180,
  }

  it('includes valid users', () => {
    const data = [validUser]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('valid')
  })

  it('filters out users with generic names', () => {
    const data: HrmData[] = [
      validUser,
      { ...validUser, clientId: 'generic1', name: 'User 123' },
      { ...validUser, clientId: 'generic2', name: 'New User' },
      { ...validUser, clientId: 'generic3', name: 'Unknown' },
      { ...validUser, clientId: 'generic4', name: 'Bluetooth HRM' },
    ]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('valid')
  })

  it('filters out users with null or missing names', () => {
    const data: HrmData[] = [
      validUser,
      { ...validUser, clientId: 'null-name', name: undefined },
    ]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('valid')
  })

  it('filters out stale users', () => {
    const data: HrmData[] = [
      validUser,
      {
        ...validUser,
        clientId: 'stale',
        updatedAt: now - HRM_STALE_THRESHOLD_MS - 1,
      },
    ]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('valid')
  })

  it('filters out zero values by default', () => {
    const data: HrmData[] = [
      validUser,
      { ...validUser, clientId: 'zero', value: 0 },
    ]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('valid')
  })

  it('includes zero values if includeZeroValues is true', () => {
    const data: HrmData[] = [
      validUser,
      { ...validUser, clientId: 'zero', value: 0 },
    ]
    const result = filterHrmData(data, now, { includeZeroValues: true })
    expect(result).toHaveLength(2)
  })

  it('uses receipt time if updatedAt is missing (for ConnectedHrmData fallback)', () => {
    const data = [
      {
        clientId: 'fallback',
        name: 'Fallback User',
        value: 120,
        calories: 100,
        lastUpdated: now, // Using lastUpdated instead of updatedAt
        maxHr: 180,
      } as any,
    ]
    const result = filterHrmData(data, now)
    expect(result).toHaveLength(1)
    expect(result[0].clientId).toBe('fallback')
  })
})

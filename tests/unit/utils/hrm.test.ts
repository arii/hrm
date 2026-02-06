import { getActiveHrmData } from '@/utils/hrm'
import { HrmData } from '@/context/webSocketReducer'
import { ActiveAlert } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'

describe('getActiveHrmData', () => {
  const now = 100000

  const createMockUser = (
    id: string,
    overrides: Partial<HrmData> = {}
  ): HrmData => ({
    clientId: id,
    name: 'Test User',
    value: 120,
    calories: 100,
    updatedAt: now,
    isConnected: true,
    lastUpdated: now,
    maxHr: 180,
    ...overrides,
  })

  const mockHrmData: HrmData[] = [
    createMockUser('c1', { name: 'User One' }),
    createMockUser('c2', {
      name: 'User Two',
      lastUpdated: now - HRM_STALE_THRESHOLD_MS - 1,
    }), // Stale
    createMockUser('c3', { name: 'User Three', value: 0 }), // Zero value
    createMockUser('c4', { name: 'New User 123' }), // Placeholder
    createMockUser('c5', {
      name: 'User Five',
      lastUpdated: now - HRM_WARNING_THRESHOLD_MS - 1,
    }), // Warning Stale
  ]

  const mockAlerts: ActiveAlert[] = [
    {
      clientId: 'c1',
      code: 'BAD_PLACEMENT',
      message: 'Fix it',
      severity: 'warning',
      timestamp: now,
    },
  ]

  it('filters stale users', () => {
    const result = getActiveHrmData(mockHrmData, [], now, {
      includeZeroValues: true,
    })
    expect(result.find((d) => d.clientId === 'c2')).toBeUndefined()
    expect(result.find((d) => d.clientId === 'c1')).toBeDefined()
  })

  it('filters placeholders', () => {
    const result = getActiveHrmData(mockHrmData, [], now, {
      includeZeroValues: true,
    })
    expect(result.find((d) => d.clientId === 'c4')).toBeUndefined()
  })

  it('filters zero values if requested', () => {
    const result = getActiveHrmData(mockHrmData, [], now, {
      includeZeroValues: false,
    })
    expect(result.find((d) => d.clientId === 'c3')).toBeUndefined()
  })

  it('includes zero values if requested', () => {
    const result = getActiveHrmData(mockHrmData, [], now, {
      includeZeroValues: true,
    })
    expect(result.find((d) => d.clientId === 'c3')).toBeDefined()
  })

  it('marks data as stale (warning)', () => {
    const result = getActiveHrmData(mockHrmData, [], now, {
      includeZeroValues: true,
    })
    const c5 = result.find((d) => d.clientId === 'c5')
    expect(c5?.isDataStale).toBe(true)
    const c1 = result.find((d) => d.clientId === 'c1')
    expect(c1?.isDataStale).toBe(false)
  })

  it('merges active alerts', () => {
    const result = getActiveHrmData(mockHrmData, mockAlerts, now, {
      includeZeroValues: true,
    })
    const c1 = result.find((d) => d.clientId === 'c1')
    expect(c1?.isAlerting).toBe(true)
    expect(c1?.alertMessage).toBe('Fix it')
  })

  it('preserves alert precedence (first match wins)', () => {
    const multiAlerts: ActiveAlert[] = [
      {
        clientId: 'c1',
        code: 'BAD_PLACEMENT',
        message: 'First Alert', // High Priority
        severity: 'error',
        timestamp: now,
      },
      {
        clientId: 'c1',
        code: 'HRM_STALE',
        message: 'Second Alert', // Low Priority
        severity: 'warning',
        timestamp: now,
      },
    ]
    const result = getActiveHrmData(mockHrmData, multiAlerts, now, {
      includeZeroValues: true,
    })
    const c1 = result.find((d) => d.clientId === 'c1')

    expect(c1?.isAlerting).toBe(true)
    expect(c1?.alertMessage).toBe('First Alert')
  })
})

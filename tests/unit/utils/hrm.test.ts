import { getActiveHrmData } from '@/utils/hrm'
import { ConnectedHrmData, ActiveAlert } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'

describe('getActiveHrmData', () => {
  const now = 100000
  const mockHrmData: ConnectedHrmData[] = [
    {
      clientId: 'c1',
      name: 'User One',
      value: 120,
      calories: 100,
      updatedAt: now,
      isConnected: true,
      lastUpdated: now,
      maxHr: 180,
    },
    {
      clientId: 'c2', // Stale
      name: 'User Two',
      value: 130,
      calories: 110,
      updatedAt: now - HRM_STALE_THRESHOLD_MS - 1,
      isConnected: true,
      lastUpdated: now - HRM_STALE_THRESHOLD_MS - 1,
      maxHr: 180,
    },
    {
      clientId: 'c3', // Zero value
      name: 'User Three',
      value: 0,
      calories: 0,
      updatedAt: now,
      isConnected: true,
      lastUpdated: now,
      maxHr: 180,
    },
    {
      clientId: 'c4', // Placeholder
      name: 'New User 123',
      value: 120,
      calories: 100,
      updatedAt: now,
      isConnected: true,
      lastUpdated: now,
      maxHr: 180,
    },
    {
      clientId: 'c5', // Warning Stale
      name: 'User Five',
      value: 120,
      calories: 100,
      updatedAt: now - HRM_WARNING_THRESHOLD_MS - 1,
      isConnected: true,
      lastUpdated: now - HRM_WARNING_THRESHOLD_MS - 1,
      maxHr: 180,
    },
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

  it('marks data as stale if updatedAt is old but lastUpdated is recent (server broadcast stale data)', () => {
    // This scenario happens when the server broadcasts the last known state of a user
    // but the sensor itself hasn't sent an update in a while.
    const staleSensorData: ConnectedHrmData = {
      clientId: 'c_stale_sensor',
      name: 'Stale Sensor User',
      value: 120,
      calories: 100,
      updatedAt: now - HRM_WARNING_THRESHOLD_MS - 1, // Sensor timestamp is old
      isConnected: true,
      lastUpdated: now, // Receipt timestamp is fresh (just received from server)
      maxHr: 180,
    }

    const result = getActiveHrmData([staleSensorData], [], now, {
      includeZeroValues: true,
    })

    const user = result.find((d) => d.clientId === 'c_stale_sensor')
    expect(user).toBeDefined()
    expect(user?.isDataStale).toBe(true)
  })
})

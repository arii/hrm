import { filterHrmData, augmentHrmData } from '@/utils/hrm'
import { ConnectedHrmData, ActiveAlert, HrmData } from '@/types/websocket'
import {
  HRM_STALE_THRESHOLD_MS,
  HRM_WARNING_THRESHOLD_MS,
} from '@/utils/constants'

describe('HRM Utils', () => {
  const now = 100000
  const mockHrmData: ConnectedHrmData[] = [
    {
      clientId: 'c1',
      name: 'Jules',
      value: 120,
      calories: 100,
      updatedAt: now,
      isConnected: true,
      lastUpdated: now,
      maxHr: 180,
    },
    {
      clientId: 'c2', // Stale
      name: 'Ariel',
      value: 130,
      calories: 110,
      updatedAt: now - HRM_STALE_THRESHOLD_MS - 1,
      isConnected: true,
      lastUpdated: now - HRM_STALE_THRESHOLD_MS - 1,
      maxHr: 180,
    },
    {
      clientId: 'c3', // Zero value
      name: 'Bob',
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
      name: 'Charlie',
      value: 120,
      calories: 100,
      updatedAt: now - HRM_WARNING_THRESHOLD_MS - 1,
      isConnected: true,
      lastUpdated: now - HRM_WARNING_THRESHOLD_MS - 1,
      maxHr: 180,
    },
  ]

  describe('filterHrmData', () => {
    it('filters stale users', () => {
      const result = filterHrmData(mockHrmData, now, {
        includeZeroValues: true,
      })
      expect(result.find((d) => d.clientId === 'c2')).toBeUndefined()
      expect(result.find((d) => d.clientId === 'c1')).toBeDefined()
    })

    it('filters placeholders', () => {
      const result = filterHrmData(mockHrmData, now, {
        includeZeroValues: true,
      })
      expect(result.find((d) => d.clientId === 'c4')).toBeUndefined()
    })

    it('filters zero values by default', () => {
      const result = filterHrmData(mockHrmData, now)
      expect(result.find((d) => d.clientId === 'c3')).toBeUndefined()
    })

    it('includes zero values if requested', () => {
      const result = filterHrmData(mockHrmData, now, {
        includeZeroValues: true,
      })
      expect(result.find((d) => d.clientId === 'c3')).toBeDefined()
    })

    it('works with HrmData (no lastUpdated)', () => {
      const serverData: HrmData[] = [
        {
          clientId: 's1',
          name: 'Server User',
          value: 120,
          calories: 100,
          updatedAt: now,
          maxHr: 180,
        },
      ]
      const result = filterHrmData(serverData, now)
      expect(result).toHaveLength(1)
      expect(result[0].clientId).toBe('s1')
    })
  })

  describe('augmentHrmData', () => {
    const mockAlerts: ActiveAlert[] = [
      {
        clientId: 'c1',
        code: 'BAD_PLACEMENT',
        message: 'Fix it',
        severity: 'warning',
        timestamp: now,
      },
    ]

    it('marks data as stale (warning)', () => {
      const result = augmentHrmData(mockHrmData, [], now)
      const c5 = result.find((d) => d.clientId === 'c5')
      expect(c5?.isDataStale).toBe(true)
      const c1 = result.find((d) => d.clientId === 'c1')
      expect(c1?.isDataStale).toBe(false)
    })

    it('merges active alerts', () => {
      const result = augmentHrmData(mockHrmData, mockAlerts, now)
      const c1 = result.find((d) => d.clientId === 'c1')
      expect(c1?.isAlerting).toBe(true)
      expect(c1?.alertMessage).toBe('Fix it')
    })

    it('marks data as stale if updatedAt is old but lastUpdated is recent (server broadcast stale data)', () => {
      const staleSensorData: ConnectedHrmData = {
        clientId: 'c_stale_sensor',
        name: 'Stale Sensor User',
        value: 120,
        calories: 100,
        updatedAt: now - HRM_WARNING_THRESHOLD_MS - 1,
        isConnected: true,
        lastUpdated: now,
        maxHr: 180,
      }

      const result = augmentHrmData([staleSensorData], [], now)

      const user = result.find((d) => d.clientId === 'c_stale_sensor')
      expect(user).toBeDefined()
      expect(user?.isDataStale).toBe(true)
    })

    it('pre-calculates percentage and zone when they are missing', () => {
      const mockHrm: ConnectedHrmData = {
        clientId: 'c_new',
        name: 'Real User',
        value: 148, // 148/185 = 80% (Zone 4)
        calories: 0,
        updatedAt: now,
        isConnected: true,
        lastUpdated: now,
        maxHr: 185,
      }

      const result = augmentHrmData([mockHrm], [], now)

      const user = result[0]
      expect(user.percentage).toBe(80)
      expect(user.zone).toBe('ZONE_4')
    })

    it('respects existing percentage and zone if provided', () => {
      const mockHrm: ConnectedHrmData = {
        clientId: 'c_existing',
        name: 'Existing User',
        value: 148,
        calories: 0,
        updatedAt: now,
        isConnected: true,
        lastUpdated: now,
        maxHr: 185,
        percentage: 90,
        zone: 'ZONE_5',
      }

      const result = augmentHrmData([mockHrm], [], now)

      const user = result[0]
      expect(user.percentage).toBe(90)
      expect(user.zone).toBe('ZONE_5')
    })
  })
})

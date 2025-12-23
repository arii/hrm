// File: tests/unit/services/hrmDataService.test.ts
import { HrmDataPoint } from '../../../services/hrmDataService'
import * as fs from 'fs/promises'

jest.useFakeTimers()

// Helper to reset the module's state
let hrmDataService: {
  addHrmDataPoint: (dataPoint: HrmDataPoint) => Promise<void>
  getHrmDataHistory: (since?: number) => Promise<HrmDataPoint[]>
  flushHrmData: () => Promise<void>
}

let mockFileContent = '[]'

beforeEach(async () => {
  jest.spyOn(fs, 'readFile').mockImplementation(async () => mockFileContent)
  jest.spyOn(fs, 'writeFile').mockImplementation(async (path, data) => {
    mockFileContent = data as string
  })
  jest.spyOn(fs, 'access').mockResolvedValue()
  jest.spyOn(fs, 'mkdir').mockResolvedValue()

  jest.isolateModules(() => {
    hrmDataService = require('../../../services/hrmDataService')
  })
})

describe('hrmDataService', () => {
  it('should add a data point and retrieve the history', async () => {
    const dataPoint: HrmDataPoint = {
      timestamp: Date.now(),
      hrm: 120,
      clientId: 'test-client',
    }
    await hrmDataService.addHrmDataPoint(dataPoint)
    await hrmDataService.flushHrmData()

    const history = await hrmDataService.getHrmDataHistory()
    expect(history).toHaveLength(1)
    expect(history[0]).toEqual(dataPoint)
  })

  it('should filter the history by a "since" timestamp', async () => {
    const now = Date.now()
    const dataPoints: HrmDataPoint[] = [
      { timestamp: now - 2000, hrm: 110, clientId: 'test-client' },
      { timestamp: now - 1000, hrm: 120, clientId: 'test-client' },
      { timestamp: now, hrm: 130, clientId: 'test-client' },
    ]
    for (const dp of dataPoints) {
      await hrmDataService.addHrmDataPoint(dp)
    }
    await hrmDataService.flushHrmData()

    const filteredHistory = await hrmDataService.getHrmDataHistory(now - 1500)
    expect(filteredHistory).toHaveLength(2)
    expect(filteredHistory[0].hrm).toBe(120)
    expect(filteredHistory[1].hrm).toBe(130)
  })

  it('should batch writes to the file', async () => {
    const dataPoint1: HrmDataPoint = {
      timestamp: Date.now(),
      hrm: 120,
      clientId: 'test-client',
    }
    const dataPoint2: HrmDataPoint = {
      timestamp: Date.now() + 1000,
      hrm: 130,
      clientId: 'test-client',
    }

    // Add two data points without flushing
    await hrmDataService.addHrmDataPoint(dataPoint1)
    await hrmDataService.addHrmDataPoint(dataPoint2)

    // The file should still be empty
    expect(JSON.parse(mockFileContent)).toHaveLength(0)

    // Fast-forward time to trigger the batch write
    jest.advanceTimersByTime(5000)
    await hrmDataService.flushHrmData()

    // Now the file should contain the batched data
    expect(JSON.parse(mockFileContent)).toHaveLength(2)
  })

  it('should throw an error for invalid data points', async () => {
    const invalidDataPoint = {
      timestamp: 'not-a-number',
      hrm: 120,
      clientId: 'test-client',
    }
    // @ts-ignore
    await expect(hrmDataService.addHrmDataPoint(invalidDataPoint)).rejects.toThrow()
  })
})

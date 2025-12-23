// tests/unit/services/DataPruningService.test.ts
import { DataPruningService } from '../../../lib/services/DataPruningService'
import { HrmDataRepository } from '../../../lib/repositories/HrmDataRepository'
import { HrmStreamData } from '../../../types/core'

jest.useFakeTimers()

describe('DataPruningService', () => {
  let hrmDataRepository: HrmDataRepository
  let dataPruningService: DataPruningService

  beforeEach(() => {
    hrmDataRepository = new HrmDataRepository()
    dataPruningService = new DataPruningService(hrmDataRepository, 30)
  })

  afterEach(() => {
    dataPruningService.stop()
  })

  it('should prune old data when started', () => {
    const now = Date.now()
    const oldTimestamp = now - 31 * 24 * 60 * 60 * 1000
    const recentTimestamp = now - 15 * 24 * 60 * 60 * 1000

    const oldData: HrmStreamData = {
      clientId: 'client-1',
      value: 70,
      maxHr: 180,
      calories: 100,
      timestamp: oldTimestamp,
    }

    const recentData: HrmStreamData = {
      clientId: 'client-2',
      value: 80,
      maxHr: 190,
      calories: 150,
      timestamp: recentTimestamp,
    }

    // Manually insert data to control timestamps
    // @ts-expect-error - Bypassing private access for testing
    hrmDataRepository.clientData.set(oldData.clientId, oldData)
    // @ts-expect-error - Bypassing private access for testing
    hrmDataRepository.clientData.set(recentData.clientId, recentData)

    dataPruningService.start(1000)

    jest.advanceTimersByTime(1000)

    expect(hrmDataRepository.findAll()).toHaveLength(1)
    expect(hrmDataRepository.findById('client-2')).toEqual(recentData)
  })
})

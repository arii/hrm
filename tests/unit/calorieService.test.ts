/**
 * @jest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import {
  startCalorieService,
  stopCalorieService,
  initializeClientSession,
  recordHeartRateSample,
  terminateClientSession,
  processCalorieUpdate,
} from '../../services/calorieService'
import { HrmDataRepository } from '../../lib/repositories/HrmDataRepository'
import { CALORIE_UPDATE_INTERVAL_MS } from '../../utils/constants'

// Mock dependencies
jest.mock('../../lib/repositories/HrmDataRepository')
jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

describe('Calorie Service', () => {
  let mockHrmDataRepository: jest.Mocked<HrmDataRepository>
  let dateNowSpy: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => 0)
    mockHrmDataRepository =
      new HrmDataRepository() as jest.Mocked<HrmDataRepository>
  })

  afterEach(() => {
    stopCalorieService()
    jest.useRealTimers()
    jest.clearAllMocks()
    dateNowSpy.mockRestore()
  })

  it('should calculate and update calories for an active client', () => {
    const clientId = 'client-1'
    mockHrmDataRepository.findById.mockReturnValue({
      clientId,
      totalCalories: 100,
      age: 30,
      maxHr: 190,
      value: 150,
      isConnected: true,
    })

    initializeClientSession(clientId)
    recordHeartRateSample(clientId, 150)
    recordHeartRateSample(clientId, 155)

    // Manually trigger the calorie update
    processCalorieUpdate(mockHrmDataRepository)

    expect(mockHrmDataRepository.update).toHaveBeenCalled()
  })

  it('should not update calories if there are no new HR samples', () => {
    const clientId = 'client-1'
    mockHrmDataRepository.findById.mockReturnValue({
      clientId,
      totalCalories: 100,
      age: 30,
      maxHr: 190,
      value: 150,
      isConnected: true,
    })

    initializeClientSession(clientId)

    // Manually trigger the calorie update
    processCalorieUpdate(mockHrmDataRepository)

    expect(mockHrmDataRepository.update).not.toHaveBeenCalled()
  })

  it('should clear samples for a stale session', () => {
    const clientId = 'client-1'
    mockHrmDataRepository.findById.mockReturnValue({
      clientId,
      totalCalories: 100,
      age: 30,
      maxHr: 190,
      value: 150,
      isConnected: true,
    })

    initializeClientSession(clientId)
    recordHeartRateSample(clientId, 150)

    // Advance time beyond the stale threshold
    dateNowSpy.mockImplementation(() => 6 * 60 * 1000) // 6 minutes

    // Manually trigger the calorie update
    processCalorieUpdate(mockHrmDataRepository)

    expect(mockHrmDataRepository.update).not.toHaveBeenCalled()
  })

  it('should terminate a session for a client that no longer exists', () => {
    const clientId = 'client-1'
    // Client does not exist
    mockHrmDataRepository.findById.mockReturnValue(undefined)

    initializeClientSession(clientId)
    recordHeartRateSample(clientId, 150)

    // Manually trigger the calorie update
    processCalorieUpdate(mockHrmDataRepository)

    // The session should be terminated, so no calorie update
    expect(mockHrmDataRepository.update).not.toHaveBeenCalled()
  })
})

// File: tests/unit/services/hrmService.test.ts
import { HrmService } from '../../../services/hrmService.js'
import { HrmDataRepository } from '../../../lib/repositories/HrmDataRepository.js'
import logger from '../../../utils/logger.js'
import { HrmStreamData } from '../../../types/core.js'

jest.mock('../../../lib/repositories/HrmDataRepository.js')
jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

const MockHrmDataRepository = HrmDataRepository as jest.Mock

describe('HrmService', () => {
  let hrmService: HrmService
  let hrmDataRepository: jest.Mocked<HrmDataRepository>

  beforeEach(() => {
    jest.useFakeTimers()
    const hrmDataStore = new Map<string, HrmStreamData>()
    const mockRepoInstance = {
      save: jest.fn((data: HrmStreamData) => {
        hrmDataStore.set(data.clientId, data)
        return data
      }),
      findById: jest.fn((id: string) => hrmDataStore.get(id)),
      deleteById: jest.fn((id: string) => hrmDataStore.delete(id)),
      findAll: jest.fn(() => Array.from(hrmDataStore.values())),
      clear: jest.fn(() => hrmDataStore.clear()),
    }
    MockHrmDataRepository.mockImplementation(() => mockRepoInstance)
    hrmService = new HrmService()
    hrmDataRepository = mockRepoInstance as jest.Mocked<HrmDataRepository>
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('initializeClient', () => {
    it('should initialize a new client if one does not exist', () => {
      hrmService.initializeClient('client1')
      expect(hrmDataRepository.save).toHaveBeenCalledWith({
        clientId: 'client1',
        value: 0,
        maxHr: 185,
        age: 30,
        calories: 0,
      })
      expect(logger.info).toHaveBeenCalledWith(
        { clientId: 'client1' },
        'Initialized new HRM client session.'
      )
    })

    it('should not initialize a new client if one already exists', () => {
      const existingClient: HrmStreamData = {
        clientId: 'client1',
        value: 120,
        maxHr: 185,
        age: 30,
        calories: 100,
      }
      hrmDataRepository.save(existingClient)
      ;(hrmDataRepository.save as jest.Mock).mockClear()
      hrmService.initializeClient('client1')
      expect(hrmDataRepository.save).not.toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(
        { clientId: 'client1' },
        'HRM client reconnected with existing session.'
      )
    })
  })

  describe('updateMetadata', () => {
    it('should update the metadata for an existing client', () => {
      const existingData: HrmStreamData = {
        clientId: 'client1',
        value: 120,
        maxHr: 185,
        age: 30,
        calories: 100,
        name: 'Old Name',
      }
      hrmDataRepository.save(existingData)
      hrmService.updateMetadata('client1', { name: 'New Name', age: 35 })
      expect(hrmDataRepository.save).toHaveBeenCalledWith({
        ...existingData,
        name: 'New Name',
        age: 35,
      })
    })

    it('should not overwrite a real name with a default name', () => {
      const existingData: HrmStreamData = {
        clientId: 'client1',
        value: 120,
        maxHr: 185,
        age: 30,
        calories: 100,
        name: 'Real Name',
      }
      hrmDataRepository.save(existingData)
      ;(hrmDataRepository.save as jest.Mock).mockClear()
      hrmService.updateMetadata('client1', { name: 'user-123' })
      expect(hrmDataRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Real Name' })
      )
    })
  })

  describe('processHrmInput', () => {
    it('should process HRM input and calculate calories', () => {
      hrmService.initializeClient('client1')
      ;(hrmDataRepository.save as jest.Mock).mockClear()
      jest.advanceTimersByTime(1000 * 60)
      hrmService.processHrmInput('client1', { value: 150 })
      expect(hrmDataRepository.save).toHaveBeenCalled()
      const savedData = (hrmDataRepository.save as jest.Mock).mock.calls[0][0]
      expect(savedData.value).toBe(150)
      expect(savedData.calories).toBeGreaterThan(0)
    })

    it('should use client-calculated calories if available', () => {
      hrmService.initializeClient('client1')
      hrmService.processHrmInput('client1', { value: 150, calories: 105 })
      const savedData = (hrmDataRepository.save as jest.Mock).mock.calls[1][0]
      expect(savedData.calories).toBe(105)
    })

    it('should reject client-calculated calories if there is a large discrepancy', () => {
      hrmService.initializeClient('client1')
      hrmService.processHrmInput('client1', { value: 150, calories: 100 })
      ;(logger.warn as jest.Mock).mockClear()
      hrmService.processHrmInput('client1', { value: 150, calories: 200 })
      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(Object),
        'Large calorie discrepancy detected. Rejecting client update.'
      )
      const savedData = (hrmDataRepository.save as jest.Mock).mock.calls[1][0]
      expect(savedData.calories).not.toBe(200)
      expect(savedData.calories).toBe(100)
    })
  })

  describe('cleanupClient', () => {
    it('should cleanup the client data', () => {
      hrmDataRepository.save({
        clientId: 'client1',
        value: 1,
        age: 1,
        calories: 1,
        maxHr: 1,
      })
      hrmService.cleanupClient('client1')
      expect(hrmDataRepository.deleteById).toHaveBeenCalledWith('client1')
      expect(hrmDataRepository.findById('client1')).toBeUndefined()
    })
  })
})

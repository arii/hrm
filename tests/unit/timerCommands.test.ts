// tests/unit/timerCommands.test.ts
import { TimerCommands } from '../../services/timer/timerCommands'
import { HrmDataRepository } from '../../lib/repositories/HrmDataRepository'
import {
  createInitialTimerState,
  DualModeTimerState,
} from '../../services/timer/timerState'
import { TimerQueries } from '../../services/timer/timerQueries'
import { HrmStreamData } from '../../types/core'

// Mock dependencies
jest.mock('../../lib/repositories/HrmDataRepository')

describe('TimerCommands', () => {
  let state: DualModeTimerState
  let broadcastUpdate: jest.Mock
  let queries: TimerQueries
  let hrmDataRepository: jest.Mocked<HrmDataRepository>
  let clientSessionState: Map<
    string,
    { lastUpdate: number; accumulatedCalories: number }
  >
  let timerCommands: TimerCommands

  beforeEach(() => {
    state = createInitialTimerState()
    broadcastUpdate = jest.fn()
    queries = new TimerQueries(state)
    hrmDataRepository =
      new HrmDataRepository() as jest.Mocked<HrmDataRepository>
    clientSessionState = new Map()

    timerCommands = new TimerCommands(
      state,
      broadcastUpdate,
      queries,
      hrmDataRepository,
      clientSessionState
    )

    // Clear mocks before each test
    jest.clearAllMocks()
    // Stop any running timers
    timerCommands.dispose()
  })

  afterEach(() => {
    timerCommands.dispose()
  })

  describe('start', () => {
    it('should reset calorie data and call saveAll when the timer is started from IDLE', () => {
      // Arrange
      const mockClients: HrmStreamData[] = [
        { clientId: 'client-1', calories: 100, value: 70, maxHr: 180, age: 30 },
        { clientId: 'client-2', calories: 150, value: 80, maxHr: 190, age: 25 },
      ]
      hrmDataRepository.findAll.mockReturnValue(mockClients)

      clientSessionState.set('client-1', {
        lastUpdate: Date.now(),
        accumulatedCalories: 100,
      })
      clientSessionState.set('client-2', {
        lastUpdate: Date.now(),
        accumulatedCalories: 150,
      })

      state.currentPhase = 'IDLE'
      state.isRunning = false

      // Act
      timerCommands.start()

      // Assert
      expect(hrmDataRepository.findAll).toHaveBeenCalledTimes(1)
      expect(hrmDataRepository.saveAll).toHaveBeenCalledTimes(1)

      const expectedUpdatedClients = [
        { ...mockClients[0], calories: 0 },
        { ...mockClients[1], calories: 0 },
      ]
      expect(hrmDataRepository.saveAll).toHaveBeenCalledWith(
        expectedUpdatedClients
      )

      expect(clientSessionState.get('client-1')?.accumulatedCalories).toBe(0)
      expect(clientSessionState.get('client-2')?.accumulatedCalories).toBe(0)

      expect(broadcastUpdate).toHaveBeenCalledWith({
        type: 'HRM_UPDATE',
        payload: expectedUpdatedClients,
      })

      // Ensure the timer actually started
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })

    it('should NOT reset calorie data when the timer is resumed from a paused state', () => {
      // Arrange
      state.currentPhase = 'WORK' // Not IDLE
      state.isRunning = false

      // Act
      timerCommands.start()

      // Assert
      expect(hrmDataRepository.findAll).not.toHaveBeenCalled()
      expect(hrmDataRepository.saveAll).not.toHaveBeenCalled()
      expect(broadcastUpdate).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'HRM_UPDATE' })
      )

      // Ensure the timer actually resumed
      expect(state.isRunning).toBe(true)
    })
  })
})

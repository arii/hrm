// File: lib/commands/HrmInputCommand.ts
/**
 * Command to process incoming HRM stream data from a client.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  HrmInputMessage,
} from '../../types/websocket'
import { HrmDataRepository } from '../repositories/HrmDataRepository'
import { estimateCaloriesBurned } from '../../lib/calorie-estimation'
import { CALORIE_DEFAULTS } from '../../utils/constants'

// This defines the shape of the session state we expect to manage.
interface ClientSession {
  lastUpdate: number
  accumulatedCalories: number
}

export class HrmInputCommand implements ICommand {
  private hrmDataRepository: HrmDataRepository
  private clientSessionState: Map<string, ClientSession>
  private broadcastState: () => void

  constructor(
    hrmDataRepository: HrmDataRepository,
    clientSessionState: Map<string, ClientSession>,
    broadcastState: () => void
  ) {
    this.hrmDataRepository = hrmDataRepository
    this.clientSessionState = clientSessionState
    this.broadcastState = broadcastState
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    clientId: string
  ): void {
    const inputMessage = message as HrmInputMessage
    const existingData = this.hrmDataRepository.findById(clientId)
    const sessionState = this.clientSessionState.get(clientId)

    if (existingData && sessionState) {
      const now = Date.now()
      const dtMinutes = (now - sessionState.lastUpdate) / 1000 / 60
      sessionState.lastUpdate = now

      let currentAccumulated = sessionState.accumulatedCalories
      const currentHr = inputMessage.data.value ?? existingData.value
      const currentAge = existingData.age ?? 30

      if (currentHr > 30 && dtMinutes > 0 && dtMinutes < 5) {
        const caloriesBurned = estimateCaloriesBurned({
          heartRate: currentHr,
          age: currentAge,
          weightKg: CALORIE_DEFAULTS.WEIGHT_KG,
          durationMinutes: dtMinutes,
        })
        currentAccumulated += caloriesBurned
      }

      sessionState.accumulatedCalories = currentAccumulated

      this.hrmDataRepository.save({
        ...existingData,
        value: inputMessage.data.value ?? existingData.value,
        calories: Math.round(currentAccumulated * 10) / 10,
      })
    }
    this.broadcastState()
  }
}

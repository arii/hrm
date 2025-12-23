// File: lib/commands/HrmMetadataUpdateCommand.ts
/**
 * Command to update HRM metadata for a specific client.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  HrmMetadataUpdateMessage,
} from '../../types/websocket'
import { HrmDataRepository } from '../repositories/HrmDataRepository'
import { HrmStreamData } from '../../types/core'

export class HrmMetadataUpdateCommand implements ICommand {
  private hrmDataRepository: HrmDataRepository
  private broadcastState: () => void

  constructor(hrmDataRepository: HrmDataRepository, broadcastState: () => void) {
    this.hrmDataRepository = hrmDataRepository
    this.broadcastState = broadcastState
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    clientId: string
  ): void {
    const updateMessage = message as HrmMetadataUpdateMessage
    const existingData = this.hrmDataRepository.findById(clientId)

    if (existingData) {
      const updateData: Partial<HrmStreamData> = Object.fromEntries(
        Object.entries(updateMessage.data).filter(
          ([_, value]) => value !== null
        )
      )
      this.hrmDataRepository.save({ ...existingData, ...updateData })
    }
    this.broadcastState()
  }
}

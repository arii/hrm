// File: lib/commands/GetStateCommand.ts
/**
 * Command to handle requests for the complete application state snapshot.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  InitialStateSnapshotPayload,
  ServerMessage,
  StateSnapshot,
} from '../../types/websocket'
import { HrmDataRepository } from '../repositories/HrmDataRepository'
import { sendWebSocketMessage } from '../../utils/websocketUtils'

export class GetStateCommand implements ICommand {
  private hrmDataRepository: HrmDataRepository
  private getUnifiedStateSnapshot: () => StateSnapshot

  constructor(
    hrmDataRepository: HrmDataRepository,
    getUnifiedStateSnapshot: () => StateSnapshot
  ) {
    this.hrmDataRepository = hrmDataRepository
    this.getUnifiedStateSnapshot = getUnifiedStateSnapshot
  }

  execute(
    ws: ExtWebSocket,
    _message: ClientCommandMessage,
    _clientId: string
  ): void {
    const stateSnapshot = this.getUnifiedStateSnapshot()
    const payload: InitialStateSnapshotPayload = {
      ...stateSnapshot,
      hrmData: this.hrmDataRepository.findAll(),
    }
    const initialStateMessage: ServerMessage = {
      type: 'INITIAL_STATE',
      payload: payload,
    }
    sendWebSocketMessage(ws, initialStateMessage, 'socketManager.GET_STATE')
  }
}

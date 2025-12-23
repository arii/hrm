// File: lib/commands/SetModeCommand.ts
/**
 * Command to set the operational mode of the TabataTimer service.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  SetModeMessage,
} from '../../types/websocket'
import { serviceContainer } from '../serviceContainer'
import TabataTimer from '../../services/tabataTimer'

export class SetModeCommand implements ICommand {
  private tabataService: TabataTimer

  constructor() {
    this.tabataService = serviceContainer.get('tabataService')
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    _clientId: string
  ): void {
    const modeMessage = message as SetModeMessage
    this.tabataService.setMode(modeMessage.mode)
  }
}

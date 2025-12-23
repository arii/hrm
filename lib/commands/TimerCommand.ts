// File: lib/commands/TimerCommand.ts
/**
 * Command to delegate timer control actions to the TabataTimer service.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  TimerCommandMessage,
} from '../../types/websocket'
import { serviceContainer } from '../serviceContainer'
import TabataTimer from '../../services/tabataTimer'

export class TimerCommand implements ICommand {
  private tabataService: TabataTimer

  constructor() {
    this.tabataService = serviceContainer.get('tabataService')
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    _clientId: string
  ): void {
    const timerMessage = message as TimerCommandMessage
    this.tabataService.handleCommand(timerMessage.command)
  }
}

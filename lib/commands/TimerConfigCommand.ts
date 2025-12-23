// File: lib/commands/TimerConfigCommand.ts
/**
 * Command to configure the work and rest durations of the TabataTimer service.
 */
import { ICommand } from './ICommand'
import {
  ExtWebSocket,
  ClientCommandMessage,
  TimerConfigMessage,
} from '../../types/websocket'
import { serviceContainer } from '../serviceContainer'
import TabataTimer from '../../services/tabataTimer'

export class TimerConfigCommand implements ICommand {
  private tabataService: TabataTimer

  constructor() {
    this.tabataService = serviceContainer.get('tabataService')
  }

  execute(
    _ws: ExtWebSocket,
    message: ClientCommandMessage,
    _clientId: string
  ): void {
    const configMessage = message as TimerConfigMessage
    this.tabataService.setConfig({
      workDuration: configMessage.workDuration,
      restDuration: configMessage.restDuration,
    })
  }
}

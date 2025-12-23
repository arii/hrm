// File: lib/commands/CommandRegistry.ts
/**
 * Command Registry: Maps message types to their corresponding command handlers.
 */
import { ICommand } from './ICommand'
import { ClientCommandMessage } from '../../types/websocket'
import logger from '../../utils/logger'

export class CommandRegistry {
  private commands = new Map<string, ICommand>()

  register(commandType: string, command: ICommand): void {
    if (this.commands.has(commandType)) {
      logger.warn(`Command type ${commandType} is already registered. Overwriting.`);
    }
    this.commands.set(commandType, command)
  }

  get(message: ClientCommandMessage): ICommand | undefined {
    return this.commands.get(message.type)
  }
}

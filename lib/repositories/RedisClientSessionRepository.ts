// lib/repositories/RedisClientSessionRepository.ts
import redisClient from '../redis'
import logger from '@/utils/logger'
import { ClientSessionState } from '../../types'

const SESSION_STATE_KEY_PREFIX = 'session-state:'

export class RedisClientSessionRepository {
  private getKey(clientId: string): string {
    return `${SESSION_STATE_KEY_PREFIX}${clientId}`
  }

  async findById(clientId: string): Promise<ClientSessionState | undefined> {
    try {
      const data = await redisClient.hGetAll(this.getKey(clientId))
      if (!Object.keys(data).length) {
        return undefined
      }
      return {
        accumulatedCalories: Number(data.accumulatedCalories),
        lastUpdate: Number(data.lastUpdate),
      }
    } catch (error) {
      logger.error(
        `Error finding session state for client ${clientId} from Redis:`,
        error
      )
      return undefined
    }
  }

  async save(
    clientId: string,
    sessionState: ClientSessionState
  ): Promise<void> {
    try {
      const dataToSave = {
        accumulatedCalories: sessionState.accumulatedCalories.toString(),
        lastUpdate: sessionState.lastUpdate.toString(),
      }
      await redisClient.hSet(this.getKey(clientId), dataToSave)
    } catch (error) {
      logger.error(
        `Error saving session state for client ${clientId} to Redis:`,
        error
      )
    }
  }

  async deleteById(clientId: string): Promise<void> {
    try {
      await redisClient.del(this.getKey(clientId))
    } catch (error) {
      logger.error(
        `Error deleting session state for client ${clientId} from Redis:`,
        error
      )
    }
  }
}

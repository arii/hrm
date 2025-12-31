// lib/broadcaster.ts
import redisClient, { pubSubClient } from './redis'
import logger from '@/utils/logger'
import { ServerMessage } from '@/types/websocket'

const CHANNEL = 'hrm-data'

export class RedisPubSubBroadcaster {
  private subscriber: typeof pubSubClient

  constructor() {
    this.subscriber = pubSubClient.duplicate()
    this.subscriber.connect().catch((err: unknown) => {
      logger.error({ err }, 'Failed to connect Redis subscriber client')
    })
  }

  async broadcastHrmData(message: ServerMessage): Promise<void> {
    try {
      await redisClient.publish(CHANNEL, JSON.stringify(message))
    } catch (error) {
      logger.error({ error }, 'Failed to broadcast HRM data')
    }
  }

  subscribeToHrmData(onMessage: (message: string) => void): void {
    this.subscriber.subscribe(CHANNEL, onMessage).catch((err: unknown) => {
      logger.error({ err }, `Failed to subscribe to Redis channel: ${CHANNEL}`)
    })
    logger.info(`Subscribed to Redis channel: ${CHANNEL}`)
  }

  async disconnect(): Promise<void> {
    try {
      await this.subscriber.unsubscribe(CHANNEL)
      await this.subscriber.quit()
      logger.info(`Unsubscribed and disconnected from Redis channel: ${CHANNEL}`)
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect broadcaster')
    }
  }
}

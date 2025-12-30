// lib/broadcaster.ts
import redisClient from './redis'
import logger from '@/utils/logger'
import { ServerMessage } from '@/types/websocket'

const CHANNEL = 'hrm-channel'

export function broadcast(message: ServerMessage) {
  redisClient.publish(CHANNEL, JSON.stringify(message))
}

export function subscribe(
  onMessage: (channel: string, message: string) => void
) {
  const subscriber = redisClient.duplicate()
  subscriber.connect()
  subscriber.subscribe(CHANNEL, onMessage)
  logger.info(`Subscribed to Redis channel: ${CHANNEL}`)

  return {
    unsubscribe: () => {
      subscriber.unsubscribe(CHANNEL)
      subscriber.quit()
      logger.info(`Unsubscribed from Redis channel: ${CHANNEL}`)
    },
  }
}

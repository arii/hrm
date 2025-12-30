// lib/redis.ts
import { createClient } from 'redis'
import logger from '@/utils/logger'
import { env } from '@/lib/env'

const redisClient = createClient({
  url: env.REDIS_URL,
})

redisClient.on('error', (err) => {
  logger.error('Redis Client Error', err)
})

redisClient.connect().catch((err) => {
  logger.error('Failed to connect to Redis:', err)
})

export const disconnect = async (): Promise<void> => {
  if (redisClient.isOpen) {
    try {
      await redisClient.quit()
      logger.info('Redis client disconnected successfully.')
    } catch (err) {
      logger.error('Failed to disconnect from Redis:', err)
    }
  }
}

export default redisClient

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

export const pubSubClient = redisClient.duplicate()
pubSubClient.on('error', (err) => logger.error('Redis Pub/Sub Client Error', err))

export const disconnect = async (): Promise<void> => {
  const quitPromises: Promise<string | void>[] = []
  if (redisClient.isOpen) {
    quitPromises.push(redisClient.quit())
  }
  if (pubSubClient.isOpen) {
    quitPromises.push(pubSubClient.quit())
  }
  try {
    await Promise.all(quitPromises)
    logger.info('Redis clients disconnected successfully.')
  } catch (err) {
    logger.error('Failed to disconnect from Redis:', err)
  }
}

export default redisClient

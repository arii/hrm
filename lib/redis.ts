import Redis from 'ioredis';
import { env } from './env.js';
import logger from '../utils/logger.js';

let redis: Redis;
let connectionStatus: 'connecting' | 'connected' | 'error' | 'closed' =
  'connecting'

const getRedisClient = (): Redis => {
  if (!redis) {
    redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        logger.info({ attempt: times, delay }, 'Reconnecting to Redis...')
        return delay
      },
    })

    redis.on('connect', () => {
      logger.info('Connected to Redis')
      connectionStatus = 'connected'
    })

    redis.on('error', (err) => {
      logger.error({ err }, 'Redis connection error')
      connectionStatus = 'error'
    })

    redis.on('close', () => {
      logger.info('Redis connection closed')
      connectionStatus = 'closed'
    })
  }
  return redis
}

export const redisClient = getRedisClient()

export const checkRedisConnection = async (): Promise<{
  healthy: boolean
  status: string
}> => {
  try {
    await redisClient.ping()
    return { healthy: true, status: connectionStatus }
  } catch (_error) {
    return { healthy: false, status: 'error' }
  }
}

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

export default redisClient

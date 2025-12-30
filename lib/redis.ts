// lib/redis.ts
import { createClient } from 'redis'
import { env } from './env.js'
import logger from '../utils/logger.js'

const redisClient = createClient({
  url: env.REDIS_URL,
})

redisClient.on('error', (err) => logger.error('Redis Client Error', err))

redisClient.connect()

export default redisClient

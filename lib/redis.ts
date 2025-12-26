import Redis from 'ioredis';
import { env } from './env';
import logger from '../utils/logger';

let redis: Redis;

const getRedisClient = (): Redis => {
  if (!redis) {
    try {
      redis = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      redis.on('connect', () => {
        logger.info('Connected to Redis');
      });

      redis.on('error', (err) => {
        logger.error({ err }, 'Redis connection error');
      });
    } catch (error) {
      logger.error({ error }, 'Failed to create Redis client');
      process.exit(1);
    }
  }
  return redis;
};

export const redisClient = getRedisClient();

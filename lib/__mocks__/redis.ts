import Redis from 'ioredis-mock';

export const redisClient = new Redis();

export const checkRedisConnection = async () => {
  return { healthy: true, status: 'connected' };
};

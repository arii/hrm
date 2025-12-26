const Redis = require('ioredis-mock');

module.exports.redisClient = new Redis();

module.exports.checkRedisConnection = async () => {
  return { healthy: true, status: 'connected' };
};

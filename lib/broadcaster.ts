// lib/broadcaster.ts
import { createClient } from 'redis';
import { env } from './env.js';
import logger from '../utils/logger.js';
import { ServerMessage } from '../types/websocket.js';
import { EventEmitter } from 'events';

const BROADCAST_CHANNEL = 'websocket-broadcast';

const publisher = createClient({ url: env.REDIS_URL });
const subscriber = createClient({ url: env.REDIS_URL });

const messageEmitter = new EventEmitter();

(async () => {
  await publisher.connect();
  await subscriber.connect();

  subscriber.subscribe(BROADCAST_CHANNEL, (message) => {
    try {
      const parsedMessage: ServerMessage = JSON.parse(message);
      messageEmitter.emit('message', parsedMessage);
    } catch (error) {
      logger.error({ error, message }, 'Failed to parse broadcast message');
    }
  });
})();

export function publish(message: ServerMessage): void {
  publisher.publish(BROADCAST_CHANNEL, JSON.stringify(message));
}

export function subscribe(callback: (message: ServerMessage) => void): () => void {
  messageEmitter.on('message', callback);
  return () => {
    messageEmitter.off('message', callback);
  };
}

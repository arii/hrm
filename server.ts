// server.ts (Refactored)
import express from 'express';
import { createServer } from 'http';
import next from 'next';
import { env } from './lib/env.js';
import { serviceContainer } from './lib/serviceContainer.js';
import { AppServices, createServices } from './lib/services.js';
import { WebSocketManager } from './lib/websocket.js';
import { initSocketManager } from './utils/socketManager.js';
import { StateSnapshot } from './types/websocket.js';
import { Socket } from 'net';
import { checkTimerService, checkWebSocketService } from './lib/healthCheck.js';
import logger from './utils/logger.js';
import { setupRateLimiter } from './lib/middleware/rateLimiter.js';
import { setupStaticAssets } from './lib/middleware/staticAssets.js';

const app = next({
  dev: env.NODE_ENV !== 'production',
  dir: process.cwd(),
  hostname: env.HOST,
  port: env.PORT,
});
const handle = app.getRequestHandler();
const expressApp = express();

app.prepare().then(async () => {
  const server = createServer(expressApp);

  setupRateLimiter(expressApp);
  setupStaticAssets(expressApp);

  const wsManager = new WebSocketManager();
  const services: AppServices = await createServices(
    wsManager.createBroadcaster()
  );
  serviceContainer.register('spotifyService', services.spotifyService);
  serviceContainer.register('tabataService', services.tabataService);
  serviceContainer.register('hrmService', services.hrmService);

  const getUnifiedStateSnapshot = (): StateSnapshot => ({
    timerData: services.tabataService.getState(),
    spotifyData: services.spotifyService.getState(),
    spotifyServiceInitialized: services.isSpotifyInitialized,
  });

  initSocketManager(wsManager.wss, getUnifiedStateSnapshot, services);

  expressApp.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  expressApp.get('/api/internal/health/services', async (_req, res) => {
    const timerCheck = checkTimerService(services.tabataService);
    const wsCheck = await checkWebSocketService();

    const healthy = timerCheck.healthy && wsCheck.healthy;
    const details = {
      timer: timerCheck,
      websocket: wsCheck,
    };

    res.status(200).json({ healthy, details });
  });

  expressApp.use((req, res) => handle(req, res));

  const wsConnections = new Map<string, number>();
  const WS_MAX_CONNECTIONS = 5;

  server.on('upgrade', (req, socket, head) => {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',').shift()?.trim() ||
      req.socket.remoteAddress;

    if (env.NODE_ENV !== 'test' && ip) {
      const count = wsConnections.get(ip) || 0;
      if (count >= WS_MAX_CONNECTIONS) {
        socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
        socket.destroy();
        return;
      }
      wsConnections.set(ip, count + 1);

      socket.on('close', () => {
        const currentCount = wsConnections.get(ip) || 0;
        if (currentCount > 0) {
          wsConnections.set(ip, currentCount - 1);
        }
      });
    }
    wsManager.handleUpgrade(req, socket as Socket, head);
  });

  server.listen(env.PORT, () => {
    logger.info(`> Ready on http://${env.HOST}:${env.PORT}`);
  });
});

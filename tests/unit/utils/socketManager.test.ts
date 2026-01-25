// tests/unit/utils/socketManager.test.ts
import { WebSocket, Server as WebSocketServer } from 'ws';
import { initSocketManager } from '@/utils/socketManager';
import { ConnectionMonitor } from '@/utils/websocketUtils';
import { AppServices } from '@/lib/services';
import { StateSnapshot, ExtWebSocket } from '@/types/websocket';

// Mock dependencies
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn().mockReturnThis(),
  },
}));

jest.mock('@/utils/websocketUtils', () => ({
  ...jest.requireActual('@/utils/websocketUtils'),
  ConnectionMonitor: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

describe('socketManager', () => {
  let wss: WebSocketServer;
  let getSnapshot: jest.Mock<StateSnapshot>;
  let services: AppServices;

  beforeEach(() => {
    wss = new WebSocketServer({ noServer: true });
    getSnapshot = jest.fn();
    services = {} as AppServices;
    initSocketManager(wss, getSnapshot, services);
  });

  afterEach(() => {
    wss.close();
  });

  it('should mark client as alive on any message', (done) => {
    const wsClient = new WebSocket('ws://localhost:8080');
    const extWs = wsClient as ExtWebSocket;

    wss.on('connection', (ws) => {
      const connectedWs = ws as ExtWebSocket;
      connectedWs.isAlive = false;

      ws.on('message', () => {
        expect(connectedWs.isAlive).toBe(true);
        ws.close();
        done();
      });
    });

    wsClient.on('open', () => {
      wsClient.send('any message');
    });
  });
});

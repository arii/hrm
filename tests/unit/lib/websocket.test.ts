import { WebSocketManager } from '../../../lib/websocket';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { WebSocketServer } from 'ws';

jest.mock('ws', () => ({
  WebSocketServer: jest.fn().mockImplementation(() => ({
    handleUpgrade: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  })),
}));

describe('WebSocketManager', () => {
  let webSocketManager: WebSocketManager;
  let req: IncomingMessage;
  let socket: Socket;
  let head: Buffer;
  let wss: jest.Mocked<WebSocketServer>;

  beforeEach(() => {
    webSocketManager = new WebSocketManager();
    wss = webSocketManager.wss as jest.Mocked<WebSocketServer>;
    req = {
      url: '/ws',
      headers: { host: 'localhost' },
    } as IncomingMessage;
    socket = new Socket();
    head = Buffer.alloc(0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(webSocketManager).toBeDefined();
  });

  describe('handleUpgrade', () => {
    it('should call wss.handleUpgrade when pathname is /ws', () => {
      webSocketManager.handleUpgrade(req, socket, head);
      expect(wss.handleUpgrade).toHaveBeenCalled();
    });

    it('should not call wss.handleUpgrade when pathname is not /ws', () => {
      req.url = '/not-ws';
      webSocketManager.handleUpgrade(req, socket, head);
      expect(wss.handleUpgrade).not.toHaveBeenCalled();
    });

    it('should correctly parse the pathname from a full URL', () => {
      req.url = 'http://localhost/ws?query=abc';
      webSocketManager.handleUpgrade(req, socket, head);
      expect(wss.handleUpgrade).toHaveBeenCalled();
    });

    it('should correctly parse the pathname from a URL with a port', () => {
      req.url = 'http://localhost:3000/ws';
      req.headers.host = 'localhost:3000';
      webSocketManager.handleUpgrade(req, socket, head);
      expect(wss.handleUpgrade).toHaveBeenCalled();
    });
  });
});

import { WebSocketServer } from 'ws';
import { startWebSocketServer } from '../../websocketServer';
import http from 'http';

describe('WebSocket Port Configuration', () => {
  let server: http.Server;

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('should start the WebSocket server on the specified port', (done) => {
    const port = parseInt(process.env.WS_PORT || '5556', 10);
    const wss = new WebSocketServer({ noServer: true });
    server = startWebSocketServer(wss);

    server.on('listening', () => {
      const address = server.address();
      if (typeof address === 'string') {
        expect(address).toContain(port.toString());
      } else if (address) {
        expect(address.port).toBe(port);
      }
      done();
    });
  });
});

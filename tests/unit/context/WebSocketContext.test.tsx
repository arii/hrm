/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../../../context/WebSocketContext';

// Store original global objects to restore them after tests
const originalWebSocket = global.WebSocket;
const originalCrypto = global.self.crypto;

// Mock the WebSocket class.
let mockWebSocketInstance: {
  onopen: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  close: jest.Mock;
  send: jest.Mock;
  readyState: number;
};
const mockWebSocket = jest.fn().mockImplementation(() => {
  mockWebSocketInstance = {
    onopen: null, onclose: null, onmessage: null, onerror: null,
    close: jest.fn(), send: jest.fn(), readyState: 0,
  };
  return mockWebSocketInstance;
});

// Mock the URL utility.
jest.mock('../../../utils/urls', () => ({
  getWebSocketURL: jest.fn(() => 'ws://localhost:3001'),
}));

// Set up a more specific spy for localStorage.
const localStorageGetItemSpy = jest.spyOn(Storage.prototype, 'getItem');

const TestComponent = () => {
  const { connectionStatus, sendData } = useWebSocket();
  return (
    <div>
      <div data-testid="status">{connectionStatus}</div>
      <button onClick={() => sendData({ type: 'PING' })}>Send</button>
    </div>
  );
};

describe('WebSocketProvider', () => {

  beforeAll(() => {
    // Assign mocks before all tests run
    global.WebSocket = mockWebSocket as any;
    Object.defineProperty(global.self, 'crypto', {
        value: { randomUUID: () => 'test-uuid' },
        configurable: true,
    });
  });

  afterAll(() => {
    // Restore original globals after all tests have completed
    global.WebSocket = originalWebSocket;
    global.self.crypto = originalCrypto;
    localStorageGetItemSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // This mock implementation handles different keys. It provides the clientId
    // for the WebSocket connection and returns null for 'pendingActions' to
    // prevent the JSON.parse error during component mount.
    localStorageGetItemSpy.mockImplementation((key: string) => {
      if (key === 'clientId') {
        return 'test-uuid';
      }
      return null;
    });
  });

  it('should establish a WebSocket connection on mount', async () => {
    render(<WebSocketProvider><TestComponent /></WebSocketProvider>);
    await waitFor(() => {
      expect(localStorageGetItemSpy).toHaveBeenCalledWith('clientId');
      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3001/?clientId=test-uuid');
    });
  });

  it('should update connection status to "Connected" on open', async () => {
    render(<WebSocketProvider><TestComponent /></WebSocketProvider>);
    await waitFor(() => expect(mockWebSocketInstance).toBeDefined());
    act(() => {
      if (mockWebSocketInstance?.onopen) {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen({} as any);
      }
    });
    expect(screen.getByTestId('status').textContent).toBe('Connected');
  });

  it('should send data when the connection is open', async () => {
    render(<WebSocketProvider><TestComponent /></WebSocketProvider>);
    await waitFor(() => expect(mockWebSocketInstance).toBeDefined());
    act(() => {
      if (mockWebSocketInstance?.onopen) {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen({} as any);
      }
    });
    const sendButton = screen.getByText('Send');
    act(() => sendButton.click());
    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PING' }));
  });
});

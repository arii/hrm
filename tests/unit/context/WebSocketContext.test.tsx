/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../../../context/WebSocketContext';

// --- CRITICAL FIX: Mock localStorage at the top level ---
// This ensures the mock is in place BEFORE the WebSocketContext module is imported and its state is initialized.
const getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

getItemSpy.mockImplementation((key) => {
  if (key === 'clientId') return 'test-uuid';
  return null;
});

// Store original WebSocket to restore it later
const originalWebSocket = global.WebSocket;

let mockWebSocketInstance: {
  onopen: ((event: Partial<Event>) => void) | null;
  onclose: ((event: Partial<Event>) => void) | null;
  onmessage: ((event: Partial<MessageEvent>) => void) | null;
  onerror: ((event: Partial<Event>) => void) | null;
  close: jest.Mock;
  send: jest.Mock;
  readyState: number;
};

const mockWebSocket = jest.fn((...args) => {
  mockWebSocketInstance = {
    onopen: null, onclose: null, onmessage: null, onerror: null,
    close: jest.fn(), send: jest.fn(), readyState: 0,
  };
  return mockWebSocketInstance;
});

// Mock the URL utility
jest.mock('../../../utils/urls', () => ({
  getWebSocketURL: jest.fn(() => 'ws://localhost:3001'),
}));

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
    global.WebSocket = mockWebSocket as any;
  });

  afterAll(() => {
    global.WebSocket = originalWebSocket;
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  beforeEach(() => {
    // Clear call history before each test
    getItemSpy.mockClear();
    setItemSpy.mockClear();
    mockWebSocket.mockClear();
  });

  it('should establish a WebSocket connection on mount', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    await waitFor(() => {
      expect(getItemSpy).toHaveBeenCalledWith('clientId');
      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3001/?clientId=test-uuid');
    });
  });

  it('should update connection status to "Connected" on open', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );
    await waitFor(() => expect(mockWebSocketInstance).toBeDefined());

    act(() => {
      if (mockWebSocketInstance?.onopen) {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen({});
      }
    });
    expect(screen.getByTestId('status').textContent).toBe('Connected');
  });

  it('should send data when the connection is open', async () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );
    await waitFor(() => expect(mockWebSocketInstance).toBeDefined());

    act(() => {
        if (mockWebSocketInstance?.onopen) {
            mockWebSocketInstance.readyState = 1;
            mockWebSocketInstance.onopen({});
        }
    });

    const sendButton = screen.getByText('Send');
    act(() => sendButton.click());

    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PING' }));
  });
});

/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../../../context/WebSocketContext';

// Store original WebSocket to restore it later
const originalWebSocket = global.WebSocket;

let mockWebSocketInstance: {
  onopen: ((event: any) => void) | null;
  onclose: ((event: any) => void) | null;
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  close: jest.Mock;
  send: jest.Mock;
  readyState: number;
};

// A clean, simple mock for the WebSocket class
const mockWebSocket = jest.fn((...args) => {
  mockWebSocketInstance = {
    onopen: null,
    onclose: null,
    onmessage: null,
    onerror: null,
    close: jest.fn(),
    send: jest.fn(),
    readyState: 0, // CONNECTING
  };
  return mockWebSocketInstance;
});

// Mock the URL utility, as its dependency might not be available in Jest
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
  // Use spies for localStorage to avoid overwriting the global object
  let getItemSpy: jest.SpyInstance;
  let setItemSpy: jest.SpyInstance;

  beforeAll(() => {
    // Assign the mock to the global scope
    global.WebSocket = mockWebSocket as any;
  });

  afterAll(() => {
    // Restore the original WebSocket class
    global.WebSocket = originalWebSocket;
  });

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Spy on localStorage and provide a specific implementation for the tests
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    // For these tests, we want to simulate a client that already has an ID
    getItemSpy.mockImplementation((key) => {
      if (key === 'clientId') return 'test-uuid';
      return null; // Ensure other keys like 'pendingActions' return null
    });
  });

  afterEach(() => {
    // Restore the spies after each test to avoid leakage
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
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
        mockWebSocketInstance.readyState = 1; // OPEN
        mockWebSocketInstance.onopen({} as any);
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
            mockWebSocketInstance.readyState = 1; // OPEN
            mockWebSocketInstance.onopen({} as any);
        }
    });

    const sendButton = screen.getByText('Send');
    act(() => sendButton.click());

    expect(mockWebSocketInstance.send).toHaveBeenCalledWith(JSON.stringify({ type: 'PING' }));
  });
});

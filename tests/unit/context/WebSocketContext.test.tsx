/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '@/context/WebSocketContext';
import { ServerMessage } from '@/types/websocket';

jest.useFakeTimers();

const TestComponent = () => {
  const context = useWebSocket();
  return <div data-testid="hrm-data">{JSON.stringify(context?.hrmData)}</div>;
};

describe('WebSocketProvider', () => {
  let ws: { onmessage: (event: { data: string }) => void; close: () => void; };

  beforeEach(() => {
    ws = {
      onmessage: () => {},
      close: jest.fn(),
    };
    global.WebSocket = jest.fn().mockImplementation(() => ws);
  });

  it('should handle HRM_UPDATE for a new user', () => {
    const { getByTestId } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const message: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 120, maxHr: 190 }],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(message) });
      jest.runAllTimers();
    });

    expect(JSON.parse(getByTestId('hrm-data').textContent || '')).toEqual([
      { clientId: '1', name: 'Test User', value: 120, maxHr: 190, isConnected: true },
    ]);
  });

  it('should handle HRM_UPDATE for an existing user', () => {
    const { getByTestId } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const initialMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 120, maxHr: 190 }],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(initialMessage) });
      jest.runAllTimers();
    });

    const updatedMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 125, maxHr: 190 }],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(updatedMessage) });
      jest.runAllTimers();
    });

    expect(JSON.parse(getByTestId('hrm-data').textContent || '')).toEqual([
      { clientId: '1', name: 'Test User', value: 125, maxHr: 190, isConnected: true },
    ]);
  });

  it('should handle HRM_UPDATE when a user disconnects', () => {
    const { getByTestId } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const initialMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [{ clientId: '1', name: 'Test User', value: 125, maxHr: 190 }],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(initialMessage) });
      jest.runAllTimers();
    });

    const updatedMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(updatedMessage) });
      jest.runAllTimers();
    });

    expect(JSON.parse(getByTestId('hrm-data').textContent || '')).toEqual([
      { clientId: '1', name: 'Test User', value: 125, maxHr: 190, isConnected: false },
    ]);
  });

  it('should handle HRM_UPDATE with multiple users', () => {
    const { getByTestId } = render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    const initialMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [
        { clientId: '1', name: 'Test User 1', value: 120, maxHr: 190 },
        { clientId: '2', name: 'Test User 2', value: 130, maxHr: 195 },
      ],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(initialMessage) });
      jest.runAllTimers();
    });

    const updatedMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [
        { clientId: '1', name: 'Test User 1', value: 125, maxHr: 190 },
        { clientId: '3', name: 'Test User 3', value: 140, maxHr: 200 },
      ],
    };

    act(() => {
      ws.onmessage({ data: JSON.stringify(updatedMessage) });
      jest.runAllTimers();
    });

    expect(JSON.parse(getByTestId('hrm-data').textContent || '')).toEqual([
      { clientId: '1', name: 'Test User 1', value: 125, maxHr: 190, isConnected: true },
      { clientId: '2', name: 'Test User 2', value: 130, maxHr: 195, isConnected: false },
      { clientId: '3', name: 'Test User 3', value: 140, maxHr: 200, isConnected: true },
    ]);
  });
});

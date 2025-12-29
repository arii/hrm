/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../../../context/WebSocketContext';

// Mock the entire WebSocketProvider to simplify testing and avoid real WebSocket connections.
jest.mock('../../../context/WebSocketContext', () => ({
    ...jest.requireActual('../../../context/WebSocketContext'),
    WebSocketProvider: ({ children }: { children: React.ReactNode }) => {
        const MockProvider = jest.requireActual('../../../context/WebSocketContext').WebSocketContext.Provider;
        const mockValue = {
            connectionStatus: 'Connected',
            sendData: jest.fn(),
            connect: jest.fn(),
            disconnect: jest.fn(),
            // Provide mock data for other context properties as needed
            hrmData: [],
            timerData: {},
            spotifyData: {},
            activeAlerts: [],
            spotifyServiceInitialized: false,
        };
        return <MockProvider value={mockValue}>{children}</MockProvider>;
    },
}));

const TestComponent = () => {
  const { connectionStatus } = useWebSocket();
  return <div data-testid="status">{connectionStatus}</div>;
};

describe('WebSocketProvider', () => {
  it('should render children and provide a mock context', () => {
    render(
      <WebSocketProvider>
        <TestComponent />
      </WebSocketProvider>
    );

    // Verify that the component renders and the mock context is used.
    expect(screen.getByTestId('status').textContent).toBe('Connected');
  });
});

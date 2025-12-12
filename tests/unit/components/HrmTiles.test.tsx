/** @jest-environment jsdom */

import HrmTiles from '@/components/HrmTiles';
import { useWebSocket } from '@/context/WebSocketContext';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

// Mock the context and child component for isolation
jest.mock('@/context/WebSocketContext');
jest.mock('@/components/HrTile', () => ({
  __esModule: true,
  default: ({
    clientId,
    name,
  }: {
    clientId: string;
    name: string;
  }) => (
    <div data-testid="mock-hr-tile">
      <p>{name}</p>
      <p>ID: {clientId}</p>
    </div>
  ),
}));

const mockedUseWebSocket = useWebSocket as jest.Mock;

describe('HrmTiles', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should render HRM data correctly for a user', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connected',
      activeAlerts: [],
    });

    render(<HrmTiles />);

    const tile = screen.getByTestId('mock-hr-tile');
    expect(within(tile).getByText('Ariel')).toBeInTheDocument();
    expect(within(tile).getByText('ID: user1')).toBeInTheDocument();
  });

  it('should render skeleton containers when hrmData is empty', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [],
      connectionStatus: 'Connected',
      activeAlerts: [],
    });

    render(<HrmTiles />);

    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(2);
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument();
  });

  it('should render skeleton containers when connection status is not "Connected"', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: 'user1', name: 'Ariel', value: 150 }],
      connectionStatus: 'Connecting...',
      activeAlerts: [],
    });

    render(<HrmTiles />);

    expect(screen.getAllByTestId('hr-tile-grid-item')).toHaveLength(2);
    expect(screen.queryByTestId('mock-hr-tile')).not.toBeInTheDocument();
  });

  it('should filter out users with placeholder names or a value of 0', () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [
        { clientId: 'user1', name: 'new user (1)', value: 120 },
        { clientId: 'user2', name: 'Ariel', value: 0 },
        { clientId: 'user3', name: 'Valid User', value: 130 },
      ],
      connectionStatus: 'Connected',
      activeAlerts: [],
    });

    render(<HrmTiles />);

    const tiles = screen.getAllByTestId('mock-hr-tile');
    expect(tiles).toHaveLength(1);
    expect(within(tiles[0]).getByText('Valid User')).toBeInTheDocument();
    expect(within(tiles[0]).getByText('ID: user3')).toBeInTheDocument();
  });
});

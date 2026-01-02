/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { WebSocketProvider } from '@/context/WebSocketContext'

// Mock the Web Bluetooth API
const mockBluetooth = {
  requestDevice: jest.fn(),
  getDevices: jest.fn(),
};
Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
});

// Mock WebSocket context
const mockSendData = jest.fn();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WebSocketProvider>{children}</WebSocketProvider>
);
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: () => ({
    sendData: mockSendData,
    connectionStatus: 'Connected',
  }),
  WebSocketProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('useBluetoothHRM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should indicate that Web Bluetooth is not supported', () => {
    Object.defineProperty(navigator, 'bluetooth', {
      value: undefined,
      writable: true,
    });
    const { result } = renderHook(() => useBluetoothHRM());
    expect(result.current.isSupported).toBe(false);
    Object.defineProperty(navigator, 'bluetooth', {
      value: mockBluetooth,
      writable: true,
    });
  });

  it('should indicate that Web Bluetooth is supported', () => {
    const { result } = renderHook(() => useBluetoothHRM());
    expect(result.current.isSupported).toBe(true);
  });

  it('should connect and stream heart rate data', async () => {
    const mockDevice = {
      id: 'test-device',
      name: 'Test HRM',
      gatt: {
        connect: jest.fn().mockResolvedValue({
          getPrimaryService: jest.fn().mockResolvedValue({
            getCharacteristic: jest.fn().mockResolvedValue({
              startNotifications: jest.fn(),
              addEventListener: jest.fn(),
            }),
          }),
        }),
      },
      addEventListener: jest.fn(),
    };
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useBluetoothHRM(), { wrapper });

    await act(async () => {
      await result.current.connectAndStream();
    });

    expect(result.current.deviceStatus).toBe('Connected to: Test HRM');
    expect(result.current.isConnected).toBe(true);
  });

  it('should handle disconnection', async () => {
    const mockDevice = {
      id: 'test-device',
      name: 'Test HRM',
      gatt: {
        connect: jest.fn().mockResolvedValue({
          getPrimaryService: jest.fn().mockResolvedValue({
            getCharacteristic: jest.fn().mockResolvedValue({
              startNotifications: jest.fn(),
              addEventListener: jest.fn(),
            }),
          }),
        }),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
    };
    mockBluetooth.requestDevice.mockResolvedValue(mockDevice);

    const { result } = renderHook(() => useBluetoothHRM(), { wrapper });

    await act(async () => {
      await result.current.connectAndStream();
    });

    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.deviceStatus).toBe('Disconnected');
  });
});

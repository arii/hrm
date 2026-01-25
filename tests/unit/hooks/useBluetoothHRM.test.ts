/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useBluetoothHRM } from '@/hooks/useBluetoothHRM';
import * as useBluetoothConnection from '@/hooks/useBluetoothConnection';
import * as useGattSubscription from '@/hooks/useGattSubscription';
import * as useDataLiveness from '@/hooks/useDataLiveness';
import * as useSignalQuality from '@/hooks/useSignalQuality';
import * as WebSocketContext from '@/context/WebSocketContext';

// Mock the composed hooks
jest.mock('@/hooks/useBluetoothConnection');
jest.mock('@/hooks/useGattSubscription');
jest.mock('@/hooks/useDataLiveness');
jest.mock('@/hooks/useSignalQuality');
jest.mock('@/context/WebSocketContext');

describe('useBluetoothHRM', () => {
  let mockUseBluetoothConnection: jest.SpyInstance;
  let mockUseGattSubscription: jest.SpyInstance;
  let mockUseDataLiveness: jest.SpyInstance;
  let mockUseSignalQuality: jest.SpyInstance;
  let mockUseWebSocket: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations for the composed hooks
    mockUseBluetoothConnection = jest.spyOn(useBluetoothConnection, 'useBluetoothConnection').mockReturnValue({
      connect: jest.fn().mockResolvedValue(undefined),
      autoConnect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      forgetDevice: jest.fn(),
      device: null,
      deviceStatus: 'Disconnected',
      status: 'DISCONNECTED',
      isConnected: false,
      isSupported: true,
    });

    mockUseGattSubscription = jest.spyOn(useGattSubscription, 'useGattSubscription').mockReturnValue({
      value: null,
      error: null,
    });

    mockUseDataLiveness = jest.spyOn(useDataLiveness, 'useDataLiveness').mockReturnValue({
      isDataStale: false,
    });

    mockUseSignalQuality = jest.spyOn(useSignalQuality, 'useSignalQuality').mockReturnValue({
      signalPeriodMs: 0,
      resetSignalQuality: jest.fn(),
    });

    mockUseWebSocket = jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      lastJsonMessage: null,
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
    });
  });

  it('should call the connect function from useBluetoothConnection when connectAndStream is invoked', async () => {
    const { result } = renderHook(() => useBluetoothHRM());

    await act(async () => {
      await result.current.connectAndStream();
    });

    const { connect } = mockUseBluetoothConnection.mock.results[0].value;
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if WebSocket is not connected when calling connectAndStream', async () => {
    mockUseWebSocket.mockReturnValue({
      ...mockUseWebSocket.mock.results[0].value,
      connectionStatus: 'Disconnected',
    });

    const { result } = renderHook(() => useBluetoothHRM());

    await expect(result.current.connectAndStream()).rejects.toThrow('WebSocket not connected');
  });

  it('should call disconnect from useBluetoothConnection and resetSignalQuality when disconnect is called', () => {
    const { result } = renderHook(() => useBluetoothHRM());

    act(() => {
      result.current.disconnect();
    });

    const { disconnect: disconnectDevice } = mockUseBluetoothConnection.mock.results[0].value;
    const { resetSignalQuality } = mockUseSignalQuality.mock.results[0].value;

    expect(disconnectDevice).toHaveBeenCalledTimes(1);
    expect(resetSignalQuality).toHaveBeenCalledTimes(1);
  });

  it('should parse and forward heart rate data on new GATT value', () => {
    const onHeartRateUpdate = jest.fn();
    let onValueChangeCallback: (value: DataView) => void = () => {};

    // Capture the onValueChange callback
    (useGattSubscription.useGattSubscription as jest.Mock).mockImplementation((props) => {
      if (props.serviceUuid === 'heart_rate') {
        onValueChangeCallback = props.onValueChange as (value: DataView) => void;
      }
      return { value: null, error: null };
    });

    renderHook(() => useBluetoothHRM({ onHeartRateUpdate }));

    const mockHrData = new DataView(new ArrayBuffer(2));
    mockHrData.setUint8(0, 0); // 8-bit HR value
    mockHrData.setUint8(1, 75); // 75 bpm

    act(() => {
      onValueChangeCallback(mockHrData);
    });

    expect(onHeartRateUpdate).toHaveBeenCalledWith(75);
  });

  it('should return the battery level from the battery service subscription', () => {
    const mockBatteryData = new DataView(new ArrayBuffer(1));
    mockBatteryData.setUint8(0, 95); // 95% battery

    // Make the second call to useGattSubscription (for battery) return the mock data
    (useGattSubscription.useGattSubscription as jest.Mock).mockImplementation((props) => {
        if (props.serviceUuid === 'battery_service') {
            return { value: mockBatteryData, error: null };
        }
        return { value: null, error: null };
    });

    const { result } = renderHook(() => useBluetoothHRM());

    expect(result.current.batteryLevel).toBe(95);
  });

  it('should send metadata when connection is established', () => {
    const sendData = jest.fn();
    mockUseWebSocket.mockReturnValue({
        ...mockUseWebSocket.mock.results[0].value,
        sendData,
    });

    // First render with isConnected = false
    const { rerender } = renderHook(
        ({ isConnected }) => {
            (useBluetoothConnection.useBluetoothConnection as jest.Mock).mockReturnValue({
                ...mockUseBluetoothConnection.mock.results[0].value,
                isConnected,
                device: { name: 'Test Device' } as BluetoothDevice
            });
            return useBluetoothHRM({ userName: 'Tester', userAge: 30 });
        },
        { initialProps: { isConnected: false } }
    );

    expect(sendData).not.toHaveBeenCalled();

    // Rerender with isConnected = true
    rerender({ isConnected: true });

    expect(sendData).toHaveBeenCalledWith({
        type: 'HRM_METADATA_UPDATE',
        data: {
            maxHr: 190,
            name: 'Tester',
            age: 30,
        },
    });
  });
});

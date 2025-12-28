/**
 * @jest-environment jsdom
 * @file useBluetoothHRM.test.ts
 * @description Unit tests for the refactored useBluetoothHRM hook.
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBluetoothHRM } from '@/hooks/useBluetoothHRM'
import { BluetoothProvider } from '@/context/BluetoothContext'
import { useWebSocket } from '@/context/WebSocketContext'
import useLocalStorage from '@/hooks/useLocalStorage'
import DeviceManagerService from '@/services/DeviceManagerService'

// Mock the service itself
const mockDeviceManager = {
  findAndConnect: jest.fn(),
  disconnect: jest.fn(),
  forget: jest.fn(),
  updateOptions: jest.fn(),
  connectToDevice: jest.fn(),
  getPreviouslyConnectedDevice: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  device: { id: 'test-device-id', name: 'Test Device' },
}

jest.mock('@/services/DeviceManagerService', () => {
  return jest.fn().mockImplementation(() => mockDeviceManager)
})

// Mock WebSocket context
jest.mock('@/context/WebSocketContext')
const mockedUseWebSocket = useWebSocket as jest.Mock

// Mock useLocalStorage hook
jest.mock('@/hooks/useLocalStorage')
const mockedUseLocalStorage = useLocalStorage as jest.Mock

// Wrapper component that provides all necessary contexts for the hook
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <BluetoothProvider>{children}</BluetoothProvider>
}

describe('useBluetoothHRM Hook', () => {
  let mockSendData: jest.Mock
  let mockSetLastDeviceId: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    mockSendData = jest.fn()
    mockSetLastDeviceId = jest.fn()

    mockedUseWebSocket.mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    mockedUseLocalStorage.mockReturnValue([null, mockSetLastDeviceId])
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBluetoothHRM({}), {
      wrapper: AllTheProviders,
    })
    expect(result.current.deviceStatus).toBe('Disconnected')
    expect(result.current.isConnected).toBe(false)
    expect(result.current.batteryLevel).toBeNull()
  })

  it('should call findAndConnect on connect', async () => {
    mockDeviceManager.findAndConnect.mockResolvedValue(undefined)
    const { result } = renderHook(() => useBluetoothHRM({}), {
      wrapper: AllTheProviders,
    })

    await act(async () => {
      await result.current.connect()
    })

    expect(mockDeviceManager.findAndConnect).toHaveBeenCalledTimes(1)
  })

  it('should attempt to connect to a previous device if lastDeviceId exists', async () => {
    mockedUseLocalStorage.mockReturnValue(['prev-device-id', mockSetLastDeviceId])
    mockDeviceManager.getPreviouslyConnectedDevice.mockResolvedValue({
      id: 'prev-device-id',
      name: 'Previous Device',
    })
    const { result } = renderHook(() => useBluetoothHRM({}), {
      wrapper: AllTheProviders,
    })

    await act(async () => {
      await result.current.connect()
    })

    expect(mockDeviceManager.getPreviouslyConnectedDevice).toHaveBeenCalledWith(
      'prev-device-id'
    )
    expect(mockDeviceManager.connectToDevice).toHaveBeenCalledTimes(1)
    expect(mockDeviceManager.findAndConnect).not.toHaveBeenCalled()
  })

  it('should call disconnect on the service', () => {
    const { result } = renderHook(() => useBluetoothHRM({}), {
      wrapper: AllTheProviders,
    })
    act(() => {
      result.current.disconnect()
    })
    expect(result.current.deviceStatus).toBe('Disconnecting...')
    expect(mockDeviceManager.disconnect).toHaveBeenCalledTimes(1)
  })

  it('should call forget on the service and clear local storage', async () => {
    const { result } = renderHook(() => useBluetoothHRM({}), {
      wrapper: AllTheProviders,
    })
    await act(async () => {
      await result.current.forgetDevice()
    })
    expect(mockDeviceManager.forget).toHaveBeenCalledTimes(1)
    expect(mockSetLastDeviceId).toHaveBeenCalledWith(null)
  })

  it('should update state when service events are fired', () => {
    const { result } = renderHook(
      () => useBluetoothHRM({ userName: 'Test', userAge: 30 }),
      {
        wrapper: AllTheProviders,
      }
    )

    // Helper to extract the event listener callback from mock calls
    const getListener = (eventName: string): ((event: CustomEvent) => void) => {
      const call = (
        mockDeviceManager.addEventListener as jest.Mock
      ).mock.calls.find((c) => c[0] === eventName)
      return call ? call[1] : () => {}
    }

    // Simulate status change
    act(() => {
      getListener('status-changed')(
        new CustomEvent('status-changed', {
          detail: { status: 'connected', message: 'Connected!' },
        })
      )
    })
    expect(result.current.deviceStatus).toBe('Connected!')

    // Simulate heart rate update
    act(() => {
      getListener('heart-rate-received')(
        new CustomEvent('heart-rate-received', { detail: { heartRate: 75 } })
      )
    })
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: 75 },
    })

    // Simulate battery level update
    act(() => {
      getListener('battery-level-received')(
        new CustomEvent('battery-level-received', {
          detail: { batteryLevel: 90 },
        })
      )
    })
    expect(result.current.batteryLevel).toBe(90)

    // Simulate device connected to get device ID
    act(() => {
      getListener('device-connected')(
        new CustomEvent('device-connected', {
          detail: { device: { id: 'new-device-id' } },
        })
      )
    })
    expect(mockSetLastDeviceId).toHaveBeenCalledWith('new-device-id')
  })

  it('should send metadata when connected', async () => {
    const { result } = renderHook(
      () => useBluetoothHRM({ userName: 'Tester', userAge: 40 }),
      { wrapper: AllTheProviders }
    )

    const getListener = (eventName: string): ((event: CustomEvent) => void) => {
      const call = (
        mockDeviceManager.addEventListener as jest.Mock
      ).mock.calls.find((c) => c[0] === eventName)
      return call ? call[1] : () => {}
    }

    act(() => {
      getListener('status-changed')(
        new CustomEvent('status-changed', {
          detail: { status: 'connected', message: 'Connected to Test Device' },
        })
      )
    })

    await waitFor(() => {
      expect(mockSendData).toHaveBeenCalledWith({
        type: 'HRM_METADATA_UPDATE',
        data: {
          maxHr: 180, // 220 - 40
          name: 'Tester',
          age: 40,
        },
      })
    })
  })
})

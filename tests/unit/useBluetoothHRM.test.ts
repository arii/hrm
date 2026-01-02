/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

// Mock dependencies
jest.mock('@/context/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}))

jest.mock('@/hooks/useCalorieCounter', () => ({
  useCalorieCounter: jest.fn().mockReturnValue({
    calories: 123.4,
    smoothedHeartRate: 155,
    resetCalories: jest.fn(),
  }),
}))

// Mock navigator.bluetooth
const mockBluetooth = {
  requestDevice: jest.fn(),
  getDevices: jest.fn(),
}
Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
})

describe('useBluetoothHRM', () => {
  let mockSendData: jest.Mock
  let mockCharacteristic: {
    startNotifications: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let mockGattServer: {
    connect: jest.Mock
    disconnect: jest.Mock
    getPrimaryService: jest.Mock
  }
  let mockDevice: {
    id: string
    name: string
    gatt: {
      connected: boolean
      connect: jest.Mock
      disconnect: jest.Mock
    }
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
  }
  let consoleWarnSpy: jest.SpyInstance
  let consoleInfoSpy: jest.SpyInstance

  beforeAll(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  beforeEach(() => {
    jest.useFakeTimers()
    mockSendData = jest.fn()
    ;(useWebSocket as jest.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    const mockService = {
      getCharacteristic: jest.fn().mockResolvedValue(mockCharacteristic),
    }
    mockGattServer = {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue(mockService),
      }),
      disconnect: jest.fn(),
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connected: false,
        connect: jest.fn().mockResolvedValue(mockGattServer),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  type UseBluetoothHRMReturn = ReturnType<typeof useBluetoothHRM>

  const simulateConnection = async (hook: {
    result: { current: UseBluetoothHRMReturn }
  }) => {
    await act(async () => {
      hook.result.current.connectAndStream('Test User', 30)
      await Promise.resolve()
    })
    Object.defineProperty(mockDevice.gatt, 'connected', {
      value: true,
      writable: true,
    })
  }

  it('should send a null value on manual disconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())
    await simulateConnection({ result })
    act(() => result.current.disconnect())
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'HRM_INPUT',
      data: { value: null, calories: 0 },
    })
  })

  describe('Throttling', () => {
    it('should throttle heart rate updates with a configurable frequency', async () => {
      const { rerender } = renderHook(
        ({ workoutIsActive }) =>
          useBluetoothHRM({ throttleMs: 500, workoutIsActive }),
        { initialProps: { workoutIsActive: false } }
      )

      rerender({ workoutIsActive: true })

      act(() => {
        jest.advanceTimersByTime(500)
      })

      const hrmInputCalls = mockSendData.mock.calls.filter(
        (call) => call[0].type === 'HRM_INPUT'
      ).length
      expect(hrmInputCalls).toBe(1)

      act(() => {
        jest.advanceTimersByTime(499)
      })
      expect(
        mockSendData.mock.calls.filter((call) => call[0].type === 'HRM_INPUT')
          .length
      ).toBe(1)

      act(() => {
        jest.advanceTimersByTime(1)
      })
      expect(
        mockSendData.mock.calls.filter((call) => call[0].type === 'HRM_INPUT')
          .length
      ).toBe(2)
    })
  })
})

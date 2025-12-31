/**
 * @jest-environment jsdom
 */
import { jest } from '@jest/globals'
import { act } from '@testing-library/react'
import deviceManager from '@/services/deviceManager'

// Mock navigator.bluetooth
const mockBluetooth = {
  requestDevice: jest.fn(),
  getDevices: jest.fn(),
}
Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
})

describe('DeviceManager', () => {
  let mockCharacteristic: {
    startNotifications: jest.Mock
    addEventListener: jest.Mock
    removeEventListener: jest.Mock
    readValue: jest.Mock
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

  beforeEach(() => {
    jest.useFakeTimers()

    mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readValue: jest
        .fn()
        .mockResolvedValue(new DataView(new Uint8Array([98]).buffer)),
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
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    act(() => {
      deviceManager.disconnect()
    })
  })

  it('should connect to a device and emit status changes', async () => {
    const statusSpy = jest.fn()
    deviceManager.on('statusChange', statusSpy)

    await act(async () => {
      await deviceManager.connectAndStream()
    })

    expect(statusSpy).toHaveBeenCalledWith('Scanning for devices...')
    expect(statusSpy).toHaveBeenCalledWith('Connecting to: Test HRM...')
    expect(statusSpy).toHaveBeenCalledWith('Connected to: Test HRM')
  })

  it('should emit heart rate data', async () => {
    const hrSpy = jest.fn()
    deviceManager.on('heartRate', hrSpy)

    await act(async () => {
      await deviceManager.connectAndStream()
    })

    const hrCallback = mockCharacteristic.addEventListener.mock.calls.find(
      (call) => call[0] === 'characteristicvaluechanged'
    )?.[1]

    act(() => {
      hrCallback({
        target: { value: new DataView(new Uint8Array([0, 75]).buffer) },
      })
    })

    expect(hrSpy).toHaveBeenCalledWith(75)
  })

  it('should emit battery level data', async () => {
    const batterySpy = jest.fn()
    deviceManager.on('batteryLevel', batterySpy)

    await act(async () => {
      await deviceManager.connectAndStream()
    })

    expect(batterySpy).toHaveBeenCalledWith(98)
  })

  it('should handle disconnection and attempt to reconnect', async () => {
    const disconnectedSpy = jest.fn()
    deviceManager.on('disconnected', disconnectedSpy)

    await act(async () => {
      await deviceManager.connectAndStream()
    })

    const onDisconnectedCallback = mockDevice.addEventListener.mock.calls.find(
      (call) => call[0] === 'gattserverdisconnected'
    )?.[1]

    act(() => {
      if (onDisconnectedCallback) {
        onDisconnectedCallback()
      }
    })

    expect(disconnectedSpy).toHaveBeenCalledWith('signal_loss')

    act(() => {
      jest.advanceTimersByTime(2000)
    })
  })

  it('should handle manual disconnection', async () => {
    const disconnectedSpy = jest.fn()
    deviceManager.on('disconnected', disconnectedSpy)

    await act(async () => {
      await deviceManager.connectAndStream()
    })

    // Make sure the device is "connected" before trying to disconnect
    mockDevice.gatt.connected = true

    act(() => {
      deviceManager.disconnect()
    })

    expect(mockDevice.gatt.disconnect).toHaveBeenCalled()
    expect(disconnectedSpy).toHaveBeenCalledWith('manual')
  })
})

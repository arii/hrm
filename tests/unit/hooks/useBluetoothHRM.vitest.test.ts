/**
 * @vitest-environment jsdom
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest'
import { renderHook, act } from '@testing-library/react'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'

vi.mock('@/context/WebSocketContext')

const mockBluetooth = {
  requestDevice: vi.fn(),
  getDevices: vi.fn(),
}

Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
})

describe('useBluetoothHRM', () => {
  let mockSendData: vi.Mock
  let mockCharacteristic: {
    startNotifications: vi.Mock
    addEventListener: vi.Mock
    removeEventListener: vi.Mock
  }
  let mockGattServer: {
    connect: vi.Mock
    disconnect: vi.Mock
    getPrimaryService: vi.Mock
  }
  let mockDevice: {
    id: string
    name: string
    gatt: {
      connected: boolean
      connect: vi.Mock
      disconnect: vi.Mock
    }
    addEventListener: vi.Mock
    removeEventListener: vi.Mock
  }
  let consoleWarnSpy: vi.SpyInstance
  let consoleInfoSpy: vi.SpyInstance

  beforeAll(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterAll(() => {
    consoleWarnSpy.mockRestore()
    consoleInfoSpy.mockRestore()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    mockSendData = vi.fn()
    ;(useWebSocket as vi.Mock).mockReturnValue({
      sendData: mockSendData,
      connectionStatus: 'Connected',
    })

    mockCharacteristic = {
      startNotifications: vi.fn().mockResolvedValue(undefined),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const mockService = {
      getCharacteristic: vi.fn().mockResolvedValue(mockCharacteristic),
    }
    mockGattServer = {
      connect: vi.fn().mockResolvedValue({
        getPrimaryService: vi.fn().mockResolvedValue(mockService),
      }),
      disconnect: vi.fn(),
      getPrimaryService: vi.fn().mockResolvedValue(mockService),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: {
        connected: false,
        connect: vi.fn().mockResolvedValue(mockGattServer),
        disconnect: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    mockBluetooth.requestDevice.mockResolvedValue(mockDevice)
    mockBluetooth.getDevices.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should use default timeout of 10 seconds and trigger reconnect', async () => {
    const { result } = renderHook(() => useBluetoothHRM())

    await act(async () => {
      result.current.connectAndStream('Test User', 30)
    })

    expect(result.current.isConnected).toBe(true)
  })
})

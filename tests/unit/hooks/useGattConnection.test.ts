/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useGattConnection } from '@/hooks/useGattConnection'

jest.useFakeTimers()

describe('useGattConnection', () => {
  let mockDevice: BluetoothDevice

  beforeEach(() => {
    jest.clearAllMocks()

    const mockGatt = {
      connect: jest.fn().mockResolvedValue({}),
      disconnect: jest.fn(),
    }

    mockDevice = {
      id: 'test-device-id',
      name: 'Test HRM',
      gatt: mockGatt as unknown as BluetoothRemoteGATT,
    } as BluetoothDevice
  })

  it('should connect to a device', async () => {
    const { result } = renderHook(() => useGattConnection())

    await act(async () => {
      await result.current.connect(mockDevice)
    })

    expect(mockDevice.gatt!.connect).toHaveBeenCalled()
    expect(result.current.status).toBe('connected')
  })

  it('should handle connection errors', async () => {
    ;(mockDevice.gatt!.connect as jest.Mock).mockRejectedValue(
      new Error('Connection failed')
    )
    const { result } = renderHook(() => useGattConnection())

    await act(async () => {
      await expect(result.current.connect(mockDevice)).rejects.toThrow(
        'Connection failed'
      )
    })

    expect(result.current.status).toBe('error')
  })

  it('should retry on "zombie" connection error and eventually succeed', async () => {
    const connectMock = mockDevice.gatt!.connect as jest.Mock
    connectMock
      .mockRejectedValueOnce(
        new DOMException('GATT operation already in progress.', 'NetworkError')
      )
      .mockResolvedValueOnce({})

    const { result } = renderHook(() => useGattConnection())

    let connectPromise: Promise<BluetoothRemoteGATTServer>
    act(() => {
      connectPromise = result.current.connect(mockDevice)
    })

    await act(async () => {
      await jest.advanceTimersByTimeAsync(2100)
    })

    await act(async () => {
      await connectPromise
    })

    expect(connectMock).toHaveBeenCalledTimes(2)
    expect(result.current.status).toBe('connected')
  })

  it('should abort a pending connection attempt when a new one is initiated', async () => {
    const mockAbort = jest.fn()
    const abortSignal: AbortSignal = new AbortController().signal

    const OriginalAbortController = global.AbortController
    global.AbortController = jest.fn(
      () =>
        ({
          abort: mockAbort,
          signal: abortSignal,
        }) as unknown as AbortController
    )

    let connectResolver: (value: unknown) => void
    const connectPromise = new Promise((resolve) => {
      connectResolver = resolve
    })
    ;(mockDevice.gatt!.connect as jest.Mock).mockReturnValue(connectPromise)

    const { result } = renderHook(() => useGattConnection())

    act(() => {
      result.current.connect(mockDevice)
    })

    act(() => {
      result.current.connect(mockDevice)
    })

    expect(mockAbort).toHaveBeenCalledTimes(1)

    await act(async () => {
      connectResolver!({})
    })

    global.AbortController = OriginalAbortController
  })
})

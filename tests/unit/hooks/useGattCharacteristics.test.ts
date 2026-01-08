/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useGattCharacteristics } from '@/hooks/useGattCharacteristics'
import {
  HR_SERVICE_UUID,
  HR_CHARACTERISTIC_UUID,
} from '@/lib/bluetoothUtils'

describe('useGattCharacteristics', () => {
  let mockServer: BluetoothRemoteGATTServer

  beforeEach(() => {
    jest.clearAllMocks()

    const mockCharacteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn(),
    }

    const mockService = {
      getCharacteristic: jest
        .fn()
        .mockResolvedValue(mockCharacteristic),
    }

    mockServer = {
      getPrimaryService: jest.fn().mockResolvedValue(mockService),
    } as unknown as BluetoothRemoteGATTServer
  })

  it('should set up characteristics', async () => {
    const { result } = renderHook(() =>
      useGattCharacteristics({ server: mockServer })
    )

    await act(async () => {
      await result.current.setupCharacteristics()
    })

    expect(mockServer.getPrimaryService).toHaveBeenCalledWith(HR_SERVICE_UUID)
    expect(
      (await mockServer.getPrimaryService(HR_SERVICE_UUID)).getCharacteristic
    ).toHaveBeenCalledWith(HR_CHARACTERISTIC_UUID)
  })
})

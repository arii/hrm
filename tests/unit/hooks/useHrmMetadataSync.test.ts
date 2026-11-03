/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { useHrmMetadataSync } from '@/hooks/useHrmMetadataSync'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

describe('useHrmMetadataSync', () => {
  const baseProps = {
    userName: 'Test User',
    userAge: 30,
    getDeviceName: () => 'HR6 0050855',
    sendData: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sends metadata once when connected', () => {
    const sendData = jest.fn()
    renderHook(() =>
      useHrmMetadataSync({
        ...baseProps,
        sendData,
        status: BluetoothConnectionStatus.CONNECTED,
      })
    )
    expect(sendData).toHaveBeenCalledTimes(1)
    expect(sendData).toHaveBeenCalledWith({
      type: 'HRM_METADATA_UPDATE',
      data: expect.objectContaining({ name: 'Test User', age: 30 }),
    })
  })

  it('falls back to the device name when no user name is set', () => {
    const sendData = jest.fn()
    renderHook(() =>
      useHrmMetadataSync({
        ...baseProps,
        userName: '',
        sendData,
        status: BluetoothConnectionStatus.CONNECTED,
      })
    )
    expect(sendData).toHaveBeenCalledWith({
      type: 'HRM_METADATA_UPDATE',
      data: expect.objectContaining({
        name: 'Bluetooth HRM (HR6 0050855)',
      }),
    })
  })

  it('sends nothing while disconnected', () => {
    const sendData = jest.fn()
    renderHook(() =>
      useHrmMetadataSync({
        ...baseProps,
        sendData,
        status: BluetoothConnectionStatus.DISCONNECTED,
      })
    )
    expect(sendData).not.toHaveBeenCalled()
  })

  it('does not resend identical metadata on rerender', () => {
    const sendData = jest.fn()
    const { rerender } = renderHook(() =>
      useHrmMetadataSync({
        ...baseProps,
        sendData,
        status: BluetoothConnectionStatus.CONNECTED,
      })
    )
    rerender()
    expect(sendData).toHaveBeenCalledTimes(1)
  })

  it('exposes userDetailsRef for the connection flow', () => {
    const { result } = renderHook(() =>
      useHrmMetadataSync({
        ...baseProps,
        sendData: jest.fn(),
        status: BluetoothConnectionStatus.DISCONNECTED,
      })
    )
    expect(result.current.userDetailsRef.current).toEqual({
      name: 'Test User',
      age: 30,
    })
  })
})

/**
 * @jest-environment jsdom
 */

import {
  resolveConnectDevice,
  findSavedDevice,
} from '@/hooks/useBluetoothHRM/deviceScan'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import Cookies from 'js-cookie'

const makeDevice = (id: string, name = 'Strap'): BluetoothDevice =>
  ({ id, name }) as unknown as BluetoothDevice

const setBluetooth = (impl: Partial<Navigator['bluetooth']> | null) => {
  Object.defineProperty(navigator, 'bluetooth', {
    configurable: true,
    value: impl,
  })
}

afterEach(() => {
  jest.restoreAllMocks()
  Cookies.remove('hrm_device_id')
  setBluetooth(undefined)
})

describe('resolveConnectDevice', () => {
  it('returns the already-known device without any lookup or picker', async () => {
    const known = makeDevice('known')
    const findSavedDevice = jest.fn()
    const onScanning = jest.fn()

    const device = await resolveConnectDevice(false, {
      savedDevice: known,
      findSavedDevice,
      onScanning,
    })

    expect(device).toBe(known)
    expect(findSavedDevice).not.toHaveBeenCalled()
    expect(onScanning).not.toHaveBeenCalled()
  })

  it('falls back to the saved-device lookup when none is known', async () => {
    const found = makeDevice('saved')
    const findSavedDevice = jest.fn().mockResolvedValue(found)
    const onScanning = jest.fn()

    const device = await resolveConnectDevice(true, {
      savedDevice: null,
      findSavedDevice,
      onScanning,
    })

    expect(device).toBe(found)
    expect(findSavedDevice).toHaveBeenCalledWith(true)
    expect(onScanning).not.toHaveBeenCalled()
  })

  it('returns null on a silent attempt with nothing to connect (no picker)', async () => {
    const findSavedDevice = jest.fn().mockResolvedValue(null)
    const onScanning = jest.fn()

    const device = await resolveConnectDevice(true, {
      savedDevice: null,
      findSavedDevice,
      onScanning,
    })

    expect(device).toBeNull()
    expect(onScanning).not.toHaveBeenCalled()
  })

  it('opens the picker for a manual attempt with nothing saved', async () => {
    const picked = makeDevice('picked')
    const requestDevice = jest.fn().mockResolvedValue(picked)
    setBluetooth({ requestDevice } as never)
    const onScanning = jest.fn()

    const device = await resolveConnectDevice(false, {
      savedDevice: null,
      findSavedDevice: jest.fn().mockResolvedValue(null),
      onScanning,
    })

    expect(onScanning).toHaveBeenCalled()
    expect(requestDevice).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ services: ['heart_rate'] }],
      })
    )
    expect(device).toBe(picked)
  })
})

describe('findSavedDevice', () => {
  it('throws on a silent attempt without a saved device ID (prevents looping)', async () => {
    const onStatusMessage = jest.fn()

    await expect(findSavedDevice(true, onStatusMessage)).rejects.toThrow(
      'No saved device ID for silent connection.'
    )
    expect(onStatusMessage).toHaveBeenCalledWith(
      BLUETOOTH_MESSAGES.checkingSavedDevices
    )
  })

  it('returns null on a manual attempt without a saved device ID', async () => {
    const device = await findSavedDevice(false, jest.fn())
    expect(device).toBeNull()
  })

  it('resolves the saved device by ID from getDevices()', async () => {
    const saved = makeDevice('device-1', 'Chest Strap')
    Cookies.set('hrm_device_id', 'device-1')
    setBluetooth({
      getDevices: jest.fn().mockResolvedValue([makeDevice('other'), saved]),
    } as never)

    const device = await findSavedDevice(true, jest.fn())

    expect(device).toBe(saved)
  })

  it('returns null when the saved ID is not among available devices', async () => {
    Cookies.set('hrm_device_id', 'device-1')
    setBluetooth({
      getDevices: jest.fn().mockResolvedValue([makeDevice('other')]),
    } as never)

    const device = await findSavedDevice(true, jest.fn())

    expect(device).toBeNull()
  })

  it('returns null when the platform lacks getDevices()', async () => {
    Cookies.set('hrm_device_id', 'device-1')
    setBluetooth({} as never)

    const device = await findSavedDevice(true, jest.fn())

    expect(device).toBeNull()
  })
})

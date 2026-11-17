import logger from './connectionLog'
import Cookies from 'js-cookie'
import { BLUETOOTH_MESSAGES } from '@/constants/bluetooth-messages'
import { BATTERY_SERVICE_UUID, HR_SERVICE_UUID } from './constants'

/** Dependencies resolveConnectDevice needs from the hook. */
interface ConnectDeviceResolver {
  savedDevice: BluetoothDevice | null
  findSavedDevice: (silent: boolean) => Promise<BluetoothDevice | null>
  onScanning: () => void
}

/**
 * Device-resolution stage of connectAndStream: the already-known device,
 * else the saved-device lookup, else (manual only) the system picker.
 * Silent attempts never open the picker; picker cancellation propagates
 * to the caller. Extracted verbatim from connectAndStream's resolution
 * branch. Unit-tested.
 */
export const resolveConnectDevice = async (
  silent: boolean,
  resolver: ConnectDeviceResolver
): Promise<BluetoothDevice | null> => {
  if (resolver.savedDevice) return resolver.savedDevice
  const found = await resolver.findSavedDevice(silent)
  if (found) return found
  if (silent) return null
  resolver.onScanning()
  return navigator.bluetooth.requestDevice({
    filters: [{ services: [HR_SERVICE_UUID] }],
    optionalServices: [BATTERY_SERVICE_UUID],
  })
}

/**
 * Watches for one advertisement from the device, bounded by timeoutMs.
 * Chrome refuses gatt.connect() on a getDevices() device until a scan has
 * seen it in this browser session; the watch is that scan. Resolves true
 * on an advertisement and false on timeout or when watching is
 * unsupported or rejected, and false as soon as signal aborts. The watch is
 * always stopped before resolving.
 */
export const waitForAdvertisement = (
  device: BluetoothDevice,
  timeoutMs: number,
  signal?: AbortSignal
): Promise<boolean> => {
  if (typeof device.watchAdvertisements !== 'function') {
    return Promise.resolve(false)
  }
  return new Promise((resolve) => {
    const watchAbort = new AbortController()
    let settled = false
    const finish = (seen: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', onCancel)
      device.removeEventListener('advertisementreceived', onAdvertisement)
      watchAbort.abort()
      resolve(seen)
    }
    const onAdvertisement = () => finish(true)
    const onCancel = () => finish(false)
    const timer = setTimeout(onCancel, timeoutMs)
    if (signal?.aborted) {
      onCancel()
      return
    }
    signal?.addEventListener('abort', onCancel, { once: true })
    const onWatchFailed = (error: unknown) => {
      if (watchAbort.signal.aborted) return
      logger.warn(
        { device: device.name, error },
        'Advertisement watch failed; connecting without a scan.'
      )
      finish(false)
    }
    device.addEventListener('advertisementreceived', onAdvertisement)
    try {
      device
        .watchAdvertisements({ signal: watchAbort.signal })
        .catch(onWatchFailed)
    } catch (error) {
      onWatchFailed(error)
    }
  })
}

/**
 * Resolves the previously paired device via the saved cookie and
 * WebBluetooth's getDevices(), or null when none is available (silent
 * attempts without a saved ID throw to prevent looping). Extracted from
 * connectAndStream's device-resolution branch. The status-message writer
 * arrives as a parameter so this stays a plain module function.
 */
export const findSavedDevice = async (
  silent: boolean,
  onStatusMessage: (message: string | null) => void
): Promise<BluetoothDevice | null> => {
  onStatusMessage(BLUETOOTH_MESSAGES.checkingSavedDevices)
  const savedDeviceId = Cookies.get('hrm_device_id')

  // Abort silent connection if no device ID is found, to prevent looping.
  if (silent && !savedDeviceId) {
    logger.warn(
      { savedDeviceId },
      'Aborting silent connect: No saved device ID.'
    )
    throw new Error('No saved device ID for silent connection.')
  }

  logger.info(
    { savedDeviceId, hasGetDevices: !!navigator.bluetooth?.getDevices },
    'Looking for saved device'
  )
  if (savedDeviceId && navigator.bluetooth?.getDevices) {
    const devices = await navigator.bluetooth.getDevices()
    logger.info({ count: devices.length, savedDeviceId }, 'Available devices')
    const foundDevice = devices.find((d) => d.id === savedDeviceId)

    if (foundDevice) {
      logger.info(
        { device: foundDevice.name },
        'Found saved device, connecting'
      )
      return foundDevice
    }
    logger.info(
      { savedDeviceId },
      'Saved device not found in available devices'
    )
    return null
  }
  logger.info(
    {
      savedDeviceId,
      hasGetDevices: !!navigator.bluetooth?.getDevices,
    },
    'Cannot get saved device'
  )
  return null
}

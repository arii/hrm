import { BluetoothConnectionStatus } from '@/types/bluetooth'

export const checkBluetoothSupport = (): boolean => {
  if (typeof window === 'undefined') return false

  const win = window as unknown as {
    bluetoothTestHelpers?: unknown
    MockBluetooth?: unknown
    __IS_TEST_ENV__?: boolean
  }

  if (
    win.bluetoothTestHelpers ||
    win.MockBluetooth ||
    win.__IS_TEST_ENV__ === true ||
    process.env.NEXT_PUBLIC_TESTING === 'true'
  ) {
    return true
  }
  return !!navigator.bluetooth
}

export const injectTestControls = (
  setStatus: (status: BluetoothConnectionStatus) => void,
  setCustomStatusMessage: (msg: string | null) => void
) => {
  if (typeof window === 'undefined') return () => {}

  const win = window as unknown as {
    TEST_CONTROLS?: {
      setHrmStatus?: (status: BluetoothConnectionStatus) => void
      setCustomHrmStatusMessage?: (msg: string | null) => void
    }
    __IS_TEST_ENV__?: boolean
    bluetoothTestHelpers?: unknown
    MockBluetooth?: unknown
  }

  const isTestEnv =
    win.bluetoothTestHelpers ||
    win.MockBluetooth ||
    win.__IS_TEST_ENV__ === true ||
    process.env.NEXT_PUBLIC_TESTING === 'true'

  if (isTestEnv) {
    win.TEST_CONTROLS = {
      ...win.TEST_CONTROLS,
      setHrmStatus: setStatus,
      setCustomHrmStatusMessage: setCustomStatusMessage,
    }

    return () => {
      if (win.TEST_CONTROLS) {
        delete win.TEST_CONTROLS.setHrmStatus
        delete win.TEST_CONTROLS.setCustomHrmStatusMessage
      }
    }
  }

  return () => {}
}

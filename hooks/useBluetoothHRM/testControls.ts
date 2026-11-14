import type { Dispatch, SetStateAction } from 'react'
import { BluetoothConnectionStatus } from '@/types/bluetooth'

/** The VRT/test control slots this hook installs on window. */
export interface HrmTestControls {
  setHrmStatus: Dispatch<SetStateAction<BluetoothConnectionStatus>>
  setCustomHrmStatusMessage: Dispatch<SetStateAction<string | null>>
  setSignalStatus: Dispatch<SetStateAction<{ last: number; slow: number }>>
}

/**
 * Removes this hook instance's VRT/test controls, but only when the slots
 * still hold these exact functions: a remounted hook overwrites them with
 * its own wrappers, which a stale unmount must not delete. The identities
 * to match arrive as arguments (the installed wrappers, not the raw
 * setters) so the comparison can actually succeed.
 */
export const teardownTestControls = (installed: HrmTestControls): void => {
  if (typeof window === 'undefined') return
  const controls = window.__TEST_CONTROLS__
  if (!controls) return
  if (controls.setHrmStatus === installed.setHrmStatus) {
    delete controls.setHrmStatus
  }
  if (
    controls.setCustomHrmStatusMessage === installed.setCustomHrmStatusMessage
  ) {
    delete controls.setCustomHrmStatusMessage
  }
  if (controls.setSignalStatus === installed.setSignalStatus) {
    delete controls.setSignalStatus
  }
}

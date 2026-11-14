import { useCallback, useRef, useState } from 'react'

/**
 * Device-ownership state for the Bluetooth HRM connection: the monotonic
 * ownership token plus the guard flags every radio operation reads.
 *
 * Every NEW operation (manual connect, disconnect, reconnect, test
 * injection) claims the token via claimConnectionAttempt; stale async
 * completions (notably silent auto-connect finishing after newer state)
 * must check it before writing. The guard flags record what interrupted
 * or owns the radio right now.
 */
export const useConnectionOwnership = () => {
  const [connectionAttempted, setConnectionAttempted] = useState(false)
  const connectionAttemptRef = useRef(0)
  const claimConnectionAttempt = useCallback(() => {
    connectionAttemptRef.current += 1
  }, [])
  const isConnecting = useRef(false)
  const isManualDisconnect = useRef(false)
  const isTimeoutDisconnect = useRef(false)
  // Set once by the unmount cleanup in useBluetoothHRM; quiet-retry sleeps
  // check it so a resolved timer never fires radio ops into an unmounted hook.
  const isUnmountedRef = useRef(false)

  return {
    connectionAttempted,
    setConnectionAttempted,
    connectionAttemptRef,
    claimConnectionAttempt,
    isConnecting,
    isManualDisconnect,
    isTimeoutDisconnect,
    isUnmountedRef,
  }
}

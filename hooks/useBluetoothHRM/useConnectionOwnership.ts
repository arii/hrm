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
  // Settles when the current radio op ends. A forced release (a Connect
  // tap or reset taking over) swaps it out, so the superseded op's own
  // end() can no longer clear the flag under the new owner.
  const radioIdleRef = useRef<Promise<void> | null>(null)
  // Last time the current radio op advanced a step; the stuck-connect
  // detector compares it against STUCK_CONNECT_TIMEOUT_MS.
  const radioProgressAtRef = useRef(0)
  const markRadioProgress = useCallback(() => {
    radioProgressAtRef.current = Date.now()
  }, [])
  const beginRadioOp = useCallback(() => {
    isConnecting.current = true
    radioProgressAtRef.current = Date.now()
    let settle!: () => void
    const idle = new Promise<void>((resolve) => {
      settle = resolve
    })
    radioIdleRef.current = idle
    return () => {
      if (radioIdleRef.current === idle) {
        radioIdleRef.current = null
        isConnecting.current = false
      }
      settle()
    }
  }, [])
  // Waits up to maxWaitMs for the current op to unwind after its abort,
  // then frees the radio regardless: a hung platform call can never keep
  // the next attempt locked out.
  const releaseRadio = useCallback(async (maxWaitMs: number) => {
    const idle = radioIdleRef.current
    if (idle) {
      let timer: ReturnType<typeof setTimeout> | undefined
      await Promise.race([
        idle,
        new Promise<void>((resolve) => {
          timer = setTimeout(resolve, maxWaitMs)
        }),
      ])
      clearTimeout(timer)
    }
    radioIdleRef.current = null
    isConnecting.current = false
  }, [])
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
    beginRadioOp,
    releaseRadio,
    markRadioProgress,
    radioProgressAtRef,
    isManualDisconnect,
    isTimeoutDisconnect,
    isUnmountedRef,
  }
}

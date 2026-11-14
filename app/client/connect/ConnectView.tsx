import { useMediaQuery } from '@mui/material'
import { useState, useEffect } from 'react'
import { useFullReset } from '@/hooks/useFullReset'
import logger from '@/utils/logger'
import { ConnectMain } from './components/ConnectMain'
import {
  BluetoothUnsupported,
  ConnectLoading,
} from './components/ConnectGateViews'
import {
  getConnectionBanner,
  resolveConnectViewState,
} from './connectViewState'
import type { ConnectViewProps } from './ConnectViewProps'

export type { ConnectViewProps }

// Public view-state resolvers for existing consumers and tests; the
// implementation lives in connectViewState.ts.
export { getConnectionBanner, resolveConnectViewState }

export default function ConnectView(props: ConnectViewProps) {
  const {
    isConnected,
    deviceStatus,
    onForgetDevice,
    isSupported,
    onReset,
    currentHR,
    hasStarted,
    bluetoothConnected,
    userProfile,
  } = props
  const [mounted, setMounted] = useState(false)
  const { data } = userProfile

  useEffect(() => {
    // One-shot hydration guard (empty deps): fires once, cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isConnected) {
      logger.debug(
        { currentHR, userName: data.userName },
        'HrTile rendering with currentHR'
      )
    }
  }, [currentHR, isConnected, data.userName])

  // After the effects, where the reset closure lived: keeps hook order
  // (and effect execution order) identical to before the extraction.
  const reset = useFullReset(onForgetDevice, onReset)

  // Reduced motion: static hourglass instead of the indeterminate spinner.
  // Same testid/layout so waits and VRT masks are unaffected.
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  if (!mounted) {
    return <ConnectLoading reducedMotion={prefersReducedMotion} />
  }

  if (!isSupported) {
    return (
      <BluetoothUnsupported
        onFullReset={reset.handleFullReset}
        isResetting={reset.isResetting}
      />
    )
  }

  // Flattened render conditions (#9606): kept for the non-banner branches.
  const state = resolveConnectViewState({
    deviceStatus,
    isConnected,
    hasStarted,
    bluetoothConnected,
    userName: data.userName,
    userAge: data.userAge,
  })

  return (
    <ConnectMain
      view={props}
      state={state}
      reset={reset}
      reducedMotion={prefersReducedMotion}
    />
  )
}

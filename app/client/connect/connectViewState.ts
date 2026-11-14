interface ConnectionBannerArgs {
  deviceStatus: string
  isConnected: boolean
  hasStarted: boolean
  bluetoothConnected: boolean
}

interface ConnectionBanner {
  severity: 'error' | 'warning' | 'success' | 'info'
  text: string
}

// Exactly one status banner at a time, highest priority first: a named
// failure beats live BLE state, which beats the bare-disconnected notice,
// which beats the connected confirmation. A started workout must not mask
// recovery progress ("Reconnecting... (Attempt 3/8)", "Waiting for ... to
// wake up..."): the raw caption only renders while connected, so the banner
// is the only place that state is visible. Pure: unit-tested.
export const getConnectionBanner = ({
  deviceStatus,
  isConnected,
  hasStarted,
  bluetoothConnected,
}: ConnectionBannerArgs): ConnectionBanner | null => {
  if (!isConnected) {
    // An empty status cannot name a failure, so no emptiness guard here;
    // the live-state branch below needs one (empty must stay silent).
    if (deviceStatus.includes('Failed')) {
      return { severity: 'error', text: deviceStatus }
    }
    if (deviceStatus && !deviceStatus.includes('Disconnected')) {
      return {
        severity: hasStarted ? 'warning' : 'info',
        text: deviceStatus,
      }
    }
    if (hasStarted) {
      return { severity: 'warning', text: 'Device disconnected' }
    }
    return null
  }
  if (bluetoothConnected) {
    return {
      severity: 'success',
      text: 'Connected! Heart rate data is being streamed.',
    }
  }
  return null
}

interface ConnectViewStateInput {
  deviceStatus: string
  isConnected: boolean
  hasStarted: boolean
  bluetoothConnected: boolean
  userName: string
  userAge: string
}

interface ConnectViewState {
  showUserProfile: boolean
  isConnecting: boolean
  hasProfile: boolean
  banner: ConnectionBanner | null
}

// Flattened render conditions (#9606): which profile block, whether the
// connect button spins (disabled) or is tappable, and the single status
// banner. Pure: unit-tested.
export const resolveConnectViewState = (
  input: ConnectViewStateInput
): ConnectViewState => {
  const showUserDetails = input.hasStarted || input.isConnected
  return {
    showUserProfile: !showUserDetails,
    // Any in-flight radio op spins and disables the button, so a tap can
    // never collide with an attempt. Patient waiting is deliberately not
    // in-flight: the button stays tappable as a retry-now.
    isConnecting: /Connecting|Reconnecting|Scanning|Checking|Retrying/.test(
      input.deviceStatus
    ),
    hasProfile: Boolean(input.userName.trim() && input.userAge.trim()),
    banner: getConnectionBanner({
      deviceStatus: input.deviceStatus,
      isConnected: input.isConnected,
      hasStarted: input.hasStarted,
      bluetoothConnected: input.bluetoothConnected,
    }),
  }
}

export type { ConnectionBanner, ConnectViewState }

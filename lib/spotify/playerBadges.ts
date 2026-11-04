/**
 * Strict player-state display policy for Spotify surfaces: exactly one
 * status affordance at a time, so badges and buttons can never contradict
 * each other. Uses latched server truth so poll-to-poll list flaps never
 * reach the UI, and stays silent while anything plays rather than
 * guessing. Pure: unit-tested, including the at-most-one invariant.
 */
export interface PlayerBadgeState {
  /** HRM web player latched as the active device. Implies listActive. */
  hrmActive: boolean
  /** Any device latched active. */
  listActive: boolean
  /** An auto-transfer fired and awaits server confirmation. */
  autoPending: boolean
  /** Displayed (optimistic) playing state. */
  displayPlaying: boolean
  /** Browser SDK ready with a device id. */
  sdkReady: boolean
  /** HRM web player present in the server device list. */
  listed: boolean
}

interface PlayerBadges {
  showActiveBadge: boolean
  showConnectingBadge: boolean
  showAutoPending: boolean
  showConnectButton: boolean
}

interface TrackDisplay {
  displayTrackName: string
  displayArtist: string
}

/**
 * Now-playing text policy: the server's "Awaiting Login..." placeholder
 * renders as idle copy instead of leaking transport state into the UI.
 * Pure: unit-tested.
 */
export const resolveTrackDisplay = (
  trackName: string,
  artist: string
): TrackDisplay =>
  trackName === 'Awaiting Login...'
    ? { displayTrackName: 'No Active Playback', displayArtist: '' }
    : { displayTrackName: trackName, displayArtist: `— ${artist}` }

const NO_BADGES: PlayerBadges = {
  showActiveBadge: false,
  showConnectingBadge: false,
  showAutoPending: false,
  showConnectButton: false,
}

export const resolvePlayerBadges = (state: PlayerBadgeState): PlayerBadges => {
  // The latch guarantees hrmActive implies listActive; the early return
  // enforces the at-most-one invariant even for states that cannot occur.
  if (state.hrmActive) return { ...NO_BADGES, showActiveBadge: true }
  if (state.displayPlaying || state.listActive) return { ...NO_BADGES }
  if (state.autoPending) return { ...NO_BADGES, showAutoPending: true }
  if (!state.sdkReady || !state.listed)
    return { ...NO_BADGES, showConnectingBadge: true }
  return { ...NO_BADGES, showConnectButton: true }
}

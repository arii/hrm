import {
  resolvePlayerBadges,
  resolveTrackDisplay,
  type PlayerBadgeState,
} from '@/lib/spotify/playerBadges'

describe('resolvePlayerBadges', () => {
  const baseState = (): PlayerBadgeState => ({
    hrmActive: false,
    listActive: false,
    autoPending: false,
    displayPlaying: false,
    sdkReady: true,
    listed: true,
  })

  it.each([
    [
      'active badge when the HRM player is latched active',
      { hrmActive: true, listActive: true },
      {
        showActiveBadge: true,
        showConnectingBadge: false,
        showAutoPending: false,
        showConnectButton: false,
      },
    ],
    [
      'connecting badge while the SDK is not ready',
      { sdkReady: false },
      {
        showActiveBadge: false,
        showConnectingBadge: true,
        showAutoPending: false,
        showConnectButton: false,
      },
    ],
    [
      'connecting badge while the player is unlisted',
      { listed: false },
      {
        showActiveBadge: false,
        showConnectingBadge: true,
        showAutoPending: false,
        showConnectButton: false,
      },
    ],
    [
      'pending chip (not button or badge) right after auto-fire',
      { autoPending: true },
      {
        showActiveBadge: false,
        showConnectingBadge: false,
        showAutoPending: true,
        showConnectButton: false,
      },
    ],
    [
      'connect button when ready, listed, idle, and nothing pending',
      {},
      {
        showActiveBadge: false,
        showConnectingBadge: false,
        showAutoPending: false,
        showConnectButton: true,
      },
    ],
    [
      'silence while anything plays',
      { displayPlaying: true, autoPending: true },
      {
        showActiveBadge: false,
        showConnectingBadge: false,
        showAutoPending: false,
        showConnectButton: false,
      },
    ],
    [
      'silence while another device is active',
      { listActive: true },
      {
        showActiveBadge: false,
        showConnectingBadge: false,
        showAutoPending: false,
        showConnectButton: false,
      },
    ],
  ])('%s', (_name, overrides, expected) => {
    expect(resolvePlayerBadges({ ...baseState(), ...overrides })).toEqual(
      expected
    )
  })

  describe('resolveTrackDisplay', () => {
    it('renders idle copy for the awaiting-login placeholder', () => {
      expect(resolveTrackDisplay('Awaiting Login...', 'Nobody')).toEqual({
        displayTrackName: 'No Active Playback',
        displayArtist: '',
      })
    })

    it('renders the track and artist as-is otherwise', () => {
      expect(resolveTrackDisplay('Song', 'Artist')).toEqual({
        displayTrackName: 'Song',
        displayArtist: '— Artist',
      })
    })
  })

  it('shows at most one status affordance for every reachable state', () => {
    // hrmActive implies listActive in the latch (hrm = active + name
    // match), so only combinations respecting that invariant can occur.
    const keys: (keyof PlayerBadgeState)[] = [
      'hrmActive',
      'listActive',
      'autoPending',
      'displayPlaying',
      'sdkReady',
      'listed',
    ]
    for (let mask = 0; mask < 1 << keys.length; mask++) {
      const state = baseState()
      keys.forEach((key, i) => {
        state[key] = !!(mask & (1 << i))
      })
      if (state.hrmActive && !state.listActive) continue
      const badges = resolvePlayerBadges(state)
      const shown = Object.values(badges).filter(Boolean).length
      expect(shown).toBeLessThanOrEqual(1)
    }
  })
})

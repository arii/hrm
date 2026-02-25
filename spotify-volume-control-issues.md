# Bug Report: Spotify Volume Control Issues on /client/control Page

## Bug Description

Two critical issues exist with Spotify volume control on the `/client/control` page:

1. **Duplicate Spotify Web Playback Player Creation**: The control page creates its own Spotify Web Playback SDK player instance when it should only send commands to the server.
2. **Volume Slider Snap-Back**: Volume slider snaps back to previous state when adjusting, making volume control unusable.

## Steps to Reproduce

### Issue 1: Duplicate Player
1. Navigate to `/client/app` (main dashboard) - creates Web Playback player
2. Open `/client/control` in another tab/window
3. Observe browser console errors about multiple player instances
4. Volume commands fail or behave erratically

### Issue 2: Volume Snap-Back
1. Navigate to `/client/control`
2. Ensure Spotify is connected with an active device
3. Try to drag the volume slider to a new value
4. Observe slider immediately snapping back to previous value
5. Volume command may not be sent or conflicts with WebSocket sync

## Expected Behavior

1. **Single Player Instance**: Only the main dashboard (`/client/app` via `DashboardClient` → `SpotifyDisplay`) should create a Spotify Web Playback SDK player instance. The control panel should only send commands via WebSocket.

2. **Smooth Volume Control**: Volume slider should respond immediately to user input, maintain the user's selected position while dragging, and only sync with server state when the user is not actively adjusting it.

## Actual Behavior

1. **Duplicate Players**: `SpotifyControls.tsx` line 34 calls `useSpotifyWebPlayback()`, creating a second player instance that conflicts with the main dashboard's player.

2. **Volume Snap-Back**: The volume slider updates are fighting between three competing sources:
   - User input via `handleVolumeChange` (line 189)
   - Debounced command sending (lines 245-266)
   - WebSocket sync effect (lines 102-120)
   
   The WebSocket sync effect triggers on every `devices` array update and immediately overwrites the user's local volume state, causing the slider to snap back.

## Architecture Context

This violates the **Stateful Server Architecture** principle:
- Control pages should send commands to the server via WebSocket (using `useSpotifyCommand`)
- Only the main app page should instantiate the Spotify Web Playback SDK player
- State synchronization must respect user interaction and not override during active input

Reference: `.github/copilot-instructions.md` - "Critical Architectural Constraints" → "The Stateful Server Architecture"

## Files Involved

### Primary Issue Files

**`app/client/control/components/SpotifyControls.tsx`**
- **Line 34**: ❌ `const { player, isReady } = useSpotifyWebPlayback()` - Should NOT be called here
- **Lines 102-120**: Volume sync effect that overwrites user input
- **Lines 189-202**: `handleVolumeChange` updates localStorage immediately
- **Lines 245-266**: Debounced effect sends commands on every `volume` change
- **Line 331**: VolumeSlider missing `onVolumeChangeCommitted` prop

**`components/SpotifyDisplay.tsx`** (Correct Implementation Reference)
- **Line 141**: ✅ Correctly calls `useSpotifyWebPlayback()` on main app
- **Lines 46-103**: Uses reducer pattern with `isSliding` state to prevent sync during user interaction
- **Lines 145-176**: Respects `VOLUME_SYNC_GRACE_PERIOD_MS` to prevent snap-back
- **Lines 210-217**: Separates `handleVolumeChange` (immediate UI) from `handleVolumeChangeCommitted` (send command)

### Supporting Files

**`hooks/useSpotifyWebPlayback.ts`**
- Creates singleton Spotify Web Playback SDK player instance
- Should only be called once per browser session

**`hooks/useVolumePreference.ts`**
- Manages volume state in localStorage
- Updates trigger re-renders that cascade into debounced effects

**`components/shared/VolumeSlider.tsx`**
- Supports both `onVolumeChange` (during drag) and `onVolumeChangeCommitted` (on release)
- Control page only uses `onVolumeChange`, missing the committed handler

## Root Cause Analysis

### Issue 1: Duplicate Player
SpotifyControls.tsx unnecessarily imports and calls `useSpotifyWebPlayback()`. This was likely copied from SpotifyDisplay.tsx but shouldn't exist on control pages.

### Issue 2: Volume Snap-Back
The control page has a **state synchronization race condition**:

1. User drags slider → `handleVolumeChange` → `setVolume(val)` → updates localStorage
2. localStorage update triggers `volume` dependency in debounced effect (line 266)
3. Debounce timer set for 300ms
4. WebSocket receives `SPOTIFY_UPDATE` broadcast (within ~100ms)
5. `devices` array reference changes (even if content same)
6. Volume sync effect (line 120) triggers, checking grace period against `lastVolumeSyncTimeRef`
7. Grace period check passes (volume change hasn't sent yet due to debounce)
8. `setVolume(playbackVolume)` overwrites user's input
9. Slider snaps back to server value
10. Debounce timer fires at 300ms but sends stale value

**Missing Pattern**: SpotifyDisplay uses:
- Reducer with `isSliding` state to block WebSocket sync during user interaction
- `onVolumeChangeCommitted` to send command only when user releases slider
- `hasPendingSendRef` to track in-flight commands, not just debounce timers

## Proposed Solution

### Fix 1: Remove Duplicate Player (DONE in current session)

**Changes Applied:**
```typescript
// app/client/control/components/SpotifyControls.tsx

// REMOVED:
- import useSpotifyWebPlayback from '@/hooks/useSpotifyWebPlayback'
- const { player, isReady } = useSpotifyWebPlayback()
- {player && !isReady ? <Typography>Registering...</Typography> : <TrackInfo />}

// RESULT: Control page now only sends commands, doesn't create player
```

### Fix 2: Refactor Volume Control Pattern

**Adopt SpotifyDisplay's proven pattern:**

```typescript
// app/client/control/components/SpotifyControls.tsx

// Add sliding state tracking
const [isSliding, setIsSliding] = useState(false)
const hasPendingSendRef = useRef<boolean>(false)

// Replace handleVolumeChange with two handlers:
const handleVolumeChange = useCallback(
  (val: number) => {
    setIsSliding(true)  // Prevent WebSocket sync
    setVolume(val)
    // Optional: Throttled offline warning only
  },
  [setVolume]
)

const handleVolumeChangeCommitted = useCallback(
  (val: number) => {
    setIsSliding(false)
    hasPendingSendRef.current = true
    lastVolumeSyncTimeRef.current = Date.now()
    sendVolumeCommand(val)
  },
  [sendVolumeCommand]
)

// Update VolumeSlider usage:
<VolumeSlider
  volume={volume}
  muted={muted}
  onVolumeChange={handleVolumeChange}
  onVolumeChangeCommitted={handleVolumeChangeCommitted}  // ADD THIS
  onToggleMute={toggleMute}
  showValue={true}
/>

// Update volume sync effect to respect sliding state:
useEffect(() => {
  const activeDevice = devices.find((d) => d.is_active)
  const playbackVolume = spotifyData.playback.volume_percent
  
  // NEW: Block sync during user interaction
  if (isSliding) return
  
  const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current
  
  // NEW: Also check pending send flag
  if (hasPendingSendRef.current && 
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS) {
    return
  }
  
  // Clear pending flag after grace period
  if (hasPendingSendRef.current && 
      timeSinceLastVolumeSend >= VOLUME_SYNC_GRACE_PERIOD_MS) {
    hasPendingSendRef.current = false
  }
  
  if (activeDevice && typeof playbackVolume === 'number') {
    if (playbackVolume !== volume) {
      setVolume(playbackVolume)
    }
  }
}, [devices, spotifyData.playback.volume_percent, isSliding, volume, setVolume])

// REMOVE the debounced effect entirely (lines 245-266)
// It's replaced by onVolumeChangeCommitted
```

**Alternative: Use Reducer Pattern**

For more robust state management, adopt SpotifyDisplay's full reducer pattern (lines 13-103). This centralizes all volume state transitions and makes the synchronization logic more testable.

## Tests to Update

**`tests/unit/app/client/control/components/SpotifyControls.test.tsx`**
- ✅ Line 204: Already updated to remove "Registering HRM Web Player..." test
- ✅ Line 11: Already removed `useSpotifyWebPlayback` import
- ✅ Lines 28-38: Already removed mock for `useSpotifyWebPlayback`

**Add New Test:**
```typescript
it('prevents volume snap-back during slider drag', async () => {
  const { rerender } = render(<SpotifyControls />)
  
  const slider = screen.getByRole('slider')
  
  // Simulate user starting to drag
  fireEvent.change(slider, { target: { value: 80 } })
  
  // Simulate WebSocket update arriving during drag
  mockUseWebSocket.mockReturnValue({
    ...mockWebSocketState,
    spotifyData: {
      ...mockSpotifyData,
      playback: { ...mockSpotifyData.playback, volume_percent: 50 }
    }
  })
  rerender(<SpotifyControls />)
  
  // Slider should still show 80, not snap to 50
  expect(slider).toHaveValue('80')
  
  // Simulate user releasing slider
  fireEvent.changeCommitted(slider, { target: { value: 80 } })
  
  // Command should be sent with user's final value
  await waitFor(() => {
    expect(mockSendData).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: 80,
      })
    )
  })
})
```

## Additional Context

### Why This Matters

1. **User Experience**: Volume control is a high-frequency interaction. Snap-back makes the feature completely unusable and frustrating.

2. **Resource Management**: Multiple Spotify player instances consume additional browser resources and can cause authentication conflicts.

3. **Architecture Consistency**: Control pages should be thin clients that send commands, not create their own playback infrastructure.

### Related Constants

**`constants/spotify.ts`**
```typescript
export const VOLUME_SYNC_GRACE_PERIOD_MS = 500 // Time to prevent sync after volume send
export const HRM_WEB_PLAYER_NAME = 'HRM Web Player'
```

The grace period exists specifically to prevent the snap-back issue, but it's only effective when combined with proper sliding state tracking.

## Priority

**High** - This affects core functionality on the control page, which is a primary interface for timer operators.

## Related Issues

- PR #9235: "Fix Spotify Volume Control Race Condition and 204 Noise" - This addressed similar issues in SpotifyDisplay but didn't update SpotifyControls to match the pattern.

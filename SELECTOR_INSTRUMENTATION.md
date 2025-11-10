# Selector Instrumentation Guide

**Status**: Documentation complete ✅ | Implementation pending (Phase 2 Todo #12)  
**Last Updated**: November 9, 2025  
**Branch**: nov_6_refactor

This document explains how to add test selectors (data-testid, id) to key HRM components for improved automated testing, debugging, and DOM inspection with MCP Chrome DevTools.

## Why Add Selectors?

- **Improved MCP Testing**: MCP can reliably target specific elements using `data-testid` attributes
- **Reduced Brittle Tests**: Avoids relying on fragile DOM hierarchy or role-based queries
- **Faster Debugging**: Quickly locate components in the DOM tree during development
- **Better Automation**: Enables consistent element targeting across navigation and state changes

## Best Practices

1. **Use `data-testid` over `id`** for test-specific attributes (preserves IDs for CSS/JS functionality)
2. **Be Descriptive**: `data-testid="hr-tile-zone-1"` is better than `data-testid="tile1"`
3. **Add at Component Level**: Put selectors on the parent component container, not every child
4. **Document the Pattern**: Keep naming consistent across similar components
5. **Don't Export**: Selectors are testing implementation details, not part of the public API

## Components to Instrument

### 1. HrTile Component (`components/HrTile.tsx`)

**Purpose**: Display heart rate with percentage, BPM, and zone color.

**Current Structure**:

```tsx
<Paper elevation={3} sx={{ backgroundColor: background, ... }}>
  <Typography>{percentMax}%</Typography>
  <Typography>{bpm} BPM</Typography>
</Paper>
```

**How to Add Selectors**:

Add `data-testid` to the Paper component and key children:

```tsx
const HrTile = ({ name, bpm, percentMax, background }: HrTileProps) => {
  return (
    <Paper
      elevation={3}
      data-testid={`hr-tile-${name.toLowerCase().replace(/\s+/g, "-")}`}
      sx={{
        backgroundColor: background,
        color: "#fff",
        p: 2,
        textAlign: "center",
        minHeight: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        border: "none",
        borderRadius: 3,
      }}
    >
      {/* Giant Percentage */}
      <Typography
        data-testid="hr-percentage"
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
          fontSize: { xs: "7rem", sm: "9rem", md: "11rem" },
          fontWeight: 900,
          lineHeight: 0.85,
          my: 0.5,
          textShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        {percentMax}%
      </Typography>
      <Typography
        data-testid="hr-bpm"
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        {bpm} BPM
      </Typography>
      <Typography variant="body2">{name}</Typography>
    </Paper>
  );
};

export default HrTile;
```

**MCP Usage Example**:

```typescript
// Take a screenshot of just the HR tile
await mcp.take_screenshot({
  uid: "hr-tile-mock-user", // from snapshot
  filePath: "/tmp/hr-tile.png",
});

// Verify color changed to zone color
const bgColor = await mcp.evaluate_script({
  function: "(el) => window.getComputedStyle(el).backgroundColor;",
  args: [{ uid: "hr-tile-mock-user" }],
});
```

### 2. TimerDisplay Component (`components/TimerDisplay.tsx`)

**Purpose**: Display countdown timer with phase label and progress.

**Current Structure**:

```tsx
<Box>
  <Typography>{formatted time}</Typography>
  <Typography>{phase} • Cycle X/8</Typography>
</Box>
```

**How to Add Selectors**:

```tsx
interface TimerDisplayProps {
  timeRemaining: number;
  currentPhase: "WORK" | "REST" | "COOLDOWN" | "IDLE";
  cycle: number;
  totalCycles: number;
}

const TimerDisplay = ({
  timeRemaining,
  currentPhase,
  cycle,
  totalCycles,
}: TimerDisplayProps) => {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;

  const phaseColor = {
    WORK: "#ef4444",
    REST: "#22c55e",
    COOLDOWN: "#3b82f6",
    IDLE: "#6b7280",
  }[currentPhase];

  return (
    <Box
      data-testid="timer-display"
      sx={{
        textAlign: "center",
        p: 2,
        backgroundColor: phaseColor,
        borderRadius: 2,
        color: "white",
      }}
    >
      <Typography
        data-testid="timer-countdown"
        variant="h2"
        sx={{ fontFamily: "monospace", fontWeight: "bold" }}
      >
        {formatted}
      </Typography>
      <Typography
        data-testid="timer-phase"
        variant="h6"
        sx={{ mt: 1, fontWeight: "600" }}
      >
        {currentPhase}
      </Typography>
      <Typography data-testid="timer-cycle" variant="body2" sx={{ mt: 0.5 }}>
        Cycle {cycle}/{totalCycles}
      </Typography>
    </Box>
  );
};

export default TimerDisplay;
```

**MCP Usage Example**:

```typescript
// Wait for phase to change to WORK
await mcp.wait_for({ text: "WORK", timeout: 5000 });

// Verify phase text and color
const phaseEl = await mcp.take_snapshot(); // Get UIDs
const bgColor = await mcp.evaluate_script({
  function: "(el) => window.getComputedStyle(el).backgroundColor;",
  args: [{ uid: "timer-display" }], // From snapshot
});

// Should be red (#ef4444) for WORK phase
console.assert(bgColor === "rgb(239, 68, 68)");
```

### 3. Spotify Card Component (in `app/page.tsx`)

**Purpose**: Display current track, artist, and playback status.

**Current Structure**:

```tsx
<Card>
  <Typography>{trackName}</Typography>
  <Typography>{artist}</Typography>
  <Typography>Playback Status: {isPlaying ? "Playing" : "Paused"}</Typography>
</Card>
```

**How to Add Selectors**:

In the dashboard page where the Spotify card is rendered:

```tsx
{
  /* Spotify Card */
}
<Paper
  data-testid="spotify-card"
  sx={{
    p: 3,
    backgroundColor: "#1a1a1a",
    color: "#fff",
    borderRadius: 2,
  }}
>
  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
    <MusicNote sx={{ mr: 1 }} />
    <Typography variant="h6">NOW PLAYING</Typography>
  </Box>

  <Typography
    data-testid="spotify-track-name"
    variant="h5"
    sx={{ fontWeight: "bold", mb: 1 }}
  >
    {spotifyData.trackName}
  </Typography>

  <Typography
    data-testid="spotify-artist"
    variant="body1"
    sx={{ mb: 2, color: "#aaa" }}
  >
    by {spotifyData.artist}
  </Typography>

  <Typography
    data-testid="spotify-playback-status"
    variant="caption"
    sx={{ display: "block", color: "#888" }}
  >
    Playback Status: {spotifyData.isPlaying ? "Playing" : "Paused"}
  </Typography>

  {!session && (
    <Typography
      variant="caption"
      sx={{ display: "block", mt: 1, color: "#f44336" }}
    >
      Login required via the /client/control page to enable live updates.
    </Typography>
  )}
</Paper>;
```

**MCP Usage Example**:

```typescript
// Verify track name updates
await mcp.wait_for({ text: "We Are The People", timeout: 5000 });

// Extract current track
const snapshot = await mcp.take_snapshot();
// Find UID with spotify-track-name

// Verify playback status
const statusText = await mcp.evaluate_script({
  function: "(el) => el.innerText;",
  args: [{ uid: "spotify-playback-status" }],
});

console.log(statusText); // "Playback Status: Playing"
```

## Testing Strategy with MCP

### 1. Visual Regression Test Example

```typescript
// Test: HR tile shows correct zone color for given BPM
async function testHrZoneColors() {
  // Navigate to mock HRM page
  await mcp.navigate_page({
    type: "url",
    url: "http://127.0.0.1:3000/client/mock",
  });

  // Click Zone 2 (green, ~115 BPM)
  await mcp.click({ uid: "zone-2-button" }); // from snapshot

  // Start streaming
  await mcp.click({ uid: "start-stream-button" });

  // Navigate to dashboard
  await mcp.navigate_page({
    type: "url",
    url: "http://127.0.0.1:3000",
  });

  // Verify HR tile displays
  await mcp.wait_for({ text: "115 BPM", timeout: 5000 });

  // Verify background color is GREEN (#4CAF50)
  const bgColor = await mcp.evaluate_script({
    function: "(el) => window.getComputedStyle(el).backgroundColor;",
    args: [{ uid: "hr-tile-mock-user" }],
  });

  console.assert(
    bgColor === "rgb(76, 175, 80)",
    `Expected green, got ${bgColor}`
  );

  // Take screenshot for visual regression
  await mcp.take_screenshot({
    filePath: "/home/ari/hrm/screenshots/zone-2-green.png",
    fullPage: false,
    uid: "hr-tile-mock-user",
  });
}
```

### 2. Real-Time Update Test Example

```typescript
// Test: Timer phase changes from WORK to REST within expected time
async function testTimerPhaseTransition() {
  // Navigate to control panel
  await mcp.navigate_page({
    type: "url",
    url: "http://127.0.0.1:3000/client/control",
  });

  // Start timer
  await mcp.click({ uid: "timer-start-button" });

  // Navigate to dashboard
  await mcp.navigate_page({
    type: "url",
    url: "http://127.0.0.1:3000",
  });

  // Wait for WORK phase
  await mcp.wait_for({ text: "WORK", timeout: 5000 });

  // Get initial timestamp
  const t1 = Date.now();
  console.log(`WORK phase started at ${t1}`);

  // Wait for REST phase
  await mcp.wait_for({ text: "REST", timeout: 30000 });
  const t2 = Date.now();

  const elapsed = (t2 - t1) / 1000;
  console.log(
    `Transitioned to REST after ${elapsed}s (expected ~20s for WORK)`
  );

  // Verify transition happened within expected time window (19-21s)
  console.assert(
    elapsed >= 19 && elapsed <= 21,
    `Unexpected transition time: ${elapsed}s`
  );

  // Verify REST color is GREEN
  const restBgColor = await mcp.evaluate_script({
    function: "(el) => window.getComputedStyle(el).backgroundColor;",
    args: [{ uid: "timer-display" }],
  });

  console.assert(
    restBgColor === "rgb(34, 197, 94)",
    `Expected green for REST, got ${restBgColor}`
  );
}
```

### 3. Latency Measurement Example

```typescript
// Test: Measure round-trip latency from mock HRM to dashboard update
async function measureHrUpdateLatency() {
  // Open both pages (mock and dashboard in separate tabs)
  const mockPage = await mcp.new_page({
    url: "http://127.0.0.1:3000/client/mock",
  });
  const dashboardPage = await mcp.new_page({ url: "http://127.0.0.1:3000" });

  // Select mock page and set Zone 5 (high HR: 175 BPM)
  await mcp.select_page({ pageIdx: 0 });
  await mcp.click({ uid: "zone-5-button" });

  // Record timestamp just before starting stream
  const sendTime = Date.now();
  await mcp.click({ uid: "start-stream-button" });

  // Switch to dashboard and wait for the 175 BPM to appear
  await mcp.select_page({ pageIdx: 1 });
  await mcp.wait_for({ text: "175 BPM", timeout: 5000 });
  const receiveTime = Date.now();

  const latency = receiveTime - sendTime;
  console.log(`Round-trip latency: ${latency}ms (target: <120ms)`);

  // Assert latency is acceptable
  console.assert(latency < 120, `Latency too high: ${latency}ms`);
}
```

## Implementation Checklist

- [ ] Add `data-testid="hr-tile-{name}"` to HrTile Paper component
- [ ] Add `data-testid="hr-percentage"` to percentage Typography
- [ ] Add `data-testid="hr-bpm"` to BPM Typography
- [ ] Add `data-testid="timer-display"` to TimerDisplay Box
- [ ] Add `data-testid="timer-countdown"` to countdown Typography
- [ ] Add `data-testid="timer-phase"` to phase Typography
- [ ] Add `data-testid="timer-cycle"` to cycle Typography
- [ ] Add `data-testid="spotify-card"` to Spotify Paper
- [ ] Add `data-testid="spotify-track-name"` to track Typography
- [ ] Add `data-testid="spotify-artist"` to artist Typography
- [ ] Add `data-testid="spotify-playback-status"` to status Typography
- [ ] Create MCP-based visual regression tests
- [ ] Create latency measurement tests
- [ ] Document selector patterns in this file

## Running Tests with Selectors

Once selectors are in place:

```bash
# Start the dev server
npm run dev:clean &

# Start Chrome with remote debugging
/usr/bin/google-chrome \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --disable-web-security \
  --user-data-dir=~/.config/chrome-debug-profile &

# Start MCP Chrome DevTools
npm run mcp:chrome-devtools &

# Run your test script (using the MCP API)
# Example: node my-mcp-test.js
```

## Common Selector Patterns

| Component          | Selector                  | Query Method  | Use Case                                  |
| ------------------ | ------------------------- | ------------- | ----------------------------------------- |
| HR Tile            | `hr-tile-mock-user`       | `data-testid` | Visual regression, color validation       |
| Timer Display      | `timer-display`           | `data-testid` | Phase transition tests, visual validation |
| Timer Countdown    | `timer-countdown`         | `data-testid` | Time accuracy tests                       |
| Timer Phase        | `timer-phase`             | `data-testid` | Phase label verification                  |
| Spotify Card       | `spotify-card`            | `data-testid` | Track display, real-time updates          |
| Spotify Track Name | `spotify-track-name`      | `data-testid` | Track change detection                    |
| Playback Status    | `spotify-playback-status` | `data-testid` | Playback state verification               |

## Future Enhancements

1. **Add data-cy attributes** for Cypress testing if needed
2. **Generate selector docs** automatically from component JSDoc
3. **Create Playwright PageObject** wrappers using these selectors
4. **Add accessibility role selectors** alongside data-testid for a11y testing
5. **Implement visual regression snapshots** in CI/CD pipeline

---

## Session Status

**Documentation**: ✅ Complete (Nov 9, 2025)

- 3 component patterns documented with code examples
- 3 MCP test scenarios provided
- 12-item implementation checklist created
- Common selector patterns reference table included

**Next Steps**:

1. Implement selectors in code (add data-testid to HrTile, TimerDisplay, Spotify components)
2. Create automated MCP test suite using provided examples
3. Add visual regression tests to CI/CD pipeline

**Related**: See PHASE2_FINAL_REPORT.md for session context and related work.

**Last Updated:** November 9, 2025  
**Status:** Guide complete, implementation pending

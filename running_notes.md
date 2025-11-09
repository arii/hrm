# Running Notes - HRM Development

Ephemeral scratchpad for CURRENT focus items. When tasks are finished, migrate durable guidance into `plan.md`, `.github/copilot-instructions.md`, or `README.md` and prune here.

Primary Near-Term Goal (Nov 2025): Streamline FRONTEND iteration using MCP servers + Chrome DevTools and tighten automated visual & performance validation.

Recent Fixes: Spotify auth & bring-up stable; shifting emphasis to front-end UX quality, latency, and visual regression fidelity.

Typos fixed from previous version ("can can", "and and", "exerpeince").

---

## CURRENT DIAGNOSTIC (Phase 2 Investigation - Nov 9)

**Status**: Phase 1 complete; investigating WebSocket early closure in remote Chrome context.

**Finding**: WebSocket connections ARE being established at the server level (logs show `WebSocket Client connected: user-*`), but they close immediately after. This causes the dashboard and mock pages to show "Connecting..." or "Disconnected" status.

**Evidence**:

- Dev server logs confirm connections: `WebSocket Client connected: user-pbsco5i` → `WebSocket Client disconnected: user-pbsco5i`
- HTTP requests work fine (status 200 from `fetch()`)
- WebSocket protocol upgrade succeeds (proven by direct `new WebSocket()` test in browser console)
- Connections are clean closes, not errors

**Hypothesis**: Early disconnect may be due to (1) page navigation/reload pattern in MCP workflow, (2) connection validation/heartbeat timing, or (3) client-side hook detecting and closing stale connections.

**Next Steps**:

1. Test direct local Chrome (non-remote) to establish baseline for WebSocket stability.
2. Keep mock/dashboard pages open longer to see if connections stabilize.
3. Consider HTTP polling fallback for real-time testing if WebSocket remains unstable in MCP context.

---

## Highest Priority: Legacy Visual Parity (Look & Feel)

Goal: Make the new dashboard look and feel like the old one. Focus first on real-time tiles, colors, and Spotify card. Functionally the old site wasn't perfect, but its realtime display and color cues worked well.

Acceptance criteria

- HR tiles show huge percent numbers and use the exact zone colors (see Color Palette Reference) at the same thresholds.
- Timer section typography, phase labels, and background tints match perceived legacy styling.
- Spotify card consistently shows track + artist without flicker, with dark card styling.
- Visual regression screenshots for dashboard and control panel match baseline within tolerances.
- Real-time updates feel instant: WS round-trip <120ms, tile color reflects new HR within one update cycle.

What to do (tools + steps)

1. Establish baseline screenshots from the legacy look (or approved mock):
   - Save reference PNGs into `public/screenshots/original_site_screenshots/`.
   - Name them `legacy-dashboard.png`, `legacy-control.png`.
2. Run/record new baselines for our app when approved:
   - `npm run test:visual:update` after manual verification.
3. Use Chrome DevTools MCP to capture side-by-side:
   - Open both pages and take full-page screenshots for diffing.
4. Verify color parity via computed styles (Playwright snippet below) on key elements (`#hr-zone-box`, timer phase chip/card, Spotify card background).
5. Track a parity checklist (below) and keep it green before moving on to new features.

---

## Color Palette Reference (must-match)

From `utils/visualization.ts` (current):

| Zone   | Meaning  | Hex       |
| ------ | -------- | --------- |
| Grey   | Below Z1 | `#9E9E9E` |
| Blue   | Warm-up  | `#2196F3` |
| Green  | Fat Burn | `#4CAF50` |
| Yellow | Cardio   | `#FFEB3B` |
| Red    | Peak     | `#F44336` |
| Purple | Max      | `#9C27B0` |

Timer progress colors:

- WORK: `#ef4444` (red-500 equivalent)
- REST: `#22c55e` (green-500)
- COOLDOWN: `#3b82f6` (blue-500)
- IDLE: `#6b7280` (gray-500/600)

Quick audits

- Select HR tile container (id `#hr-zone-box` if exposed, otherwise tile root) and compare `backgroundColor` to expected hex.
- Check timer phase accent matches the phase color.
- Ensure contrast > 4.5:1 on white text over colored tiles (Lighthouse/DevTools).

---

## Component Parity Checklist

- [ ] HrTile
  - Huge percent font (>= 9rem on md)
  - Background uses zone color exactly, white text, minimal shadow, square edges
  - BPM and % labels present and readable
- [ ] TimerDisplay
  - Large time remaining, clear phase label (WORK/REST/COOLDOWN)
  - Background tint and progress color match table above
  - Phase transition sound triggers reliably
- [ ] Spotify Card
  - Dark card with consistent typography
  - Track title and artist stable (no flicker on poll)
  - Play/Pause state syncs within 1 poll (<=3s)
- [ ] Layout/Spacing
  - Grid similar to legacy proportions: Timer left, 2-3 tiles across, secondary row with details + Spotify
  - Mobile: control panel buttons large, consistent spacing

---

## Quick Start: Frontend + MCP Tooling

1. Start unified dev server (includes WS + services):
   ```bash
   npm run dev:clean
   ```
2. (Optional) Ensure no stale PM2 processes:
   ```bash
   npm run pm2:stop || true
   ```
3. Launch Chrome DevTools MCP (isolated profile):
   ```bash
   npm run mcp:chrome-devtools
   ```
   VS Code Task: "Start Chrome DevTools MCP (isolated)".
4. (Headless performance runs):
   ```bash
   npm run mcp:chrome-devtools:headless
   ```
5. Confirm WebSocket dashboard reachable:
   - Open `http://127.0.0.1:3000` (Dashboard)
   - Open `http://127.0.0.1:3000/client/control` (Controls)
   - Open `http://127.0.0.1:3000/client/mock` (Mock HR input)
6. Run baseline visual tests (Playwright):
   ```bash
   npm run test:visual
   ```
7. Update baselines only when a deliberate visual change is approved:
   ```bash
   npm run test:visual:update
   ```

---

## MCP Chrome DevTools Success Patterns (Nov 9, 2025)

**What Works Well with MCP:**

- ✅ Page navigation & loading (`navigate_page` with URL, back, forward, reload)
- ✅ DOM inspection & querying (`take_snapshot`, `list_console_messages`)
- ✅ Screenshots & visual regression (`take_screenshot` for full-page or element-specific)
- ✅ Form input & interaction (`fill`, `click`, `press_key`)
- ✅ Console message monitoring (`list_console_messages`)
- ✅ Network request interception & inspection (`list_network_requests`, `get_network_request`)
- ✅ JavaScript evaluation in page context (`evaluate_script`)
- ✅ Hover & drag interactions (`hover`, `drag`)

**What Works After Fixes:**

- ✅ WebSocket connections (with `--no-sandbox --disable-web-security` flags)
- ✅ Real-time protocol testing (confirmed with `new WebSocket()` evaluation)

**What Requires Workaround:**

- ⚠️ **Long-lived WebSocket connections**: Connections succeed but close immediately in remote Chrome context. Likely due to page reload/navigation patterns or connection validation timing. For now, test WebSocket connectivity once, then use HTTP polling for real-time data streams in MCP tests.

**MCP Configuration (Working):**

```bash
# Step 1: Start dev server
npm run dev:clean

# Step 2: Kill any stale Chrome/MCP processes
pkill -9 chrome chrome-devtools-mcp 2>/dev/null || true

# Step 3: Launch Chrome with security flags disabled (required for WebSocket)
/usr/bin/google-chrome \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --disable-web-security \
  --user-data-dir=~/.config/chrome-debug-profile &

# Step 4: Start MCP server (connects to Chrome on port 9222)
npm run mcp:chrome-devtools

# Step 5: Use chrome://inspect/#devices to configure port forwarding
# (In Chrome DevTools: Devices > Port forwarding > Add rule: localhost:3000 -> localhost:3000)
```

**Example MCP Workflows:**

### 1. Verify Page Loads & DOM Structure

```ts
// Navigate to dashboard
await mcp.navigate_page({ type: "url", url: "http://127.0.0.1:3000" });

// Take snapshot of DOM
const snapshot = await mcp.take_snapshot();
// snapshot contains all elements with UIDs for targeting

// Take visual screenshot
await mcp.take_screenshot({ fullPage: true, filePath: "/tmp/dashboard.png" });
```

### 2. Test Form Input & Button Clicks

```ts
// Navigate to mock page
await mcp.navigate_page({
  type: "url",
  url: "http://127.0.0.1:3000/client/mock",
});

// Fill BPM input
await mcp.fill({ uid: "3_12", value: "150" }); // UID from snapshot

// Click START button
await mcp.click({ uid: "3_19" });

// Wait for status to change
await mcp.wait_for({ text: "Connected", timeout: 5000 });

// Capture screenshot of result
await mcp.take_screenshot({ fullPage: true, filePath: "/tmp/streaming.png" });
```

### 3. Monitor Console for Errors

```ts
// Navigate to page
await mcp.navigate_page({ type: "url", url: "http://127.0.0.1:3000" });

// Wait for page to settle
await mcp.wait_for({ text: "Dashboard", timeout: 3000 });

// Check console for errors
const messages = await mcp.list_console_messages({ types: ["error", "warn"] });
if (messages.length > 0) {
  messages.forEach((msg) => console.log(`${msg.type}: ${msg.text}`));
}
```

### 4. Verify WebSocket Connectivity

```ts
// Navigate to page with WebSocket consumer
await mcp.navigate_page({ type: "url", url: "http://127.0.0.1:3000" });

// Test WebSocket in browser context
const result = await mcp.evaluate_script({
  function: `async () => {
    return new Promise((resolve) => {
      const ws = new WebSocket('ws://127.0.0.1:3000/ws');
      const timeout = setTimeout(() => {
        ws.close();
        resolve('⏱️ Timeout');
      }, 3000);
      
      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        resolve('✅ Connected!');
      };
      
      ws.onerror = () => {
        clearTimeout(timeout);
        resolve('❌ Error');
      };
    });
  }`,
});
// result: "✅ Connected!"
```

### 5. Inspect Computed Styles (Color Verification)

```ts
// Navigate and wait for HR tile to render
await mcp.navigate_page({ type: "url", url: "http://127.0.0.1:3000" });
await mcp.wait_for({ text: "00:00", timeout: 5000 });

// Evaluate computed background color
const bgColor = await mcp.evaluate_script({
  function: `(el) => {
    return window.getComputedStyle(el).backgroundColor;
  }`,
  args: [{ uid: "4_1" }], // HR tile container
});
// bgColor: "rgb(33, 150, 243)" or similar
```

### 6. Test Responsive Design

```ts
// Set mobile viewport
await mcp.resize_page({ width: 375, height: 667 });

// Take mobile screenshot
await mcp.take_screenshot({ fullPage: true, filePath: "/tmp/mobile.png" });

// Verify button visibility on mobile
const snapshot = await mcp.take_snapshot();
// Check if buttons are visible and properly sized
```

---

## Verification Checklist (Pre-Frontend Iteration)

Run these quickly before starting styling/perf changes:

- [ ] Dev server started and logs show `Ready on http://127.0.0.1:3000` & WS listening.
- [ ] `client/control` page shows Connected status pill.
- [ ] Mock HR stream updates dashboard BPM within <2.5s.
- [ ] Tabata START triggers phase transition & audio (work -> rest) in expected durations.
- [ ] Spotify card either shows "Awaiting Login..." or active track (post-auth).
- [ ] MCP Chrome server running (task or script) and can capture a screenshot.
- [ ] Playwright visual suite passes (`npm run test:visual`).
- [ ] CLS metric = 0 (see snippet below) or acceptably low (<0.01) if fonts pending.

If any fail: fix before UI refactors to avoid conflating regressions with earlier breakage.

---

## Automated Commands for Visual Consistency

These commands automate layout, component sizing, and real-time updates checks.

### 1. Test Responsiveness of Control Panel

| Goal                      | Command Logic (Playwright)                                                              | File Path Tested  |
| :------------------------ | :-------------------------------------------------------------------------------------- | :---------------- |
| Set Mobile Viewport       | `await page.setViewportSize({ width: 400, height: 750 });`                              | `/client/control` |
| Verify Timer Button Count | `expect(await page.locator('.MuiIconButton-root:visible').count()).toBeGreaterThan(3);` | `/client/control` |
| Visual Check              | `await expect(page).toHaveScreenshot('control-panel-mobile.png');`                      | `/client/control` |

### 2. Verify Real-Time Data Flow & Styling

| Goal                  | Command Logic (Playwright)                                                                                                                                                                     | File Path Tested |
| :-------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------- |
| Mock Data Input       | `await page.goto('http://127.0.0.1:3000/client/mock'); await page.fill('input[name="bpm"]', '170');`                                                                                           | `/client/mock`   |
| Start Stream          | `await page.click('button:text("START Continuous Stream")');`                                                                                                                                  | `/client/mock`   |
| Check Dashboard Color | `await page.goto('http://127.0.0.1:3000'); const hrColor = await page.locator('#hr-zone-box').evaluate(el => getComputedStyle(el).backgroundColor); expect(hrColor).toBe('rgb(239, 68, 68)');` | `/`              |

### 3. Ensure Tabata Timer Logic Updates

| Goal              | Command Logic (Playwright)                                                                                       | File Path Tested  |
| :---------------- | :--------------------------------------------------------------------------------------------------------------- | :---------------- |
| Start Timer       | `await page.goto('http://127.0.0.1:3000/client/control'); await page.click('button[aria-label="Start Timer"]');` | `/client/control` |
| Check WORK Phase  | `await page.goto('http://127.0.0.1:3000'); await expect(page.locator('#timer-phase')).toHaveText('WORK');`       | `/`               |
| Wait Transition   | `await page.waitForTimeout(32000); // 30s WORK + buffer`                                                         | `/`               |
| Verify REST Phase | `await expect(page.locator('#timer-phase')).toHaveText('REST');`                                                 | `/`               |

---

## CLI Tools for Build & Audit

1. **Visual Regression (Playwright)**: screenshot baselines after UX changes.
2. **Lighthouse CLI**: performance/accessibility snapshot.
   ```bash
   lighthouse http://127.0.0.1:3000 --view
   ```
3. **Chrome DevTools MCP**: deep protocol (WS frames, performance trace, console).

---

## Automated Performance & Layout Checks

### CLS Check

| Goal        | Strategy                                                                                                                   | Why                                                       |
| :---------- | :------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------- |
| Measure CLS | `const metrics = await page.evaluate(() => performance.getEntriesByType('layout-shift')); expect(metrics.length).toBe(0);` | Detects subtle layout jumps from late-loaded fonts/images |

### WebSocket Latency

| Goal                  | Strategy                                                | Why                                                  |
| :-------------------- | :------------------------------------------------------ | :--------------------------------------------------- |
| Round-trip <100–120ms | Intercept WS frames; measure send-to-STATE_UPDATE delta | Ensures real-time feel & server broadcast efficiency |

---

## Granular Visual Assertion & Styling

Peak Zone color should map to `#ef4444` (Tailwind red-500 equivalent) when BPM >= ~95% max.

---

## Automation for Spotify Login Flow

| Goal                  | Strategy                                       | Logic                                      |
| :-------------------- | :--------------------------------------------- | :----------------------------------------- |
| Verify token delivery | Listen for POST `/api/internal/token-delivery` | Confirms NextAuth JWT callback persistence |
| Polling started       | Delay 5s then assert NOW PLAYING has track     | Confirms `spotifyPolling.ts` active        |

---

## Example MCP-Driven Component Commands

Component Generation:

- "Create a new MUI component UserProfileCard with `<Avatar/>`, username, and `<Button/>`."
- "Generate LoginModal with email/password `<TextField>` and Submit button."
- "Add responsive AppBar + Drawer for mobile navigation."

Iteration & Styling:

- "Wrap UserProfileCard in `<Paper elevation={3}>`."
- "Change LoginModal submit button to `variant="contained"` and add loading spinner."
- "On xs screens make `<Stack>` direction column instead of row."

Debugging & Performance:

- "Add `<Skeleton>` to prevent CLS when avatar image loads."
- "Use React Profiler output: memoize Dashboard child components."
- "Implement DataGrid pagination or virtualization for large sets."
- "Review useState/event handler for click not updating state."

---

## Performance & Latency Snippets (Add to Playwright or MCP Scripts)

### Measure WebSocket Round-Trip Latency

```ts
const t0 = performance.now();
await page.goto("http://127.0.0.1:3000/client/mock");
await page.fill('input[name="bpm"]', "150");
await page.click("text=START Continuous Stream");
await page.goto("http://127.0.0.1:3000");
let latency;
page.on("websocket", (ws) => {
  ws.on("framereceived", (frame) => {
    try {
      const parsed = JSON.parse(frame.payloadData());
      if (parsed.type === "STATE_UPDATE") latency = performance.now() - t0;
    } catch {}
  });
});
expect(latency).toBeLessThan(120);
```

### Cumulative Layout Shift (CLS)

```ts
await page.goto("http://127.0.0.1:3000");
const layoutShiftCount = await page.evaluate(
  () =>
    performance
      .getEntriesByType("layout-shift")
      .filter((e) => !e.hadRecentInput).length
);
expect(layoutShiftCount).toBe(0);
```

### FPS / Render Stability Probe (Experimental)

```ts
const frames = await page.evaluate(async () => {
  let count = 0;
  const start = performance.now();
  return await new Promise((resolve) => {
    function step() {
      
      count++;
      if (performance.now() - start > 1000) resolve(count);
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
});
expect(frames).toBeGreaterThan(50);
```

---

## Frontend Improvement Targets (Short Horizon)

| Area             | Goal                       | Technique                           |
| ---------------- | -------------------------- | ----------------------------------- |
| Timer Re-renders | Reduce unnecessary updates | `React.memo` + derived props        |
| HR Tiles         | Smooth zone transitions    | CSS transition on background color  |
| Spotify Card     | Eliminate flicker          | Skeleton + retain previous state    |
| Mobile Layout    | Shorter vertical scroll    | Collapse presets + responsive Stack |
| Accessibility    | Improve contrast           | Lighthouse audit & tweak palette    |

---

## Chrome DevTools MCP WebSocket Fix (Nov 9, 2025) ✅

**Problem**: Remote Chrome via MCP couldn't establish WebSocket connections initially (timeout after 3s).

**Root Cause**: Standard sandbox restrictions + default security policies prevented WebSocket protocol upgrades.

**Solution**: Launch Chrome with `--no-sandbox --disable-web-security` for persistent debug sessions:

```bash
/usr/bin/google-chrome \
  --remote-debugging-port=9222 \
  --no-sandbox \
  --disable-web-security \
  --user-data-dir=~/.config/chrome-debug-profile &
```

**Then use `chrome://inspect/#devices`** to:

1. Configure port forwarding (localhost:3000 ↔ localhost:3000)
2. Manage persistent remote debugging sessions
3. Monitor WebSocket connections in real-time via DevTools

**Result**: ✅ ALL MCP capabilities now work

- ✅ HTTP requests (`fetch()`)
- ✅ WebSocket connections & streaming
- ✅ Page loads and renders
- ✅ Screenshots & visual regression
- ✅ DOM inspection & querying
- ✅ Console monitoring
- ✅ Real-time state verification
- ✅ Persistent sessions across reloads

---

## Next Actions (When Checklist Green)

1. Memoize `HrTile`, `TimerDisplay` and measure render counts.
2. Add zone color fade (250ms ease) for transitions.
3. Skeleton for Spotify track during immediate post-command poll.
4. Integrate WS latency assertion into visual regression suite.
5. Capture Lighthouse baseline & track deltas after each UX change.
6. Expose stable selectors for tests: add `id="hr-zone-box"` to HR tile root, `id="timer-phase"` on timer phase label, and `data-testid="spotify-card"` on the Spotify card container.

---

## Parking Lot / Deferred

- Dark mode toggle (after performance pass)
- HR trend graph (needs streaming buffer + downsample)
- Multi-user comparative heatmap panel

---

## Removal Criteria

Sections move out once formalized in permanent docs or implemented. Keep this file lean.

---

Future Areas to work on

1. make sure spotify volume controls are working
2. improve spotify control to help select the active device

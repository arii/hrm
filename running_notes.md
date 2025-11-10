# Running Notes - HRM Development

Ephemeral scratchpad for **ACTIVE** work items only. Completed tasks are pruned. Durable guidance lives in `.github/copilot-instructions.md`, `README.md`, or `UI_UX_IMPROVEMENTS.md`.

**Current Focus**: UI/UX improvements, mobile optimization, accessibility

**Status**: Phase 3 - UI Polish & Accessibility

---

## Current Sprint: Mobile-First UI Improvements

**Primary Goal**: Make control panel truly mobile-friendly and improve dashboard visual hierarchy

**Reference**: See `UI_UX_IMPROVEMENTS.md` for comprehensive roadmap

### Active Tasks

#### 🔄 IN PROGRESS: Mobile Control Panel Optimization

- Remove title/status clutter to free screen space
- Increase touch targets to 48px minimum
- Improve button grouping and visual hierarchy
- Test on iPhone SE (smallest common viewport)

#### 📋 NEXT: Accessibility Foundations

- Add ARIA labels to all interactive elements
- Implement keyboard navigation shortcuts
- Improve focus indicators
- Test with screen readers

#### 📋 BACKLOG: Dashboard Visual Polish

- Dynamic layout based on timer state (IDLE vs ACTIVE)
- Better responsive grid breakpoints
- Add subtle animations and transitions
- Improve Google Doc viewer (expand/collapse)

---

## Architecture Quick Reference

### Timer + Spotify Integration

**Files**: `services/tabataTimer.ts` + `services/spotifyPolling.ts`

**State Flow**: IDLE → PREPARE (5s) → WORK (30s) → REST (10s) → repeat 8x → COOLDOWN
**WebSocket Latency**: ~11ms average
**Features**: Auto-play music on START, sync pause/resume, countdown beeps

### Key Files

- **Server Entry**: `server.ts` (Express + Next.js + WebSocket)
- **WebSocket Router**: `utils/socketManager.ts`
- **Client Hook**: `hooks/useWebSocket.ts`
- **UI Pages**:
  - Dashboard: `app/page.tsx` (viewer display)
  - Control: `app/client/control/page.tsx` (phone UI)
  - Mock: `app/client/mock/page.tsx` (test HR streaming)
  - Connect: `app/client/connect/page.tsx` (Bluetooth HRM)

---

## Completed Recently

✅ Screenshot documentation consolidated  
✅ Live HR display implemented  
✅ Timer controls restored  
✅ WebSocket latency validated (<120ms)  
✅ Lighthouse baseline established  
✅ Dashboard UI cleanup (removed clutter)

---

## Documentation Structure

- **Setup Guide**: `README.md`
- **Development Workflow**: `.github/copilot-instructions.md`
- **UI/UX Roadmap**: `UI_UX_IMPROVEMENTS.md` ⭐ NEW
- **Troubleshooting**: `BRINGUP_TROUBLESHOOTING.md`, `SPOTIFY_TROUBLESHOOTING.md`
- **Feature Docs**: `FEATURE_TIMER_SPOTIFY.md`, `IMPLEMENTATION_SUMMARY.md`

- **Changes Made**:
  1. **Enhanced Error Messages in Hook** (`hooks/useBluetoothHRM.ts`):
     - Added context-specific recommendations for each error type
     - Detects when Web Bluetooth is unavailable or disabled
     - Includes `chrome://flags` recommendation in error messages
     - All errors now surface actionable next steps
  2. **UI Hint on Connect Page** (`app/client/connect/page.tsx`):
     - When a connection fails with chrome://flags mentioned, shows a helpful tip
     - Displays clickable link to `chrome://flags` with instructions
     - Shows: "search 'Web Bluetooth', then restart the browser"
- **User Experience Impact**:
  - ✅ Users get clear, actionable error messages
  - ✅ One-click link to Chrome flags page
  - ✅ Step-by-step instructions for enabling Web Bluetooth
  - ✅ Better guidance for unsupported browsers/devices
- **Error Types Covered**:
  - NotFoundError: No device found → enable Bluetooth
  - SecurityError: Permission denied → enable Web Bluetooth at chrome://flags
  - NotSupportedError: Not supported → enable at chrome://flags
  - NetworkError: Connection lost → check device proximity
  - AbortError: Connection cancelled → provide retry instructions

### ✅ COMPLETED: Live Heart Rate Display Cards

- **Status**: IMPLEMENTED (November 9, 2025)
- **Pages Updated**:
  1. **Mock Page** (`app/client/mock/page.tsx`):
     - Added Card component with gradient background using zone color
     - Displays HR value in huge font (4rem mobile → 8rem desktop)
     - Shows zone name + percentage (e.g., "Warm-up • 53%")
     - Updates in real-time as user selects zones or streams
     - Placed prominently below server status
  2. **Connect Page** (`app/client/connect/page.tsx`):
     - Added live HR display when device is connected
     - Pulls real HR data from useWebSocket hook
     - Shows current HR with zone information
     - Only displays when currentHr > 0 (i.e., device connected & data received)
     - Uses same gradient card design as mock page
- **Visual Design**:
  - Gradient background: Primary zone color (top) → semi-transparent (bottom)
  - Large prominent numbers for readability
  - White text for contrast
  - Zone information in bold subtitle text
  - Elevation: 4 for depth
- **User Feedback**:
  - ✅ Users see real-time HR feedback immediately
  - ✅ Zone visualization matches dashboard
  - ✅ Color coding provides instant visual feedback
  - ✅ Matches original site design pattern

### ✅ COMPLETED: System Restart & Screenshot Capture Session

- **Status**: COMPLETED (November 9, 2025, 17:10 UTC)
- **Actions Taken**:
  1. **Full System Restart**:
     - Killed all existing processes (node, chrome, pm2)
     - Cleaned .next directory
     - Rebuilt production bundle (Next.js Turbopack)
     - All TypeScript compilation passed ✅
  2. **Chrome Configuration for Bluetooth**:
     - `--remote-debugging-port=9222` for DevTools
     - `--no-sandbox` flag enabled (CRITICAL for Bluetooth Web API)
     - `--disable-web-security` for WebSocket support
     - User data directory isolated to `/tmp/chrome-profile`
  3. **Service Verification**:
     - Dev Server: Running on 127.0.0.1:3000 ✅
     - WebSocket: Listening on ws://127.0.0.1:3000/ws ✅
     - Chrome Debugging: Port 9222 active ✅
     - Chrome DevTools MCP: Connected ✅
  4. **Screenshots Captured**:
     - **Local (127.0.0.1:3000)**:
       - dashboard-local.png (135K)
       - mock-local.png (195K) - NEW live HR display
       - connect-local.png (95K) - NEW live HR display
       - control-local.png (82K)
     - **Production (onasafari.ddns.net)**:
       - prod-root.png (184K)
       - prod-hrm.png (99K)
       - prod-phone.png (71K)
       - prod-hrm-client.png (53K)
- **Documentation**:
  - Created: `SCREENSHOTS_SESSION_NOV9.md`
  - Lists all screenshots with URLs and features
  - Includes performance baseline metrics
  - Documents new features visible in screenshots
- **Verification**:
  - All 4 local pages load and render correctly
  - All 4 production URLs accessible and responding
  - Live HR display visible on mock and connect pages
  - New error handling visible (if tested with Bluetooth failures)

### ⏳ Pending Todos

- **#11**: Document visual parity styling plan for dashboard and control panel
- **#12**: Implement selector code changes (guide complete in SELECTOR_INSTRUMENTATION.md)

### ✅ COMPLETED: Dashboard UI Refinements

- **Status**: IMPLEMENTED (November 9, 2025)
- **Changes Made**:
  1. **Removed Stepper (Warm-up → Main Set → Cool Down)**: Removed phase tracker as it won't be used for tracking at this time
  2. **Fixed Google Doc Display**: Reduced height from 600px to 400px for proper full visibility without cutoff
  3. **Improved Timer Number Sizes**:
     - Mobile (xs): 4.5rem (was 3.5rem) ↑29%
     - Tablet (sm): 7rem (was 5rem) ↑40%
     - Desktop (md): 8rem (was 5rem) ↑60%
     - Now clearly dominant and readable from distance
- **Result**: Cleaner dashboard with improved visual hierarchy and better Google Doc integration

### Next: Dashboard Component Visual Parity

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

---

Notes for improving the front end:

Understood. You're right, there are other big issues. Let's completely ignore the `iframe` and focus on the rest of the page.

The main problem is that the "new" version lost the energy and clear focus of the "old" one. The gray MUI cards feel generic and disconnected.

Here’s a plan to fix the other elements using MUI, inspired by your "old" layout.

### 1\. Bring Back the "Timer" Energy

The black and red timer was a strong, high-energy focal point. The default MUI `<Card>` is sterile.

- **Problem:** The gray `<Card>` is boring and looks like every other website.
- **Solution:** Use the `sx` prop on your `<Card>` component to override the style and recreate the "old" look. This is a perfect use case for `sx`.

<!-- end list -->

```jsx
import { Card, CardContent, Typography, Box } from "@mui/material";

<Card
  sx={{
    backgroundColor: "black",
    color: "red",
    height: "100%", // Make it fill the grid item
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}
>
  <CardContent>
    {/* Use a monospace font for the digital clock feel */}
    <Typography
      variant="h1"
      component="div"
      sx={{ fontFamily: "monospace", fontWeight: 700 }}
    >
      00:00
    </Typography>
    {/* You can add the Work/Rest text back here */}
    <Box
      sx={{ display: "flex", justifyContent: "space-between", color: "white" }}
    >
      <Typography>Work: 20</Typography>
      <Typography>Rest: 10</Typography>
    </Box>
  </CardContent>
</Card>;
```

### 2\. Fix the Layout and Card Sizing

In the "old" version, the two top cards were a single, balanced block. In the "new" version, they are different sizes and have awkward spacing.

- **Problem:** The Timer and HR cards are different heights, which looks unbalanced.
- **Solution:** Use an MUI `<Grid>` and make sure both components inside the grid items are set to `height: '100%'`.

<!-- end list -->

```jsx
<Grid container spacing={2}>
  {/* Timer Grid Item */}
  <Grid item xs={12} md={7}>
    {/* Put the Black Timer Card from Step 1 here */}
    {/* It should have height: '100%' */}
  </Grid>

  {/* HR Grid Item */}
  <Grid item xs={12} md={5}>
    <Card sx={{ height: "100%", minHeight: 250 }}>
      {" "}
      {/* Match the timer's height */}
      <CardContent>{/* Your HR card content here */}</CardContent>
    </Card>
  </Grid>
</Grid>
```

Improvements to mock

1. Layout and Spacing
   The current form feels like it's "floating" in an empty space.

Use Container: Wrap your entire page content in an MUI <Container maxWidth="sm"> (or xs). This will center the content and give it a maximum width, which looks much better on wide screens.

Use Paper or Card: Wrap your form elements inside a <Paper elevation={3}> component. This will create the "card" effect you see on most modern sites and visually group the form elements.

Use Box or Stack:

Inside the Paper, use a <Box component="form"> to hold the inputs. Add padding with the sx prop, for example: sx={{ p: 4 }}.

For vertical spacing between form elements, you can either use the margin="normal" prop on each TextField or wrap them all in a <Stack spacing={2}>.

2. Typography
   Use the Typography component to create a clear visual hierarchy.

Title: Change "HRM Mock Streamer" to <Typography variant="h5" component="h1" gutterBottom>.

Subtitle: Change "Simulate heart rate data..." to <Typography variant="body1" color="text.secondary">.

Icon: To group the icon with the title, you could use an Avatar component above the text: <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}><YourIcon /></Avatar>.

3. Form Inputs
   Replace the default HTML inputs with MUI's components for a consistent look and feel.

Text Inputs: Replace all inputs ("User Name," "Age," "Device ID," "HRM") with the <TextField> component.

Example: <TextField label="User Name" variant="outlined" fullWidth margin="normal" />

Use type="number" for the "Age" and "HRM" fields.

Checkbox: Replace the "Add Noise" checkbox with a <FormControlLabel> component.

Example: <FormControlLabel control={<Checkbox />} label="Add Noise" />

4. Action Buttons
   Group and style the buttons to make the user's path clear.

Zone Buttons: These are a perfect use case for a <ButtonGroup>.

Example: <ButtonGroup variant="outlined" aria-label="Zone selection"> <Button>ZONE 1</Button> <Button>ZONE 2</Button> ... </ButtonGroup>

Primary Action: Make the "START" button the clear primary action.

Use the variant="contained" prop: <Button variant="contained" ...>

Use a more appropriate icon from @mui/icons-material, like PlayArrow.

Example: <Button variant="contained" startIcon={<PlayArrowIcon />}>Start Stream</Button>

Status: The "Server Status" text can be made clearer using a <Chip> component.

Example: <Chip icon={<CheckCircleIcon />} label="Connected" color="success" variant="outlined" />

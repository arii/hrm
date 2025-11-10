# Running Notes - HRM Development

Ephemeral scratchpad for **ACTIVE** work items only. Completed tasks are pruned. Durable guidance lives in `.github/copilot-instructions.md`, `README.md`, `UI_UX_IMPROVEMENTS.md`, and `DESIGN_SYSTEM_IMPLEMENTATION.md`.

**Current Focus**: Design System Implementation & UI Consistency  
**Status**: Phase 3 - UI Polish & Accessibility  
**Date**: November 9, 2025

---

## 🎯 Current Sprint: Design System Rollout

**Goal**: Apply the new MUI theme (`lib/theme.ts`) to all pages for visual consistency.

### ✅ Completed (Nov 9, 2025)

- Created comprehensive MUI theme with 8px grid, typography scale, color palette
- Integrated ThemeProvider globally in Providers.tsx
- Applied theme to Dashboard (app/page.tsx) - responsive spacing, theme colors
- **Added Spotify Web Playback SDK to Dashboard** - Browser player now active on viewer/projector
- Created DESIGN_SYSTEM_IMPLEMENTATION.md documentation
- Updated TimerDisplay to black (#000000) with red (#EF4444) text and glow effects
- Refactored Control Panel for mobile-first (removed clutter, sticky timer, better spacing)

### 🔄 Next Up: Page Refactors

1. **Mock Page** (`app/client/mock/page.tsx`)

   - Wrap in Container
   - Replace HTML inputs with MUI TextField
   - Use ButtonGroup for zones
   - Apply theme consistently

2. **Connect Page** (`app/client/connect/page.tsx`)

   - Add Card structure
   - Use theme button styles
   - Better spacing and visual hierarchy

3. **Components** (TimerDisplay, HrTile, etc.)
   - Use theme spacing/colors instead of hardcoded values
   - Ensure consistent shadows and border radius

---

## 🔧 Quick Reference

### Architecture

- **Server Entry**: `server.ts` (Express + Next.js + WebSocket)
- **WebSocket Router**: `utils/socketManager.ts`
- **Client Hook**: `hooks/useWebSocket.ts`
- **Theme**: `lib/theme.ts` (NEW - use for all styling!)

### Key Commands

```bash
npm run dev:clean              # Start dev server
npm run test:visual            # Run visual regression tests
npm run test:visual:update     # Update baselines after approved changes
npm run mcp:chrome-devtools    # Start Chrome DevTools MCP
```

### Color Reference (from `utils/visualization.ts`)

- Grey: Below Z1 (#9E9E9E)
- Blue: Warm-up (#2196F3) - also theme secondary
- Green: Fat Burn (#4CAF50) - also theme success
- Yellow: Cardio (#FFEB3B) - also theme warning
- Red: Peak (#F44336) - also theme primary
- Purple: Max (#9C27B0)

### Timer Phase Colors

- WORK: Red (#ef4444)
- REST: Green (#22c55e)
- COOLDOWN: Blue (#3b82f6)
- IDLE: Grey (#6b7280)

---

## 📝 Active Notes

### Spotify Web Playback SDK Integration ✅

**Architecture Fix Completed**: Moved Spotify Web Playback SDK from control panel to dashboard

- **Dashboard (app/page.tsx)**: Now imports and uses `useSpotifyWebPlayback` hook
- **Browser Player Status**: Displays indicator when player is ready ("🎵 Browser Player Active")
- **Error Handling**: Shows warning badge if player encounters errors
- **Device ID**: Available for future integration with playback controls
- **Audio Streaming**: Music now plays from viewer/projector device, not phone
- **Login/Logout Buttons**: Added to dashboard Spotify bar (bottom fixed bar)

**Why This Matters**:

- Dashboard = Main display (projector/monitor) where audio should play
- Control Panel = Mobile phone for sending commands only
- Proper separation of concerns: viewer streams audio, controller sends commands
- Login/logout accessible from both dashboard and control panel

**Bug Fixed**: Control panel `useEffect` dependency warning for `spotifyLoggedIn` resolved by adding `spotifyData.trackName` to dependency array.

### Timer Display Update ✅

- Changed TimerDisplay background to pure black (#000000)
- Changed timer text to bright red (#EF4444) with glow effect
- Added subtle border and glowing phase indicator
- Matches original high-energy design

### Control Panel Mobile-First Refactor ✅

**File**: `app/client/control/page.tsx` (523 lines)

**Completed Changes**:

1. **Removed Clutter**

   - Removed "Workout Control Center" title
   - Removed "Server Status" indicator badge
   - More screen space for controls

2. **Sticky Timer Card**

   - Background: `#000000` (pure black)
   - Text color: `#EF4444` (bright red with glow)
   - Position: `sticky, top: 16, zIndex: 1000`
   - Stays visible while scrolling

3. **Touch Targets**

   - All IconButtons: adequate padding (p: 3)
   - START/STOP buttons: minHeight: 48, py: 3
   - Optimized for mobile use

4. **Better Spacing**
   - Container: `py: { xs: 2, sm: 3 }` (reduced from py: 8)
   - Added: `px: { xs: 2, sm: 3 }`
   - Background: `background.default` from theme

**Note**: File has good mobile accessibility - buttons are 48px+, proper ARIA labels, keyboard shortcuts implemented.

### Design System Usage Patterns

```tsx
// Use theme spacing (8px grid)
<Box sx={{ p: 3, mt: 2 }} /> // padding: 24px, marginTop: 16px

// Responsive spacing
<Container sx={{ py: { xs: 2, md: 4 } }} />

// Theme colors
<Button sx={{ backgroundColor: 'primary.main' }} />

// Shadows
<Card sx={{ boxShadow: 3 }} />
```

### Touch Target Checklist

- All buttons: min 48px height ✓ (enforced by theme)
- IconButtons: min 48x48px ✓ (enforced by theme)
- Form inputs: adequate spacing for mobile
- Grid items: proper spacing between interactive elements

---

## 🚀 Performance Baseline (Lighthouse)

**Dashboard (127.0.0.1:3000)**:

- LCP: 880ms ✅
- INP: 5ms ✅
- CLS: 0.00 ✅

**Target**: Maintain Core Web Vitals during UI refactors.

---

## 🧪 Testing Before Major Changes

Quick verification checklist:

- [ ] Dev server running: `npm run dev:clean`
- [ ] WebSocket connected: Check browser console
- [ ] Mock HR streaming works: Test on `/client/mock`
- [ ] Timer controls work: Test on `/client/control`
- [ ] Spotify integration (if configured): Check `/api/debug/auth-check`

---

## 🐛 Current Known Issues

None - system is stable. Build passing, no errors.

---

## 📚 Documentation Structure

- **Setup**: `README.md`
- **Development**: `.github/copilot-instructions.md`
- **UI/UX Roadmap**: `UI_UX_IMPROVEMENTS.md`
- **Design System**: `DESIGN_SYSTEM_IMPLEMENTATION.md` ⭐ NEW
- **Troubleshooting**: `BRINGUP_TROUBLESHOOTING.md`, `SPOTIFY_TROUBLESHOOTING.md`

---

## 💡 Future Areas (Parking Lot)

- Spotify volume controls verification
- Spotify active device selection
- Dark mode toggle
- HR trend graph (streaming buffer + downsample)
- Multi-user comparative heatmap

---

## 🗑️ Removal Criteria

Notes move out of this file when:

- Formalized in permanent documentation
- Completed and no longer actionable
- Superseded by newer information

Keep this file **lean and actionable**.

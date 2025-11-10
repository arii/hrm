# UI/UX Improvements Roadmap

**Last Updated**: November 9, 2025  
**Status**: 🔄 Active Development  
**Priority**: High - User Experience & Accessibility

---

## Executive Summary

Current UI has functional issues with **visual hierarchy**, **mobile responsiveness**, and **accessibility**. The control panel (phone UI) needs mobile optimization, the dashboard needs better visual balance, and both need improved accessibility standards.

**Key Problems**:

- Control panel not optimized for mobile (primary use case)
- Dashboard layout wastes space and has poor visual hierarchy
- Accessibility features missing (ARIA labels, keyboard nav, screen reader support)
- Typography and spacing inconsistent
- Color contrast issues in some zones

---

## Priority 1: Mobile-First Control Panel (CRITICAL)

### Current Issues

- Desktop-centric layout (maxWidth="xs" but not truly mobile-optimized)
- Touch targets too small for finger interaction
- Excessive vertical scrolling required
- Status badges and labels waste screen space
- Volume slider not connected to functionality
- Device selector adds complexity without clear value

### Actionable Tasks

#### Task 1.1: Optimize Touch Targets

**File**: `app/client/control/page.tsx`
**Changes**:

- Increase button min-height to 48px (Apple HIG/Material guideline)
- Add more padding to buttons: `py: 2` → `py: 3`
- Increase slider thumb size for easier dragging
- Add more spacing between interactive elements (mb: 3 → mb: 4)

**Code Example**:

```tsx
<Button
  variant="contained"
  size="large"
  fullWidth
  sx={{
    minHeight: 48,
    py: 3,
    fontSize: "1.125rem",
    fontWeight: 600,
  }}
>
  START
</Button>
```

#### Task 1.2: Simplify Layout - Remove Clutter

**File**: `app/client/control/page.tsx`
**Changes**:

- Remove "Server Status" badge (replace with subtle connection indicator)
- Remove "Workout Control Center" title (wasted space)
- Move timer config to collapsible accordion (hide when not needed)
- Remove or hide device selector by default
- Make volume slider a compact icon button with popover

**Priority**: Start with removing title and status badge

#### Task 1.3: Improve Timer Display Visibility

**File**: `app/client/control/page.tsx`
**Changes**:

- Make timer card sticky at top of viewport during scroll
- Increase timer font size (currently too small for mobile)
- Use high-contrast colors for phase indicators
- Add haptic feedback simulation (vibration API for phase changes)

#### Task 1.4: Better Button Grouping

**File**: `app/client/control/page.tsx`
**Changes**:

- Group START/PAUSE/STOP in a prominent button group
- Use icon buttons with labels for Spotify controls
- Add visual separation between timer and music controls
- Consider bottom navigation bar for primary actions

#### Task 1.5: Responsive Spacing

**File**: `app/client/control/page.tsx`
**Changes**:

```tsx
<Container
  maxWidth="xs"
  sx={{
    py: { xs: 2, sm: 4 }, // Less padding on mobile
    px: { xs: 2, sm: 3 },
    minHeight: "100vh",
    backgroundColor: "grey.100"
  }}
>
```

---

## Priority 2: Dashboard Visual Hierarchy

### Current Issues

- Timer dominates but Spotify bar still visible when idle
- Google Doc takes too much vertical space
- HR tiles hidden when no data (good) but layout shifts
- No clear visual flow or focal point
- Excessive whitespace in some areas, cramped in others

### Actionable Tasks

#### Task 2.1: Dynamic Layout Based on State

**File**: `app/page.tsx`
**Changes**:

- Show Google Doc prominently when timer is IDLE
- Shrink/hide doc when timer is ACTIVE (show just title + expand button)
- Enlarge timer card when ACTIVE phase
- Create visual hierarchy: Timer → HR Tiles → Music → Doc

#### Task 2.2: Improve Grid Responsiveness

**File**: `app/page.tsx`
**Current**: Timer takes 7 columns, HR tiles take 5
**Better**:

```tsx
{/* Timer - full width on mobile, 60% on desktop */}
<Grid item xs={12} lg={7}>
  <TimerDisplay ... />
</Grid>

{/* HR Tiles - full width on mobile, 40% on desktop */}
{hrmData.length > 0 && hrmData
  .filter(...)
  .map((user) => (
    <Grid item xs={12} sm={6} lg={5} key={user.clientId}>
      <HrTile ... />
    </Grid>
  ))}
```

#### Task 2.3: Compact Spotify Display Further

**File**: `app/page.tsx`
**Changes**:

- Only show when music is actually playing
- Use a minimal floating bar (position: fixed, bottom: 0)
- Or integrate into timer card when active
- Add dismiss/minimize button

#### Task 2.4: Add Visual Focal Points

**File**: `app/page.tsx`
**Changes**:

- Use MUI elevation/shadows to create depth
- Animate timer phase transitions (subtle pulse on phase change)
- Add subtle background gradient or pattern
- Highlight active elements with border/glow

---

## Priority 3: Accessibility (WCAG 2.1 AA Compliance)

### Current Issues

- Missing ARIA labels on interactive elements
- Color contrast issues in some HR zones
- No keyboard navigation support
- Screen reader support incomplete
- Focus indicators weak or missing

### Actionable Tasks

#### Task 3.1: Add ARIA Labels

**Files**: All component files
**Changes**:

```tsx
// Timer buttons
<Button
  aria-label={`${command} timer`}
  onClick={() => sendTimerCommand(command)}
>
  {command}
</Button>

// HR Tiles
<Card
  role="region"
  aria-label={`Heart rate monitor for ${name}: ${bpm} beats per minute, ${percentMax}% of maximum`}
>
  ...
</Card>

// Timer Display
<Typography
  component="div"
  role="timer"
  aria-live="polite"
  aria-atomic="true"
>
  {pad(mm)}:{pad(ss)}
</Typography>
```

#### Task 3.2: Improve Color Contrast

**File**: `utils/visualization.ts`
**Changes**:

- Audit all zone colors against WCAG AA standards (4.5:1 for normal text)
- Ensure white text readable on all zone backgrounds
- Add fallback patterns/textures for colorblind users
- Consider adding a "high contrast mode" toggle

**Test Tool**: Use https://webaim.org/resources/contrastchecker/

#### Task 3.3: Keyboard Navigation

**Files**: `app/client/control/page.tsx`, `app/page.tsx`
**Changes**:

- Add keyboard shortcuts (Space = START/PAUSE, S = STOP, etc.)
- Implement focus trap in modal dialogs
- Add visible focus indicators (outline with high contrast)
- Support Tab navigation through all interactive elements

**Example**:

```tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.code === "Space" && !e.repeat) {
      e.preventDefault();
      sendTimerCommand(timerData.currentPhase === "IDLE" ? "START" : "PAUSE");
    }
    if (e.code === "KeyS" && e.ctrlKey) {
      e.preventDefault();
      sendTimerCommand("STOP");
    }
  };

  window.addEventListener("keydown", handleKeyPress);
  return () => window.removeEventListener("keydown", handleKeyPress);
}, [timerData.currentPhase]);
```

#### Task 3.4: Screen Reader Optimization

**Files**: All components
**Changes**:

- Add `sr-only` utility class for screen-reader-only text
- Announce timer phase changes with `aria-live` regions
- Provide text alternatives for icons and visual indicators
- Add skip links for navigation

#### Task 3.5: Focus Management

**Files**: All interactive components
**Changes**:

```tsx
// Enhance focus indicators
sx={{
  '&:focus-visible': {
    outline: '3px solid',
    outlineColor: 'primary.main',
    outlineOffset: '2px',
  }
}}
```

---

## Priority 4: Component-Level Improvements

### Task 4.1: TimerDisplay Component

**File**: `components/TimerDisplay.tsx`
**Current Issues**:

- Phase dot too small
- No animation on phase transitions
- Colors could be more distinctive

**Changes**:

```tsx
// Larger, animated phase indicator
<Box
  sx={{
    width: 16,
    height: 16,
    borderRadius: "50%",
    backgroundColor: phase === "WORK" ? "error.main" : "success.main",
    animation: "pulse 2s ease-in-out infinite",
    "@keyframes pulse": {
      "0%, 100%": { opacity: 1 },
      "50%": { opacity: 0.5 },
    },
  }}
/>
```

### Task 4.2: HrTile Component

**File**: `components/HrTile.tsx`
**Changes**:

- Add subtle animation when BPM updates
- Improve name display (truncate long names with ellipsis)
- Add tooltip with full user info on hover
- Consider adding a small trend indicator (↑↓→)

### Task 4.3: GoogleDocViewer Component

**File**: `components/GoogleDocViewer.tsx`
**Changes**:

- Add expand/collapse button
- Show preview mode with scroll indicator
- Make height responsive to viewport
- Add loading skeleton while iframe loads

---

## Priority 5: Performance & Polish

### Task 5.1: Reduce Layout Shifts

**Files**: `app/page.tsx`, component files
**Changes**:

- Reserve space for HR tiles even when empty (skeleton loaders)
- Set explicit dimensions on images/iframes
- Use `aspect-ratio` CSS property
- Preload fonts to prevent FOUT

### Task 5.2: Add Loading States

**Files**: All components
**Changes**:

- Skeleton screens for initial load
- Loading spinners for async operations
- Optimistic UI updates (show change immediately, rollback if error)

### Task 5.3: Add Error Boundaries

**Files**: New error boundary components
**Changes**:

- Wrap major sections in error boundaries
- Provide user-friendly error messages
- Add retry mechanisms
- Log errors for debugging

### Task 5.4: Improve Animations

**Files**: All components
**Changes**:

- Add `prefers-reduced-motion` media query support
- Use CSS transitions for state changes
- Keep animations subtle and purposeful
- Max 200-300ms duration for most animations

---

## Testing Checklist

### Mobile Testing

- [ ] Test on iPhone SE (375x667) - smallest common viewport
- [ ] Test on iPhone 14 Pro Max (430x932)
- [ ] Test on Android devices (various sizes)
- [ ] Test landscape orientation
- [ ] Test with browser chrome visible (reduces viewport)
- [ ] Test with iOS Safari toolbar behavior (shrinks/expands)

### Accessibility Testing

- [ ] Run Lighthouse accessibility audit (target: 95+)
- [ ] Test with screen reader (NVDA/JAWS on Windows, VoiceOver on Mac/iOS)
- [ ] Test keyboard-only navigation
- [ ] Test with high contrast mode
- [ ] Test with 200% zoom
- [ ] Use axe DevTools for automated checks

### Cross-Browser Testing

- [ ] Chrome (desktop & mobile)
- [ ] Safari (desktop & mobile)
- [ ] Firefox
- [ ] Edge
- [ ] Test with browser extensions disabled

### Performance Testing

- [ ] Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Test on slow 3G connection
- [ ] Test with CPU throttling
- [ ] Measure bundle size (aim for < 200KB initial JS)

---

## Implementation Strategy

### Phase 1: Mobile Control Panel (Week 1)

1. Remove title/status clutter (Task 1.2)
2. Increase touch targets (Task 1.1)
3. Improve button grouping (Task 1.4)
4. Test on real devices

### Phase 2: Accessibility Basics (Week 1-2)

1. Add ARIA labels (Task 3.1)
2. Keyboard shortcuts (Task 3.3)
3. Focus indicators (Task 3.5)
4. Run accessibility audits

### Phase 3: Dashboard Polish (Week 2)

1. Dynamic layout (Task 2.1)
2. Grid responsiveness (Task 2.2)
3. Visual hierarchy (Task 2.4)
4. Test on various screen sizes

### Phase 4: Component Refinements (Week 3)

1. Timer animations (Task 4.1)
2. HR tile improvements (Task 4.2)
3. Doc viewer enhancements (Task 4.3)
4. Performance optimization (Task 5.1-5.4)

---

## Success Metrics

- [ ] Mobile Lighthouse score > 95 (Performance, Accessibility, Best Practices)
- [ ] Zero keyboard navigation blockers
- [ ] WCAG 2.1 AA compliant
- [ ] Zero console errors
- [ ] < 1s page load on 4G
- [ ] Positive user testing feedback on mobile control panel
- [ ] All touch targets ≥ 48x48px

---

## Related Documentation

- **Setup**: `README.md`
- **Architecture**: `.github/copilot-instructions.md`
- **Troubleshooting**: `BRINGUP_TROUBLESHOOTING.md`, `SPOTIFY_TROUBLESHOOTING.md`
- **Current Status**: `running_notes.md`

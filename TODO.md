# Dashboard Visual Parity - TODOs

This document outlines the tasks required to enhance the dashboard's visual parity with the legacy design.

## High-Level Steps:

- [ ] **Analyze Original Screenshot:**
    - [ ] Carefully compare the current dashboard with `screenshots/original_site_screenshots/image-176267969980.png` to identify precise visual discrepancies in layout, typography, colors, and component sizing.
- [ ] **HR Tile Refinement (`components/HrTile.tsx` and `app/page.tsx`):**
    - [ ] Modify `components/HrTile.tsx` to accept HR zone data and apply corresponding background colors.
    - [ ] Update `app/page.tsx` to pass HR zone information to `HrTile` using `utils/visualization.ts`.
    - [ ] Adjust CSS/MUI styling for font size, weight, and layout of percentage, BPM, and name.
    - [ ] Ensure sufficient contrast (> 4.5:1) for white text over colored tiles.
- [ ] **Tabata Timer Review (`components/TimerDisplay.tsx` and `app/page.tsx`):**
    - [ ] Verify `components/TimerDisplay.tsx` styling against legacy design for 7-segment font and phase tints.
    - [ ] Ensure `app/page.tsx` correctly passes timer state for phase labels and colors.
- [ ] **Workout Columns Implementation (`components/WorkoutColumns.tsx` and `app/page.tsx`):**
    - [ ] Create or update `components/WorkoutColumns.tsx` to use MUI Grid for proper alignment and responsiveness.
    - [ ] Apply appropriate typography styles and implement scrollable containers for content overflow.
    - [ ] Integrate `WorkoutColumns` into `app/page.tsx`.
- [ ] **Global Layout Adjustments (`app/page.tsx`):**
    - [ ] Modify the main layout in `app/page.tsx` to arrange `TimerDisplay`, `HrTile`, `WorkoutColumns`, and the Spotify component according to the desired grid proportions and spacing.

## Verification Steps:

- [ ] **Visual Inspection:** Manually compare the updated dashboard with the original site screenshot.
- [ ] **Playwright Visual Tests:** Update existing or create new Playwright visual tests (`npm run test:visual`) to capture screenshots of the refined dashboard and compare them against approved baselines.
- [ ] **Computed Styles:** Use Chrome DevTools MCP or Playwright to verify computed styles (e.g., `backgroundColor`, `fontSize`) of key elements against the specified color palette and typography requirements.
- [ ] **Accessibility:** Conduct a quick Lighthouse audit to ensure contrast ratios are met.

# Code Review Assessment

This document outlines actionable steps for improving the dashboard's visual appearance.

## Actionable Steps

1.  **Enhance Dashboard Visual Parity:**
    *   **Objective:** To visually align the current dashboard (`app/page.tsx`) with the legacy design, focusing on key elements like the HR Tile, Tabata Timer, and Workout Columns, as depicted in `screenshots/original_site_screenshots/image-176267969980.png` and described in `running_notes.md`.
    *   **Key Areas for Improvement:**
        *   **HR Tile (`components/HrTile.tsx` and `app/page.tsx`):**
            *   **Dynamic Background Colors:** Implement background colors for the HR percentage tile based on HR zones. Utilize `utils/visualization.ts` to map HR values to specific colors (e.g., Grey, Blue, Green, Yellow, Red, Purple). The current image shows a plain white background, which needs to be replaced with the appropriate zone color.
            *   **Typography and Layout:** Ensure the HR percentage is displayed prominently with a "huge percent font" (>= 9rem on medium screens). Integrate the raw BPM and potentially the user's name ("Ari" from the current image) in a clear, readable manner, consistent with the legacy design.
            *   **Styling:** Apply minimal shadow, square edges, and ensure white text over colored tiles has sufficient contrast (> 4.5:1).
        *   **Tabata Timer (`components/TimerDisplay.tsx` and `app/page.tsx`):**
            *   **7-Segment Style Digits:** The current timer already uses a large red digital display. Verify that it matches the "large 7-segment style digits in a black card" requirement. If a true 7-segment font isn't available, ensure the CSS alternative provides a similar aesthetic.
            *   **Phase Labels and Tints:** Ensure "Work:20" and "Rest:10" labels, along with other phase labels (WORK/REST/COOLDOWN/IDLE), match the typography and background tints of the legacy styling. Refer to the `running_notes.md` for specific color codes (e.g., WORK: `#ef4444`, REST: `#22c55e`).
        *   **Workout Columns (`components/WorkoutColumns.tsx` and `app/page.tsx`):**
            *   **MUI Grid Layout:** Refactor the layout of workout exercises to use MUI Grid components for proper alignment and responsiveness. The current image shows basic text in simple boxes, which needs to be structured into "five columns with large font."
            *   **Typography and Scrolling:** Apply larger, more readable fonts for the exercise descriptions. Implement vertical scrolling for individual columns if the content exceeds the visible area, consistent with the legacy design.
        *   **Overall Layout and Spacing (`app/page.tsx`):**
            *   **Proportions:** Adjust the grid and spacing of the main components (Timer, HR Tile, Workout Columns, Spotify Card) to achieve the desired visual hierarchy and proportions seen in the original site screenshots. The goal is to match the "Grid similar to legacy proportions: Timer left, 2-3 tiles across, secondary row with details + Spotify."
    *   **Implementation Strategy:**
        *   **Step 1: Analyze Original Screenshot:** Carefully compare the current dashboard with `screenshots/original_site_screenshots/image-176267969980.png` to identify precise visual discrepancies in layout, typography, colors, and component sizing.
        *   **Step 2: HR Tile Refinement:**
            *   Modify `components/HrTile.tsx` to accept HR zone data and apply corresponding background colors.
            *   Update `app/page.tsx` to pass HR zone information to `HrTile` using `utils/visualization.ts`.
            *   Adjust CSS/MUI styling for font size, weight, and layout of percentage, BPM, and name.
        *   **Step 3: Tabata Timer Review:**
            *   Verify `components/TimerDisplay.tsx` styling against legacy design for 7-segment font and phase tints.
            *   Ensure `app/page.tsx` correctly passes timer state for phase labels and colors.
        *   **Step 4: Workout Columns Implementation:**
            *   Create or update `components/WorkoutColumns.tsx` to use MUI Grid.
            *   Apply appropriate typography styles and implement scrollable containers for content overflow.
            *   Integrate `WorkoutColumns` into `app/page.tsx`.
        *   **Step 5: Global Layout Adjustments:**
            *   Modify the main layout in `app/page.tsx` to arrange `TimerDisplay`, `HrTile`, `WorkoutColumns`, and the Spotify component according to the desired grid proportions and spacing.
    *   **Verification:**
        *   **Visual Inspection:** Manually compare the updated dashboard with the original site screenshot.
        *   **Playwright Visual Tests:** Update existing or create new Playwright visual tests (`npm run test:visual`) to capture screenshots of the refined dashboard and compare them against approved baselines.
        *   **Computed Styles:** Use Chrome DevTools MCP or Playwright to verify computed styles (e.g., `backgroundColor`, `fontSize`) of key elements against the specified color palette and typography requirements.
        *   **Accessibility:** Conduct a quick Lighthouse audit to ensure contrast ratios are met.

## Guidelines for Applying Actionable Steps

To prevent errors during the implementation of these actionable steps, please adhere to the following guidelines:

1.  **Read Before You Write:** Always read the target file's content (`read_file`) immediately before attempting any modification. This ensures you have the most up-to-date context and can accurately construct `old_string` and `new_string` for `replace` operations.
2.  **Verify `old_string` Precisely:** When using the `replace` tool, the `old_string` parameter must be an *exact literal match* of the text to be replaced, including all whitespace, indentation, and surrounding code. If the `old_string` does not match precisely, the tool will fail. Always include sufficient context (e.g., 3 lines before and after) to ensure uniqueness and accuracy.
3.  **Break Down Complex Changes:** For larger or more intricate modifications, break them down into multiple, smaller, atomic `replace` operations. This reduces the risk of errors and makes debugging easier. For example, instead of replacing an entire function, replace parts of it in sequence.
4.  **Review Tool Output:** Carefully examine the output of every tool call, especially `replace`. Confirm that the modification was successful and as intended. If a tool reports an error or an unexpected outcome, stop and re-evaluate your approach.
5.  **Understand Imports vs. Definitions:** Be mindful of the difference between importing a type/interface and defining it. When centralizing definitions, ensure that the original definitions are removed and replaced with correct import statements.
6.  **Test Incrementally:** After applying each significant change, consider running relevant tests or performing a quick manual check to ensure the change hasn't introduced regressions.

## Completion Checklist

- [ ] 1. Enhance Dashboard Visual Parity

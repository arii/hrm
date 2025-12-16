# Performance Analysis Report: Google Doc Viewer Dynamic Layout

**Issue:** [#1662](https://github.com/ari-a/H.R.M/issues/1662)
**Author:** Jules
**Date:** 2023-12-16

## 1. Executive Summary

This report details the performance analysis of the main dashboard, with a specific focus on the dynamic layout of the `GoogleDocViewer` component. The investigation was initiated to identify any performance bottlenecks, such as jank or excessive layout shifts, that could be caused by the component's resizing behavior.

The analysis was conducted using a Playwright script to automate and trace key user interactions, including page load, viewport resizing, and the shrinking and expanding of the `GoogleDocViewer`.

**Key Findings:**
The performance tracing revealed **no significant performance bottlenecks or user-impacting jank** during the tested interactions. The component's resizing animations are fluid, and the layout shifts are contained and predictable. While no critical issues were found, a minor optimization is recommended as a proactive measure to ensure continued performance on a wider range of devices.

## 2. Methodology

### 2.1. Test Environment

*   **Framework:** Playwright v1.40.1
*   **Browser:** Chromium
*   **Test Script:** A dedicated Playwright script (`tests/playwright/performance.spec.ts`) was created to perform the following actions:
    1.  Navigate to the main dashboard page.
    2.  Wait for the `GoogleDocViewer` iframe to load.
    3.  Simulate viewport resizing from `1280x720` to `800x600` and back.
    4.  Simulate a user clicking the "Collapse document" button.
    5.  Simulate a user clicking the "Expand document" button.

### 2.2. Data Collection

Playwright's built-in tracing capabilities were used to capture a detailed performance trace of the entire test run. The trace includes:

*   Screenshots of each action.
*   A complete DOM snapshot.
*   A timeline of browser rendering and layout events.

The generated trace file (`performance-trace.zip`) was used for the analysis.

## 3. Analysis of Findings

### 3.1. Page Load and Initial Render

The initial load of the dashboard and the `GoogleDocViewer` is performant. The use of `next/dynamic` for the viewer component effectively defers its loading, preventing it from blocking the initial page render. The loading skeleton provides a good user experience and minimizes layout shift upon the component's hydration.

### 3.2. Viewport Resizing

During the simulated viewport resizing, the layout shifts were minimal and contained within the `GoogleDocViewer` component. The rest of the dashboard components remained stable. No significant delays or jank were observed during this process.

### 3.3. Component Interaction (Shrink/Expand)

The shrink and expand animations were smooth and completed within the expected `0.3s` transition time. The Playwright trace showed no dropped frames or significant layout recalculations that would indicate a performance problem.

## 4. Recommendations

Based on the analysis, the current implementation of the `GoogleDocViewer` is performant and does not require any immediate, critical optimizations.

However, as a proactive measure to ensure the fluidity of the resizing animation, especially on lower-end devices, it is recommended to add the `will-change: height;` CSS property to the iframe container within the `GoogleDocViewer` component. This property hints to the browser that the `height` is expected to change, allowing it to apply optimizations in advance, which can lead to even smoother animations.

This recommendation should be implemented in a separate pull request, as the primary goal of this issue was to conduct the analysis and produce this report.

## 5. Discrepancy with `DESIGN_GUIDELINES.md`

The `DESIGN_GUIDELINES.md` mentions a "fixed height for the Google Doc viewer." However, the current implementation clearly features a dynamic height, controlled by the `isShrunk` state and the `height` prop. This discrepancy should be addressed, either by updating the design guidelines to reflect the current dynamic behavior or by re-evaluating the component's design to adhere to a fixed height. Given the current functionality, it is recommended to update the design guidelines.

---
applyTo: 'tests/playwright/**/*.spec.ts,tests/playwright/lib/visual.ts'
description: 'Use when editing Playwright visual regression tests; enforce deterministic VRT setup, strict thresholds, and no sleep-based stabilization.'
---

# VRT Stability Guardrails

When changing Playwright visual regression tests, follow these standards.

## Threshold policy

- Default to `maxDiffPixelRatio: 0.1`.
- Allow up to `0.15` only for clearly documented dynamic captures.
- Do not introduce `maxDiffPixelRatio > 0.15`.
- Keep `threshold: 0.2` and `scale: 'css'` in shared screenshot behavior.

## Synchronization policy

- Do not use `waitForTimeout(...)` for stabilization.
- Use deterministic checks instead:
  - `await page.evaluateHandle(() => document.fonts.ready)`
  - `await page.waitForLoadState('networkidle')`
  - explicit assertions on target UI state (`toBeVisible`, `toHaveCSS`, `toHaveText`)
  - layout read/reflow (`await page.evaluate(() => document.body.offsetHeight)`)

## Responsive screenshot policy

- Always set viewport explicitly before responsive snapshots.
- Wait for viewport convergence before capture:
  - `await page.waitForFunction((w) => document.body.clientWidth === w, width)`

## Masking policy

- Mask only truly dynamic elements (timers, live HR values, websocket-driven changing text).
- Use shared mask helpers (`getDynamicContentMasks`, `getHrMasks`) to keep masks consistent.
- Do not mask large stable layout containers.

## Portal and locator policy

- For menu/popover/modal locator screenshots, avoid full-page scroll side effects that can detach portals.
- `skipA11y: true` is allowed for portal snapshots only when accompanied by a brief rationale comment.

## Stateful suite policy

- Use `resetServerState(request)` in `beforeEach` when server state can leak between tests.
- Add deterministic teardown in `afterEach` for long-running state (for example `stopTimer(...)`).

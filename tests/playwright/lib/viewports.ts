/**
 * Viewport dimensions for Visual Regression Testing.
 */
import type { ViewportSize } from '@playwright/test'

export const DESKTOP_VIEWPORT: ViewportSize = {
  width: 1920,
  height: 1080,
}

export const SMALL_DESKTOP_VIEWPORT: ViewportSize = {
  width: 1280,
  height: 720,
}

export const MOBILE_VIEWPORT: ViewportSize = {
  width: 375,
  height: 1000,
}

export const TABLET_VIEWPORT: ViewportSize = {
  width: 768,
  height: 1000,
}

/**
 * Native size of the fixed dashboard canvas (`constants/layout.ts`
 * DASHBOARD_DESIGN_WIDTH/HEIGHT). At exactly this viewport the ScaledStage
 * renders at scale 1 — the wall-display presentation, previously untested
 * by VRT at native width (spec art_uI0w7D6m D7).
 */
export const SCALED_CANVAS_VIEWPORT: ViewportSize = {
  width: 1600,
  height: 900,
}

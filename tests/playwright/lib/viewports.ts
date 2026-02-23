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

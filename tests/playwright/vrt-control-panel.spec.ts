// tests/playwright/vrt-control-panel.spec.ts
import { test } from './fixtures'
import {
  setupMinimalVisualRegressionTest,
  resetServerState,
} from './test-helpers'
import { takeScreenshot } from './lib/visual'

// Test suite for VRT
test.describe('Visual Regression Tests - Control Panel', () => {
  test.afterEach(async ({ page }) => {
    // Reset server state after each test
    await resetServerState(page)
  })

  test.describe('ControlPanel Component', () => {
    test('initial state', async ({ controlPage }) => {
      await setupMinimalVisualRegressionTest(controlPage, '/client/control')
      const controlPanel = controlPage.getByTestId('control-panel')
      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })
})

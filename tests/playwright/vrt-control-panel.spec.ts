import { test } from './fixtures'
import { takeScreenshot } from './lib/visual'
import { waitForPageReady } from './lib/waits'

// Test suite configuration
test.describe.configure({ mode: 'serial' })

// Test suite for VRT
test.describe('Visual Regression Tests', () => {
  test.describe('ControlPanel Component', () => {
    test('initial state', async ({ controlPage }) => {
      await controlPage.goto('/client/control')
      await waitForPageReady(controlPage)
      const controlPanel = controlPage.getByTestId('control-panel')
      await takeScreenshot(controlPanel, 'control-panel.png')
    })
  })
})

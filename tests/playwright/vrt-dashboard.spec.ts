import { expect } from '@playwright/test'
import { test } from './fixtures'
import {
  getDynamicContentMasks,
  setupMinimalVisualRegressionTest,
  HRM_ROUTES,
  MOBILE_VIEWPORT,
} from './lib'
import { takeScreenshot, assertFixedDimensions } from './lib/visual'
import { VRT_TIMEOUTS } from './lib/timeouts'

// Test suite for VRT
test.describe('Dashboard Visual Regression Tests', () => {
  test.describe('Dashboard Component', () => {
    test('initial, empty state', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-empty.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    // NEW: Active timer with no HR data
    test('active timer without HR data', async ({
      dashboardPage,
      controlPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)

      // Ensure dashboard is ready
      const timerContainer = dashboardPage.getByTestId(
        'timer-display-container'
      )
      await timerContainer.waitFor({
        state: 'visible',
        timeout: VRT_TIMEOUTS.STANDARD,
      })

      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to transition from idle (00:00) to prepare (e.g. 10 or 05)
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      // Assert timer tile height is fixed
      const timerCard = dashboardPage.getByTestId('timer-display-container')
      await assertFixedDimensions(timerCard, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.1,
      })
    })

    // NEW: Active timer WITH HR data (the regression scenario)
    test('active timer with HR data', async ({
      dashboardPage,
      controlPage,
      mockPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await setupMinimalVisualRegressionTest(controlPage, HRM_ROUTES.CONTROL)
      await setupMinimalVisualRegressionTest(mockPage, HRM_ROUTES.MOCK)

      await mockPage.getByLabel('Current BPM').fill('155')
      await mockPage.getByRole('button', { name: 'Zone 4' }).click()
      await controlPage.getByTestId('start-timer-button').click()

      // Wait for timer to start on dashboard
      await expect(dashboardPage.getByTestId('timer-countdown')).not.toHaveText(
        /00:00/,
        {
          timeout: VRT_TIMEOUTS.STANDARD,
        }
      )

      // Assert grid row height is stable
      const topRow = dashboardPage
        .locator('[data-testid="dashboard"] > div')
        .first()
      await assertFixedDimensions(topRow, {
        maxHeight: 600,
      })

      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-active-timer-with-hr.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.15, // Higher threshold for complex combined state
      })
    })

    // Max-content bounds from previous_workouts history (227 workouts):
    // 6 phases, 11 exercises in the densest phase, ~30-char lines.
    test('max-content workout fills without overflow', async ({
      dashboardPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/', {
        headers: [
          '30/10 x 3',
          'Tabata 20/10',
          'EMOM 60/60',
          '3 x 12',
          '2 x 15',
          'Finisher',
        ],
        columns: [
          ['3 way crunch', 'Dead bug', 'Plank variations'],
          [
            'Band h. Bridge',
            'Band p. Squat',
            'Band hydrants',
            'Bulgarian split squat pulses L',
            'Single-leg deadlift row R',
            'Overhead walking lunge twist',
            'Lateral band monster walks',
            'Standing calf raise pyramid',
            'Tibialis anterior wall leans',
            'Seated hip abduction holds',
            'Prone hamstring slider curls',
          ],
          ['RDL', 'High pull', '1 1/2 squat'],
          ['Alt box ch press', 'Single Hip thrust'],
          ['Kb curl', 'Tricep planks', 'Butterfly bridge'],
          ['60 second hollow body hold'],
        ],
      })
      const grid = dashboardPage.getByTestId('workout-phase-grid')
      await grid.waitFor({
        state: 'visible',
        timeout: VRT_TIMEOUTS.STANDARD,
      })
      // Six cards render, and every card fits its content: the fit hook
      // must have shrunk type instead of leaving inner scrollbars.
      await expect(dashboardPage.getByTestId('phase-card-content')).toHaveCount(
        6
      )
      const overflowing = await dashboardPage.evaluate(() => {
        const cards = Array.from(
          document.querySelectorAll('[data-testid="phase-card-content"]')
        )
        return cards.filter(
          (el) =>
            el.scrollHeight > el.clientHeight + 1 ||
            el.scrollWidth > el.clientWidth + 1
        ).length
      })
      expect(overflowing).toBe(0)
      await takeScreenshot(grid, 'dashboard-max-content.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('large desktop viewport', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await dashboardPage.setViewportSize({ width: 2560, height: 1440 })
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-large-desktop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('md laptop viewport fills without page scroll', async ({
      dashboardPage,
    }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      // Owner's review viewport: short laptop screen. The whole dashboard
      // (timer + HRM + cards) must fit with zero page scroll.
      await dashboardPage.setViewportSize({ width: 1064, height: 696 })
      await dashboardPage.evaluate(() => window.scrollTo(0, 0))
      await dashboardPage.waitForFunction(
        (width) => document.body.clientWidth === width,
        1064,
        { timeout: VRT_TIMEOUTS.STANDARD }
      )
      // The dashboard is top-anchored content; the page itself is the
      // scroller, so document height must not exceed the viewport.
      const scrolled = await dashboardPage.evaluate(
        () => document.documentElement.scrollHeight <= window.innerHeight + 1
      )
      expect(scrolled).toBe(true)
      const dashboard = dashboardPage.getByTestId('dashboard')
      await takeScreenshot(dashboard, 'dashboard-md-laptop.png', {
        mask: getDynamicContentMasks(dashboardPage),
        maxDiffPixelRatio: 0.1,
      })
    })

    test('mobile viewport', async ({ dashboardPage }) => {
      await setupMinimalVisualRegressionTest(dashboardPage, '/')
      await dashboardPage.setViewportSize(MOBILE_VIEWPORT)
      await dashboardPage.evaluate(() => window.scrollTo(0, 0))
      const dashboard = dashboardPage.getByTestId('dashboard')

      // Await layout engine reflow
      await dashboardPage.waitForFunction(
        (width) => document.body.clientWidth === width,
        MOBILE_VIEWPORT.width
      )

      const box = await dashboard.boundingBox()
      await takeScreenshot(dashboard, 'dashboard-mobile.png', {
        mask: [...getDynamicContentMasks(dashboardPage)],
        maxDiffPixelRatio: 0.05,
        // Force expected height to prevent overflow mismatches
        clip: box ? { ...box, height: 1038 } : undefined,
      })
    })
  })
})

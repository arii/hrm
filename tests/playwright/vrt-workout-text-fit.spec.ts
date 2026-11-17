// File: tests/playwright/vrt-workout-text-fit.spec.ts
/**
 * OD-5: scaled-canvas text-fit VRT coverage.
 *
 * The workout grid's auto-fit had no visual coverage on the scaled
 * canvas — the only grid VRT loaded the responsive layout, where font
 * size is a CSS clamp and the fit code never runs. These cases pin the
 * scaled 1600x900 presentation across font-load states and a resize
 * round-trip, with the tight 0.02 masked tolerance so clipped,
 * overlapping, or shifted text fails the snapshot.
 */
import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { waitForPageReady } from './lib/waits'
import { freezeUIForVRT } from './lib/setup'
import { takeScreenshot } from './lib/visual'

// Content shapes the fit must handle on one canvas: short names, long
// wrapping names, and four narrow cards.
const WORKOUT_CONTENT = {
  headers: ['20/10', '3 x 10', 'TABATA', 'EMOM'],
  columns: [
    ['Jumping Jacks', 'High Knees'],
    ['Squats (10 reps)', 'Plank'],
    ['Alternating dumbbell floor press', 'Band bridge lat pull to chest'],
    ['Ab mat butterfly sit up', 'Single arm overhead kettlebell carry'],
  ],
}

const routeWorkout = async (
  page: Page,
  content: typeof WORKOUT_CONTENT
): Promise<void> => {
  await page.route('**/api/workout*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(content),
    })
  })
}

// Pin the fallback-font state: abort webfont requests so the fit runs
// (deterministically) on the metrics actually rendered.
const blockWebFonts = (page: Page): void => {
  void page.route(/\.woff2?(\?.*)?$/, (route) => route.abort())
}

const SCALED_ROUTE = '/?testing=true'

// The page-entrance spring (pageVariants y: 20 -> 0) moves the grid for
// ~400ms after load, which the frame-stability check would read as a
// layout step.
const openWorkoutGrid = async (page: Page): Promise<void> => {
  await freezeUIForVRT(page)
  await page.goto(SCALED_ROUTE)
  await waitForPageReady(page)
  const grid = page.getByTestId('workout-phase-grid')
  await expect(grid).toBeVisible()
  await page.evaluateHandle(() => document.fonts.ready)
}

// The work order's own success bar: no overflow in the fixed-height
// grid — text fits instead of clipping.
const expectGridFits = async (page: Page): Promise<void> => {
  const overflow = await page
    .getByTestId('workout-phase-grid')
    .evaluate((el) => ({
      sh: el.scrollHeight,
      ch: el.clientHeight,
      sw: el.scrollWidth,
      cw: el.clientWidth,
    }))
  expect(overflow.sh).toBeLessThanOrEqual(overflow.ch + 1)
  expect(overflow.sw).toBeLessThanOrEqual(overflow.cw + 1)
}

const exerciseFontSize = async (page: Page): Promise<string> =>
  page
    .getByTestId('workout-exercise-text')
    .first()
    .evaluate((el) => getComputedStyle(el).fontSize)

// Chromium snaps fractional layout between frames (observed: y
// 367.887… → 368 across two rAF frames); sub-pixel settling is not a
// layout step, so the stability check tolerates it while still failing
// a real move.
type Box = { x: number; y: number; width: number; height: number }
const expectBoxStable = (before: Box | null, after: Box | null): void => {
  expect(before).not.toBeNull()
  expect(after).not.toBeNull()
  if (!before || !after) return
  for (const key of ['x', 'y', 'width', 'height'] as const) {
    expect(Math.abs(after[key] - before[key])).toBeLessThan(1)
  }
}

const twoAnimationFrames = (page: Page): Promise<void> =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
  )

test.describe('Workout grid deterministic text fit (scaled canvas)', () => {
  test('after fonts ready: loaded-metric fit, no overflow', async ({
    dashboardPage,
  }) => {
    await routeWorkout(dashboardPage, WORKOUT_CONTENT)
    await openWorkoutGrid(dashboardPage)
    await expectGridFits(dashboardPage)
    await takeScreenshot(
      dashboardPage.getByTestId('workout-phase-grid'),
      'workout-text-fit-fonts-loaded.png'
    )
  })

  test('before fonts ready: fallback-metric fit, no overflow', async ({
    dashboardPage,
  }) => {
    await routeWorkout(dashboardPage, WORKOUT_CONTENT)
    blockWebFonts(dashboardPage)
    await openWorkoutGrid(dashboardPage)
    await expectGridFits(dashboardPage)
    await takeScreenshot(
      dashboardPage.getByTestId('workout-phase-grid'),
      'workout-text-fit-fonts-blocked.png'
    )
  })

  test('layout stability: exercise size identical across two rAF frames', async ({
    dashboardPage,
  }) => {
    await routeWorkout(dashboardPage, WORKOUT_CONTENT)
    await openWorkoutGrid(dashboardPage)
    await twoAnimationFrames(dashboardPage)

    const grid = dashboardPage.getByTestId('workout-phase-grid')
    const boxBefore = await grid.boundingBox()
    const sizeBefore = await exerciseFontSize(dashboardPage)

    await twoAnimationFrames(dashboardPage)

    const boxAfter = await grid.boundingBox()
    const sizeAfter = await exerciseFontSize(dashboardPage)
    // A post-paint size step is the regression signature the old
    // step-down loop shipped four times; two stable frames prove the
    // one-shot fit does not move after paint.
    expect(sizeAfter).toBe(sizeBefore)
    expectBoxStable(boxBefore, boxAfter)
    await expectGridFits(dashboardPage)
  })

  test('recompute after viewport resize round-trip: same fit, no overflow', async ({
    dashboardPage,
  }) => {
    await routeWorkout(dashboardPage, WORKOUT_CONTENT)
    await openWorkoutGrid(dashboardPage)
    const sizeBefore = await exerciseFontSize(dashboardPage)

    // Leave scaled mode (narrow viewport keeps the responsive layout)
    // and return: the fit must recompute from scratch and land on the
    // same deterministic sizes.
    await dashboardPage.setViewportSize({ width: 500, height: 900 })
    await waitForPageReady(dashboardPage)
    await dashboardPage.setViewportSize({ width: 1600, height: 900 })
    await waitForPageReady(dashboardPage)
    await settleFontsAndFrames(dashboardPage)

    await expectGridFits(dashboardPage)
    expect(await exerciseFontSize(dashboardPage)).toBe(sizeBefore)
    await takeScreenshot(
      dashboardPage.getByTestId('workout-phase-grid'),
      'workout-text-fit-after-resize.png'
    )
  })
})

async function settleFontsAndFrames(page: Page): Promise<void> {
  await page.evaluateHandle(() => document.fonts.ready)
  await twoAnimationFrames(page)
}

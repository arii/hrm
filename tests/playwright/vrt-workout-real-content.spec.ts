/**
 * Text fit against real workouts. The fixtures are the hardest cases
 * from arii/previous_workouts (most text, most exercises in a phase,
 * most phases, longest names and headers), so the fit is checked on
 * content shapes the gym actually writes, not only synthetic ones.
 */
import { expect, type Page } from '@playwright/test'
import { test } from './fixtures'
import { waitForPageReady } from './lib/waits'
import previousWorkouts from './data/previous-workouts.json' with { type: 'json' }
import { MIN_EXERCISE_REM } from '../../lib/workoutSizing'

type Workout = (typeof previousWorkouts)[number]

const openWorkout = async (page: Page, workout: Workout): Promise<void> => {
  await page.route('**/api/workout*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        headers: workout.headers,
        columns: workout.columns,
      }),
    })
  )
  await page.goto('/?testing=true')
  await waitForPageReady(page)
  await expect(page.getByTestId('workout-phase-grid')).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByTestId('workout-exercise-text')).toHaveCount(
    workout.columns.flat().length
  )
}

// Every exercise line must sit fully inside its card, stay on one
// horizontal extent, and not drop below the fit's minimum size.
const measureFit = (page: Page) =>
  page.getByTestId('workout-phase-grid').evaluate((grid) => {
    const rootPx = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const clipped: string[] = []
    let minFontPx = Infinity
    grid
      .querySelectorAll<HTMLElement>('[data-testid="workout-exercise-text"]')
      .forEach((el) => {
        const card = el.closest('.MuiCard-root')!.getBoundingClientRect()
        const box = el.getBoundingClientRect()
        minFontPx = Math.min(
          minFontPx,
          parseFloat(getComputedStyle(el).fontSize)
        )
        if (
          box.bottom > card.bottom + 1 ||
          box.right > card.right + 1 ||
          el.scrollWidth > el.clientWidth + 1
        ) {
          clipped.push(el.textContent ?? '')
        }
      })
    return {
      clipped,
      minFontRem: minFontPx / rootPx,
      gridOverflow: Math.max(
        grid.scrollHeight - grid.clientHeight,
        grid.scrollWidth - grid.clientWidth
      ),
    }
  })

test.describe('Workout grid text fit with real workouts', () => {
  for (const workout of previousWorkouts) {
    test(`${workout.reason} (${workout.date})`, async ({ dashboardPage }) => {
      await openWorkout(dashboardPage, workout)
      const fit = await measureFit(dashboardPage)
      expect(fit.clipped).toEqual([])
      expect(fit.gridOverflow).toBeLessThanOrEqual(1)
      expect(fit.minFontRem).toBeGreaterThanOrEqual(MIN_EXERCISE_REM - 0.01)
    })
  }
})

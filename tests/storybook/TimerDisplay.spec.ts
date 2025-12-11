// tests/storybook/TimerDisplay.spec.ts
import { test, expect } from '@playwright/test'

test.describe('TimerDisplay Stories', () => {
  test('Idle story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--idle&viewMode=story'
    )
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText(
      '00:00'
    )
    await expect(page.locator('[data-testid="timer-phase"]')).not.toBeVisible()
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Connected')
  })

  test('Prepare story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--prepare&viewMode=story'
    )
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText(
      '05'
    )
    await expect(page.locator('[data-testid="timer-phase"]')).toHaveText(
      'GET READY'
    )
  })

  test('Work story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--work&viewMode=story'
    )
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText(
      '00:15'
    )
    await expect(page.locator('[data-testid="timer-phase"]')).toHaveText('WORK')
  })

  test('Rest story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--rest&viewMode=story'
    )
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText(
      '00:08'
    )
    await expect(page.locator('[data-testid="timer-phase"]')).toHaveText('REST')
  })

  test('Stopwatch story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--stopwatch&viewMode=story'
    )
    await expect(page.locator('[data-testid="timer-countdown"]')).toHaveText(
      '02:05'
    )
  })

  test('Disconnected story', async ({ page }) => {
    await page.goto(
      '/iframe.html?id=components-timerdisplay--disconnected&viewMode=story'
    )
    await expect(
      page.locator('[data-testid="ws-status-indicator"]')
    ).toHaveText('Disconnected')
  })
})

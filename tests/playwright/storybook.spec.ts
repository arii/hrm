// tests/playwright/storybook.spec.ts
import { test, expect } from '@playwright/test'
import * as stories from '../../components/HrTile.stories' // Adjust the path to your stories

test.describe('Storybook Visual Regression', () => {
  for (const storyName in stories) {
    if (storyName === 'default') continue

    test(`Snapshot for ${storyName}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=components-hrtile--${storyName.toLowerCase()}`
      )
      await expect(page).toHaveScreenshot(`${storyName}.png`)
    })
  }
})

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('Dashboard should not have automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/')

    // Wait for main dashboard elements to load
    await page.waitForSelector('main')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })
})

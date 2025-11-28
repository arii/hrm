// File: tests/playwright/test-helpers.ts
/**
 * Shared Test Helpers: Reusable functions for consistent test setup
 */
import type { Page } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'

export const BASE_URL = getBaseURL()

// Updated helper to listen for the 'test-ready' custom event.
export const waitForPageReady = async (page: Page) => {
  await page.waitForFunction(() => {
    return new Promise((resolve) => {
      if (window.__TEST_READY__) {
        return resolve(true)
      }
      window.addEventListener('test-ready', () => resolve(true), { once: true })
    })
  }, { timeout: 15000 }) // Increased timeout for reliability
}

// Helper function to replace iframe with stable workout content
export const replaceIframeWithStableWorkout = async (page: Page) => {
  try {
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe')
      if (iframe) {
        iframe.src =
          'data:text/html;charset=utf-8,' +
          encodeURIComponent(`
        <!DOCTYPE html>
        <html><head><style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px; border: 1px solid #ddd; vertical-align: top; }
        h3 { margin: 0 0 10px 0; color: #333; }
        p { margin: 5px 0; font-size: 14px; }
        </style></head><body>
        <p><strong>Sample Workout Plan</strong></p>
        <table><tr>
        <td><h3>30/10 x 3</h3><p>3 way crunch</p><p>Dead bug</p><p>Plank variations</p></td>
        <td><h3>Tabata</h3><p>Band h. Bridge</p><p>Band p. Squat</p><p>Band hydrants</p></td>
        <td><h3>Complex 5x5</h3><p>RDL</p><p>High pull</p><p>1 ½ squat</p></td>
        <td><h3>3x10</h3><p>Alt box ch press</p><p>Single Hip thrust</p></td>
        <td><h3>3 x 12</h3><p>Kb curl</p><p>Tricep planks</p><p>Butterfly bridge</p></td>
        </tr></table>
        <p><a href="#">Previous workouts</a></p>
        </body></html>
      `)
      }
    })
    await page.waitForSelector('iframe', { state: 'attached', timeout: 5000 })
  } catch {
    console.warn(
      'Warning: Iframe selector timeout in replaceIframeWithStableWorkout. Skipping wait.'
    )
  }
}

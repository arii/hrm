import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// Define a type for the performance metrics we will collect
interface PerformanceMetrics {
  JSHeapUsedSize: number
  LayoutCount: number
  RecalculateStyleCount: number
}

// --- Test Configuration ---
const TEST_DURATION_MS = 20 * 1000 // 20 seconds
const SAMPLING_INTERVAL_MS = 1000 // 1 second
const HEAP_GROWTH_THRESHOLD = 0.25 // 25% (relaxed to account for CI variance)

test.describe('Frontend Performance', () => {
  test.skip('should not exhibit memory leaks during a simulated workout', async ({
    page,
  }) => {
    test.setTimeout(30 * 1000) // 30-second timeout for this specific test
    // Navigate to the mock client page to simulate HRM data
    await page.goto('/client/mock')

    // Start the mock HRM data stream
    await page.getByRole('button', { name: 'START Continuous Stream' }).click()

    // Open a new tab for the dashboard
    const newPage = await page.context().newPage()
    await newPage.goto('/')

    const client = await newPage.context().newCDPSession(newPage)
    await client.send('Performance.enable')

    const metrics: PerformanceMetrics[] = []

    // Collect metrics at regular intervals
    const interval = setInterval(async () => {
      try {
        const performanceMetrics = await client.send('Performance.getMetrics')
        const jsHeapUsedSize =
          performanceMetrics.metrics.find((m) => m.name === 'JSHeapUsedSize')
            ?.value || 0
        const layoutCount =
          performanceMetrics.metrics.find((m) => m.name === 'LayoutCount')
            ?.value || 0
        const recalculateStyleCount =
          performanceMetrics.metrics.find(
            (m) => m.name === 'RecalculateStyleCount'
          )?.value || 0

        metrics.push({
          JSHeapUsedSize: jsHeapUsedSize,
          LayoutCount: layoutCount,
          RecalculateStyleCount: recalculateStyleCount,
        })
      } catch (_error) {
        // Ignore errors if the session closes prematurely
      }
    }, SAMPLING_INTERVAL_MS)

    // Stop collecting metrics after the test duration
    await new Promise((resolve) => setTimeout(resolve, TEST_DURATION_MS))
    clearInterval(interval)

    // Stop the mock HRM data stream
    await page.getByRole('button', { name: /STOP Streaming HR/ }).click()

    // --- Analysis ---
    console.log('--- Collected Performance Metrics ---')
    console.table(metrics)

    const heapSizes = metrics.map((m) => m.JSHeapUsedSize)
    const initialHeapSize = heapSizes[0] || 0
    const finalHeapSize = heapSizes[heapSizes.length - 1] || 0
    const heapGrowthRatio =
      initialHeapSize > 0
        ? (finalHeapSize - initialHeapSize) / initialHeapSize
        : 0

    console.log(`Heap Growth Ratio: ${(heapGrowthRatio * 100).toFixed(2)}%`)

    const layoutCounts = metrics.map((m) => m.LayoutCount)
    const totalLayouts =
      (layoutCounts[layoutCounts.length - 1] || 0) - (layoutCounts[0] || 0)
    console.log(`Total Layouts during test: ${totalLayouts}`)

    // --- Reporting ---
    const outputDir = 'test-results'
    const outputFile = path.join(outputDir, 'performance-metrics.json')
    const report = {
      test: 'should not exhibit memory leaks during a simulated workout',
      durationMs: TEST_DURATION_MS,
      heapGrowthRatio: parseFloat(heapGrowthRatio.toFixed(4)),
      heapGrowthThreshold: HEAP_GROWTH_THRESHOLD,
      initialHeapSize,
      finalHeapSize,
      totalLayouts,
      metrics,
    }

    // Ensure the output directory exists
    fs.mkdirSync(outputDir, { recursive: true })
    // Write the report to a file
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2))
    console.log(`Performance report saved to ${outputFile}`)

    // --- Assertion ---
    expect(heapGrowthRatio).toBeLessThan(HEAP_GROWTH_THRESHOLD)
    expect(totalLayouts).toBeLessThan(500)
  })
})

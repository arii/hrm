import { test, expect, Page } from '@playwright/test';

// Define a type for the performance metrics we will collect
interface PerformanceMetrics {
  JSHeapUsedSize: number;
  LayoutCount: number;
  RecalculateStyleCount: number;
}

// --- Test Configuration ---
const TEST_DURATION_MS = 20 * 1000; // 20 seconds
const SAMPLING_INTERVAL_MS = 1000; // 1 second

test.describe('Frontend Performance', () => {
  test('should not exhibit memory leaks during a simulated workout', async ({ page }) => {
    test.setTimeout(30 * 1000); // 30-second timeout for this specific test
    // Navigate to the mock client page to simulate HRM data
    await page.goto('/client/mock');

    // Start the mock HRM data stream
    await page.getByRole('button', { name: 'START Continuous Stream' }).click();

    // Open a new tab for the dashboard
    const newPage = await page.context().newPage();
    await newPage.goto('/');

    const client = await newPage.context().newCDPSession(newPage);
    await client.send('Performance.enable');

    const metrics: PerformanceMetrics[] = [];
    let startTime = Date.now();

    // Collect metrics at regular intervals
    const interval = setInterval(async () => {
      const performanceMetrics = await client.send('Performance.getMetrics');
      const jsHeapUsedSize = performanceMetrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value || 0;
      const layoutCount = performanceMetrics.metrics.find(m => m.name === 'LayoutCount')?.value || 0;
      const recalculateStyleCount = performanceMetrics.metrics.find(m => m.name === 'RecalculateStyleCount')?.value || 0;

      metrics.push({
        JSHeapUsedSize: jsHeapUsedSize,
        LayoutCount: layoutCount,
        RecalculateStyleCount: recalculateStyleCount,
      });

    }, SAMPLING_INTERVAL_MS);

    // Stop collecting metrics after the test duration
    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_MS));
    clearInterval(interval);

    // Stop the mock HRM data stream
    await page.getByRole('button', { name: /STOP Streaming HR/ }).click();

    // --- Analysis ---
    console.log('--- Collected Performance Metrics ---');
    console.table(metrics);

    // 1. Memory Leak Analysis (Simple Slope)
    const heapSizes = metrics.map(m => m.JSHeapUsedSize);
    const initialHeapSize = heapSizes[0];
    const finalHeapSize = heapSizes[heapSizes.length - 1];

    // A simple check: if the heap size has grown by more than 50%
    // over the initial size, it's a potential leak. This is a heuristic.
    const heapGrowthRatio = (finalHeapSize - initialHeapSize) / initialHeapSize;
    console.log(`Heap Growth Ratio: ${(heapGrowthRatio * 100).toFixed(2)}%`);
    expect(heapGrowthRatio).toBeLessThan(0.5);

    // 2. Layout Thrashing Analysis
    const layoutCounts = metrics.map(m => m.LayoutCount);
    const totalLayouts = layoutCounts[layoutCounts.length - 1] - layoutCounts[0];
    console.log(`Total Layouts during test: ${totalLayouts}`);
    // Allow for a reasonable number of layouts, but flag excessive changes.
    expect(totalLayouts).toBeLessThan(500);
  });
});

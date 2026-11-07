import { test, expect } from '@playwright/test'
import { getBaseURL } from '../../utils/urls'
import { resetServerState } from './lib'

const BASE_URL = getBaseURL()

test.describe('Multiple Mock HRM Devices', () => {
  test('should support three unique HRM streams simultaneously and independent tile clearing', async ({
    context,
    request,
  }) => {
    await resetServerState(request)

    // 1. Open Dashboard page (/hrm or /)
    const dashboardPage = await context.newPage()
    await dashboardPage.goto(BASE_URL)
    await expect(dashboardPage.getByTestId('dashboard')).toBeVisible({
      timeout: 10000,
    })

    // 2. Open 3 distinct /client/mock pages with different names and IDs
    const mock1 = await context.newPage()
    await mock1.goto(`${BASE_URL}/client/mock?clientId=mock-device-1`)
    await mock1.getByLabel('User Name').fill('Athlete One')
    await mock1.getByLabel('Device ID').fill('DEV-001')
    await mock1.getByLabel('Current BPM').fill('135')

    const mock2 = await context.newPage()
    await mock2.goto(`${BASE_URL}/client/mock?clientId=mock-device-2`)
    await mock2.getByLabel('User Name').fill('Athlete Two')
    await mock2.getByLabel('Device ID').fill('DEV-002')
    await mock2.getByLabel('Current BPM').fill('155')

    const mock3 = await context.newPage()
    await mock3.goto(`${BASE_URL}/client/mock?clientId=mock-device-3`)
    await mock3.getByLabel('User Name').fill('Athlete Three')
    await mock3.getByLabel('Device ID').fill('DEV-003')
    await mock3.getByLabel('Current BPM').fill('175')

    // Start streaming on all three
    await mock1.getByTestId('streaming-start-button').click()
    await expect(mock1.getByTestId('streaming-stop-button')).toBeVisible()

    await mock2.getByTestId('streaming-start-button').click()
    await expect(mock2.getByTestId('streaming-stop-button')).toBeVisible()

    await mock3.getByTestId('streaming-start-button').click()
    await expect(mock3.getByTestId('streaming-stop-button')).toBeVisible()

    // 3. Confirm three separate tiles stream live data on the dashboard
    await expect(dashboardPage.locator('text=ATHLETE ONE')).toBeVisible({
      timeout: 10000,
    })
    await expect(dashboardPage.locator('text=ATHLETE TWO')).toBeVisible({
      timeout: 10000,
    })
    await expect(dashboardPage.locator('text=ATHLETE THREE')).toBeVisible({
      timeout: 10000,
    })

    const tiles = dashboardPage.getByTestId('hr-tile-card')
    await expect(tiles).toHaveCount(3)

    // 4. Stop mock2 only
    await mock2.getByTestId('streaming-stop-button').click()
    await expect(mock2.getByTestId('streaming-start-button')).toBeVisible()

    // Confirm athlete two's tile is cleared while athlete one and athlete three remain
    await expect(dashboardPage.locator('text=ATHLETE TWO')).not.toBeVisible({
      timeout: 10000,
    })
    await expect(dashboardPage.locator('text=ATHLETE ONE')).toBeVisible()
    await expect(dashboardPage.locator('text=ATHLETE THREE')).toBeVisible()
    await expect(dashboardPage.getByTestId('hr-tile-card')).toHaveCount(2)

    await mock1.close()
    await mock2.close()
    await mock3.close()
    await dashboardPage.close()
  })
})

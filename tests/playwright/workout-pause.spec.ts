import { test, expect } from './fixtures'
import { injectBluetoothMocks } from './lib/bluetooth-mocks'

test('Pause workout freezes the session and offers Resume', async ({
  connectPage,
}) => {
  await injectBluetoothMocks(connectPage)
  await connectPage.goto('/client/connect')
  await connectPage.getByLabel('Your Name').fill('Pause Runner')
  await connectPage.getByLabel('Your Age').fill('30')
  await connectPage
    .getByRole('button', { name: 'Connect Bluetooth HRM' })
    .click()
  await connectPage.evaluate(() => {
    window.bluetoothTestHelpers.simulateHeartRate(90)
  })

  const pause = connectPage.getByRole('button', {
    name: 'Pause workout session',
  })
  await expect(pause).toBeVisible()
  await connectPage.waitForTimeout(2500)
  await pause.click()

  await expect(
    connectPage.getByRole('button', { name: 'Resume workout session' })
  ).toBeVisible()
  const duration = connectPage.getByTestId('workout-duration')
  const frozen = await duration.textContent()
  await connectPage.evaluate(() => {
    window.bluetoothTestHelpers.simulateHeartRate(95)
  })
  await connectPage.waitForTimeout(2500)
  await expect(duration).toHaveText(frozen ?? '')
})

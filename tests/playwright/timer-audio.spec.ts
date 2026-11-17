import { expect, test } from './fixtures'
import {
  mockLoggedInSession,
  startTimer,
  stopTimer,
  waitForPageReady,
} from './lib'

type PlayLog = { calls: string[] }

// End-to-end guard for the timer beeps: server timer -> WebSocket ->
// useAudio -> audioManager -> HTMLMediaElement.play on the dashboard.
test.describe('Timer audio', () => {
  test('dashboard plays countdown and phase beeps when the timer runs', async ({
    dashboardPage,
    controlPage,
  }) => {
    test.setTimeout(60_000)

    await dashboardPage.addInitScript(() => {
      const log: PlayLog = { calls: [] }
      ;(window as unknown as { __audioLog: PlayLog }).__audioLog = log
      const originalPlay = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function play() {
        log.calls.push(this.currentSrc || this.src)
        return originalPlay.call(this)
      }
    })

    await dashboardPage.goto('/')
    await waitForPageReady(dashboardPage)
    // A user gesture lets TimerSoundProvider unlock audio.
    await dashboardPage.mouse.click(5, 5)

    const playedFiles = () =>
      dashboardPage.evaluate(() =>
        (window as unknown as { __audioLog: PlayLog }).__audioLog.calls.map(
          (src) => src.split('/').pop()
        )
      )

    // Unlock primes each beep once; anything beyond that is a timer beep.
    await expect.poll(playedFiles).toHaveLength(2)

    await controlPage.goto('/client/control')
    await waitForPageReady(controlPage)
    await startTimer(controlPage)

    await expect
      .poll(
        async () => {
          const files = (await playedFiles()).slice(2)
          return {
            countdown: files.includes('beep-07.wav'),
            phase: files.includes('beep-01a.wav'),
          }
        },
        { timeout: 30_000 }
      )
      .toEqual({ countdown: true, phase: true })

    await stopTimer(controlPage, dashboardPage)
  })

  test('muting beeps on one dashboard silences dashboards on other devices', async ({
    browser,
    dashboardPage,
    controlPage,
  }) => {
    test.setTimeout(60_000)

    // A separate context shares no localStorage: another device.
    const otherDevice = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    })
    await mockLoggedInSession(otherDevice)
    await otherDevice.addInitScript(() => {
      const log: PlayLog = { calls: [] }
      ;(window as unknown as { __audioLog: PlayLog }).__audioLog = log
      const originalPlay = HTMLMediaElement.prototype.play
      HTMLMediaElement.prototype.play = function play() {
        if (!this.muted && this.volume > 0) log.calls.push(this.src)
        return originalPlay.call(this)
      }
    })
    const otherTab = await otherDevice.newPage()
    for (const tab of [dashboardPage, otherTab]) {
      await tab.goto('/')
      await waitForPageReady(tab)
      await tab.mouse.click(5, 5)
    }
    const audiblePlays = () =>
      otherTab.evaluate(
        () =>
          (window as unknown as { __audioLog: PlayLog }).__audioLog.calls.length
      )
    await expect.poll(audiblePlays).toBe(2)

    await dashboardPage
      .getByRole('button', { name: 'Mute timer beeps' })
      .click()
    await expect(
      otherTab.getByRole('button', { name: 'Unmute timer beeps' })
    ).toBeVisible()

    await controlPage.goto('/client/control')
    await waitForPageReady(controlPage)
    await startTimer(controlPage)
    // The countdown and WORK beeps have both fired once WORK shows.
    await expect(otherTab.getByTestId('timer-phase')).toHaveText('WORK', {
      timeout: 30_000,
    })
    await otherTab.waitForTimeout(1000)
    expect(await audiblePlays()).toBe(2)

    await stopTimer(controlPage, dashboardPage)
    await otherDevice.close()
  })
})

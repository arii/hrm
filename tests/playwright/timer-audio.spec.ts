import { expect, test } from './fixtures'
import { startTimer, stopTimer, waitForPageReady } from './lib'

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
})

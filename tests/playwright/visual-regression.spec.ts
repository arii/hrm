import { test, expect, Page } from '@playwright/test'
import {
  mockPermissions,
  waitForExpress,
} from './test-helpers'
import { TimerState, SpotifyState, HrmState } from '@/types/index'

// Constants
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'

test.describe('Visual Regression Tests', () => {
  let page: Page

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await mockPermissions(page.context())
    await page.goto(BASE_URL)
    await waitForExpress(page, BASE_URL)
    await page.waitForSelector('[data-testid="ws-status-indicator"]')
    const readyState = await page.evaluate('window.__TEST_READY__')
    expect(readyState).toBe(true)
  })

  test.afterAll(async () => {
    await page.close()
  })

  const resetState = async (
    timerState: Partial<TimerState> = {},
    spotifyState: Partial<SpotifyState> = {},
    hrmState: Partial<HrmState> = {}
  ) => {
    const state = {
      timer: {
        mode: 'STOPWATCH',
        workDuration: 30,
        restDuration: 10,
        currentPhase: 'IDLE',
        isRunning: false,
        timeElapsed: 0,
        timeRemaining: 0,
        ...timerState,
      },
      spotify: {
        ...spotifyState,
      },
      hrm: {
        ...hrmState,
      },
    }
    await page.evaluate((s) => {
      window.postMessage({ type: 'SET_STATE', state: s }, '*')
    }, state)
  }

  const takeScreenshot = async (name: string) => {
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      timeout: 10000,
    })
  }

  test('Dashboard - main viewer page', async () => {
    await resetState()
    await takeScreenshot('dashboard-main')
  })

  test('Control Panel - timer and music controls', async () => {
    await page.goto(`${BASE_URL}/client/control`)
    await page.waitForSelector('[data-testid="timer-mode-heading"]')
    await takeScreenshot('control-panel')
  })

  test('Mock HRM Client - test data input', async () => {
    await page.goto(`${BASE_URL}/client/mock`)
    await page.waitForSelector('text=Mock HRM Client')
    await takeScreenshot('mock-hrm-client')
  })

  test('Dashboard with active timer', async () => {
    await page.goto(BASE_URL)
    await resetState({
      mode: 'TABATA',
      currentPhase: 'WORK',
      isRunning: true,
      timeRemaining: 25,
      workDuration: 30,
    })
    await page.waitForTimeout(1000)
    await takeScreenshot('dashboard-active-timer')
  })

  test('Dashboard with mock HR data streaming', async () => {
    await page.goto(BASE_URL)
    await resetState()
    await page.evaluate(() => {
      let heartRate = 70
      setInterval(() => {
        const hrmData = {
          1: {
            userName: 'User 1',
            heartRate,
            zone: 'WARM_UP',
            calories: 10,
          },
        }
        window.postMessage({ type: 'HRM_UPDATE', payload: hrmData }, '*')
        heartRate = 70 + Math.sin(Date.now() / 1000) * 10
      }, 100)
    })
    await page.waitForSelector('[data-testid="hr-tile-1"]')
    await takeScreenshot('dashboard-hr-streaming')
  })

  test('HR Tiles - all zones', async () => {
    await page.goto(BASE_URL)
    await page.evaluate(() => {
      const zones = ['WARM_UP', 'FAT_BURN', 'CARDIO', 'PEAK', 'MAX']
      const hrmData = Object.fromEntries(
        zones.map((zone, i) => [
          i + 1,
          {
            userName: `User ${i + 1}`,
            heartRate: 80 + i * 20,
            zone,
            calories: 10 * (i + 1),
          },
        ])
      )
      window.postMessage({ type: 'HRM_UPDATE', payload: hrmData }, '*')
    })
    await page.waitForSelector('[data-testid="hr-tile-5"]')
    await takeScreenshot('hr-tiles-all-zones')
  })
})

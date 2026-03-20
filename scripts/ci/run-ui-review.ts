import { chromium } from '@playwright/test'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fs from 'fs'
import { execFileSync } from 'child_process'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function performUIReview() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  })

  const targetUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000'

  await context.addCookies([{ name: 'session-id', value: 'mock', url: targetUrl }])

  const page = await context.newPage()
  const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000'
  const targetUrl = new URL(baseUrl)
  targetUrl.searchParams.set('testing', 'true')

  try {
    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle' })

    await page.waitForSelector('[data-testid="main-content-layout"]', {
      state: 'visible',
      timeout: 30000,
    })

    // Inject mock application state so the UI review has something to analyze
    await page.waitForFunction(() => !!(window as any).__TEST_CONTROLS__)
    await page.evaluate(() => {
      const dispatch = (window as any).__TEST_CONTROLS__.dispatch
      
      // Timer Simulation
      dispatch({
        type: 'TIMER_UPDATE',
        payload: {
          isRunning: true,
          currentPhase: 'WORK',
          timeRemaining: 15,
          timeElapsed: 45,
          caloriesBurned: 12,
          mode: 'TABATA',
          workDuration: 30,
          restDuration: 10,
          soundEventId: 0
        }
      })
      
      // HRM Simulation
      dispatch({
        type: 'HRM_UPDATE',
        payload: [{
          clientId: 'mock-1',
          value: 155,
          zone: 'Aerobic',
          percentage: 85,
          name: 'Mock Device',
          calories: 120
        }]
      })
      
      // Spotify Simulation
      dispatch({ type: 'SPOTIFY_SERVICE_INIT_UPDATE', payload: true })
      dispatch({
        type: 'SPOTIFY_UPDATE',
        payload: {
          devices: [],
          playback: {
            track: {
              id: 'track-1',
              name: 'UI Review Track',
              artist: 'Gemini',
              albumName: 'Review Album',
              albumArtUrl: ''
            },
            is_playing: true,
            volume_percent: 50,
            isMuted: false,
            progress_ms: 30000
          }
        }
      })
    })

    // Force layout stabilization for the screenshot
    await page.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
    await page.waitForTimeout(2000)

    const screenshotPath = 'ui-snapshot.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
    })

    const prompt = `
      Act as a Senior UX Architect and Accessibility Expert.
      Analyze this HRM (Heart Rate Monitor) application screenshot for:

      1. **Visual Regressions**: Identify overlapping text, broken Material-UI components, or alignment shifts.
      2. **WCAG Compliance**: Identify low-contrast areas (especially the Timer text against PhaseBackground) or missing focus indicators.
      3. **Hierarchy & UX**: Evaluate the primary CTA visibility. Is it clear to the user what the current state is (e.g., has the workout started)?
      4. **Material-UI Best Practices**: Check for consistent 16px gutters between cards and proper use of high-density list items.
      5. **Feedback**: Provide a concise list of actionable UI improvements.

      Be specific. Mention component names or areas of the screen.
      Return your analysis as a markdown string.
    `

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: Buffer.from(fs.readFileSync(screenshotPath)).toString('base64'),
          mimeType: 'image/png',
        },
      },
    ])

    const feedback = result.response.text()

    const prNumber = process.env.PR_NUMBER
    if (prNumber) {
      const body = `### 🤖 Gemini UI Review\n\n${feedback}\n\n---\n*This review was triggered by the @gemini-ui-review command.*`

      execFileSync('gh', ['pr', 'comment', prNumber, '--body', body], {
        stdio: 'inherit',
      })
    } else {
      console.log(feedback)
    }
  } catch (error) {
    console.error('❌ UI review execution failed:', error)
    process.exit(1)
  } finally {
    await browser.close()
    fs.rmSync('ui-snapshot.png', { force: true })
  }
}

performUIReview().catch((err) => {
  console.error('💥 Fatal UI Review error:', err)
  process.exit(1)
})

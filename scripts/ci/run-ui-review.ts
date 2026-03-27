import { chromium } from '@playwright/test'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Octokit } from '@octokit/rest'
import type { ServerMessage } from '../../types/websocket'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function performUIReview() {
  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  })

  const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000'

  await context.addCookies([
    { name: 'session-id', value: 'mock', url: baseUrl },
  ])

  const page = await context.newPage()
  const targetUrl = new URL(baseUrl)
  targetUrl.searchParams.set('testing', 'true')

  try {
    await page.goto(targetUrl.toString(), { waitUntil: 'networkidle' })

    await page.waitForSelector('[data-testid="main-content-layout"]', {
      state: 'visible',
      timeout: 30000,
    })

    // Inject mock application state so the UI review has something to analyze
    await page.waitForFunction(
      () =>
        !!(window as unknown as { __TEST_CONTROLS__: boolean })
          .__TEST_CONTROLS__
    )

    // Build type-safe messages outside evaluate to ensure types are correct at compile time
    const timerMessage: ServerMessage = {
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
        soundEventId: 0,
      },
    }

    const hrmMessage: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [
        {
          clientId: 'mock-1',
          value: 155,
          maxHr: 185,
          zone: 'ZONE_3',
          percentage: 85,
          name: 'Mock Device',
          calories: 120,
        },
      ],
    }

    const spotifyInitMessage: ServerMessage = {
      type: 'SPOTIFY_SERVICE_INIT_UPDATE',
      payload: true,
    }

    const spotifyMessage: ServerMessage = {
      type: 'SPOTIFY_UPDATE',
      payload: {
        devices: [],
        playback: {
          track: {
            id: 'track-1',
            name: 'UI Review Track',
            artist: 'Gemini',
            albumName: 'Review Album',
            albumArtUrl: '',
          },
          is_playing: true,
          volume_percent: 50,
          isMuted: false,
          progress_ms: 30000,
        },
      },
    }

    await page.evaluate(
      ({ timerMsg, hrmMsg, spotifyInitMsg, spotifyMsg }) => {
        const dispatch = (
          window as unknown as {
            __TEST_CONTROLS__: { dispatch: (msg: ServerMessage) => void }
          }
        ).__TEST_CONTROLS__.dispatch
        dispatch(timerMsg)
        dispatch(hrmMsg)
        dispatch(spotifyInitMsg)
        dispatch(spotifyMsg)
      },
      {
        timerMsg: timerMessage,
        hrmMsg: hrmMessage,
        spotifyInitMsg: spotifyInitMessage,
        spotifyMsg: spotifyMessage,
      }
    )

    // Force layout stabilization for the screenshot
    await page.addStyleTag({
      content: `[data-testid="main-content-layout"] { opacity: 1 !important; transform: none !important; }`,
    })
    await page.waitForTimeout(2000)

    const screenshotBuffer = await page.screenshot({ fullPage: true })

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
          data: screenshotBuffer.toString('base64'),
          mimeType: 'image/png',
        },
      },
    ])

    const response = await result.response
    const feedback =
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No feedback generated.'

    const prNumber = process.env.PR_NUMBER
    const githubToken = process.env.GITHUB_TOKEN
    const repoFullName = process.env.GITHUB_REPOSITORY

    if (prNumber && githubToken && repoFullName) {
      const body = `### 🤖 Gemini UI Review\n\n${feedback}\n\n---\n*This review was triggered by the @gemini-ui-review command.*`
      const [owner, repo] = (repoFullName as string).split('/')

      const octokit = new Octokit({ auth: githubToken })
      await octokit.rest.issues.createComment({
        owner: owner as string,
        repo: repo as string,
        issue_number: parseInt(prNumber as string, 10),
        body,
      })
      console.log(`✅ Successfully posted UI review to PR #${prNumber}`)
    } else {
      console.log(feedback)
    }
  } catch (error) {
    console.error('❌ UI review execution failed:', error)
    process.exit(1)
  } finally {
    await browser.close().catch(console.error)
  }
}

performUIReview().catch((err) => {
  console.error('💥 Fatal UI Review error:', err)
  process.exit(1)
})

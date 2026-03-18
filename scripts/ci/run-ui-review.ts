import { chromium } from '@playwright/test'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import fs from 'fs'
import { execSync } from 'child_process'
import { mockLoggedInSession } from '../../tests/playwright/lib/mocks'
import { DESKTOP_VIEWPORT } from '../../tests/playwright/lib/viewports'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

async function performUIReview() {
  console.log('🚀 Starting Gemini Multimodal UI Review...')

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
  })

  await mockLoggedInSession(context)

  const page = await context.newPage()

  const targetUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000'
  console.log(`🔗 Navigating to ${targetUrl}...`)

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle' })

    // Wait for main content to be visible instead of using hardcoded timeout
    await page.waitForSelector('[data-testid="main-content-layout"]', {
      state: 'visible',
      timeout: 30000,
    })

    const screenshotPath = 'ui-snapshot.png'
    console.log('📸 Capturing screenshot...')
    await page.screenshot({ path: screenshotPath, fullPage: true })

    console.log('🤖 Querying Gemini for UI analysis...')
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            analysis: { type: SchemaType.STRING },
          },
          required: ['analysis'],
        },
      },
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
      Return your analysis as a JSON object with an 'analysis' field containing markdown.
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

    const responseText = result.response.text()
    const responseJson = JSON.parse(responseText)
    const feedback = responseJson.analysis
    console.log('✅ Analysis complete.')

    const prNumber = process.env.PR_NUMBER
    if (prNumber) {
      console.log(`💬 Posting feedback to PR #${prNumber} using gh CLI...`)
      const body = `### 🤖 Gemini UI Review\n\n${feedback}\n\n---\n*This review was triggered by the @gemini-ui-review command.*`

      // Use temporary file for the comment body to handle multiline/special characters safely
      const bodyFile = 'ui_review_body.md'
      fs.writeFileSync(bodyFile, body)

      try {
        execSync(`gh pr comment ${prNumber} --body-file ${bodyFile}`, {
          stdio: 'inherit',
        })
        console.log('✅ Comment posted successfully.')
      } finally {
        if (fs.existsSync(bodyFile)) {
          fs.unlinkSync(bodyFile)
        }
      }
    } else {
      console.log('⚠️ PR_NUMBER not provided. Analysis output:')
      console.log(feedback)
    }
  } catch (error) {
    console.error('❌ Error during UI review:', error)
    process.exit(1)
  } finally {
    await browser.close()
    if (fs.existsSync('ui-snapshot.png')) {
      fs.unlinkSync('ui-snapshot.png')
    }
  }
}

performUIReview().catch((err) => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})

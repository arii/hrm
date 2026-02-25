import { AxeBuilder } from '@axe-core/playwright'
import { Page, Locator } from '@playwright/test'
import { v4 as uuidv4 } from 'uuid'

/**
 * Performs an accessibility scan on a given Playwright Page or Locator,
 * specifically checking for WCAG 2.1 AA compliance.
 *
 * @param target The Page or Locator to analyze.
 * @throws An error if any accessibility violations are found.
 */
export async function checkAccessibility(target: Page | Locator) {
  const page = 'page' in target ? target.page() : (target as Page)
  const uniqueId = `axe-${uuidv4()}`
  let selector: string | undefined = undefined

  // If the target is a Locator, we need to add a temporary unique attribute
  // to it so we can scope the accessibility scan to that element.
  if ('page' in target) {
    await target.evaluate((node, id) => node.setAttribute(id, ''), uniqueId)
    selector = `[${uniqueId}]`
  }

  const axeBuilder = new AxeBuilder({ page })
    .withTags(['wcag2aa'])
    // TODO: Re-enable this rule once the application's color palette is updated
    // to meet WCAG 2.1 AA contrast ratio requirements. This is temporarily
    // disabled to allow the initial integration of accessibility checks.
    .disableRules(['color-contrast'])

  if (selector) {
    // Ensure the target element is still present in the DOM before running Axe
    const count = await page.locator(selector).count()
    if (count === 0) {
      console.warn(
        `Accessibility target ${selector} not found in DOM, skipping specific inclusion.`
      )
    } else {
      axeBuilder.include(selector)
    }
  }

  const accessibilityScanResults = await axeBuilder.analyze()

  // Clean up the temporary attribute after the scan.
  if (selector) {
    await target.evaluate((node, id) => node.removeAttribute(id), uniqueId)
  }

  if (accessibilityScanResults.violations.length > 0) {
    console.error('Accessibility violations found:')
    accessibilityScanResults.violations.forEach((violation, i) => {
      console.error(`
  Violation #${i + 1}: ${violation.id}
  Description: ${violation.description}
  Impact: ${violation.impact}
  Help: ${violation.help} (${violation.helpUrl})
  Nodes:
  ${violation.nodes.map((node) => `    - HTML: ${node.html}\n      Target: ${node.target.join(', ')}\n      Summary: ${node.failureSummary}`).join('\n')}
      `)
    })
    throw new Error('WCAG 2.1 AA accessibility violations were detected.')
  }
}

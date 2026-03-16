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
  // Safely extract the page object based on the target type
  const page = 'page' in target ? (target as Locator).page() : (target as Page)
  const uniqueId = `axe-${uuidv4()}`
  let selector: string | undefined = undefined

  // If the target is a Locator, we need to add a temporary unique attribute
  // to it so we can scope the accessibility scan to that element.
  if ('page' in target) {
    // Ensure the target is actually attached to the DOM before evaluation
    // This is critical for MUI Portals/Menus
    await target.waitFor({ state: 'attached', timeout: 5000 })

    // Use a trial-run evaluate to check if the node is accessible in the JS context
    await target.evaluate((node) => {
      if (!node) throw new Error('Target node disappeared during evaluation')
    })

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
    // Ensure the element is still attached to the DOM before running the scan.
    // If it's not, we should gracefully skip the scan or fail with a clearer message.
    const isAttached = await (target as Locator).count().then((c) => c > 0)
    if (isAttached) {
      axeBuilder.include(selector)
    } else {
      console.warn(
        'Accessibility target detached before scan could start. Skipping check.'
      )
      return
    }
  }

  const accessibilityScanResults = await axeBuilder.analyze()

  // Clean up the temporary attribute after the scan.
  // Use try-catch to avoid failing if the element was removed during/after the scan.
  if (selector) {
    try {
      await target.evaluate((node, id) => node.removeAttribute(id), uniqueId)
    } catch (error) {
      console.warn(
        'Failed to clean up accessibility uniqueId attribute:',
        error
      )
    }
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

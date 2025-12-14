/**
 * @fileoverview
 * This script serves as the global setup for all Playwright test runs.
 * Its primary responsibility is to prepare the testing environment, including
 * cleaning up any artifacts from previous runs to ensure a clean slate.
 */

import { cleanArtifacts } from '../utils/artifacts'

/**
 * The global setup function that is executed once before any tests are run.
 * It calls the `cleanArtifacts` utility to remove the entire test artifact
 * directory, preventing stale data from affecting test results.
 *
 * @async
 * @returns {Promise<void>} A promise that resolves when the setup is complete.
 */
async function globalSetup(): Promise<void> {
  console.log('🧹  Cleaning up test artifacts from previous runs...')
  await cleanArtifacts()
  console.log('✅  Artifact cleanup complete. Starting test run.')
}

export default globalSetup

/**
 * @fileoverview
 * This file provides utility functions for managing test artifacts, including
 * creating directories and cleaning up previous test outputs. It is designed
 * to be used in test setup and teardown scripts to ensure a consistent and
 * clean testing environment.
 */

import fs from 'fs'
import path from 'path'

/**
 * The base directory for all test artifacts. Can be overridden by the
 * TEST_ARTIFACT_DIR environment variable for CI/CD or custom workflows.
 * @type {string}
 */
const ARTIFACT_DIR = process.env.TEST_ARTIFACT_DIR || 'tests/artifacts'

/**
 * Ensures that a subdirectory within the main artifact directory exists.
 * If the directory does not exist, it is created recursively.
 *
 * @param {string} subDir - The name of the subdirectory (e.g., 'screenshots', 'logs').
 * @returns {string} The full, resolved path to the subdirectory.
 * @throws {Error} If the directory cannot be created.
 */
export function ensureArtifactDir(subDir: string): string {
  const dirPath = path.resolve(ARTIFACT_DIR, subDir)
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    return dirPath
  } catch (error) {
    console.error(`Failed to create artifact directory: ${dirPath}`, error)
    throw new Error(`Could not create artifact directory: ${dirPath}`)
  }
}

/**
 * Cleans the entire artifact directory by removing it and all its contents.
 * This is useful for ensuring a clean slate before a test run.
 *
 * @returns {void}
 * @throws {Error} If the directory cannot be removed.
 */
export function cleanArtifacts(): void {
  const dirPath = path.resolve(ARTIFACT_DIR)
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
      console.log(`Successfully cleaned artifact directory: ${dirPath}`)
    } else {
      console.log(
        `Artifact directory does not exist, skipping cleanup: ${dirPath}`
      )
    }
  } catch (error) {
    console.error(`Failed to clean artifact directory: ${dirPath}`, error)
    throw new Error(`Could not clean artifact directory: ${dirPath}`)
  }
}

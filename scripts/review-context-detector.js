#!/usr/bin/env node

/**
 * @fileoverview Detects the primary context of a Pull Request based on its changed files.
 * This script is used in the Gemini code review workflow to select the appropriate review template.
 *
 * @usage node scripts/review-context-detector.js <file1> <file2> ...
 * @output The detected context string (e.g., 'timer-performance', 'ui-component', 'general')
 */

const changedFiles = process.argv.slice(2);

if (changedFiles.length === 0) {
  // Default to 'general' if no files are provided for some reason.
  console.log('general');
  process.exit(0);
}

function detectPRContext(files) {
  if (files.some(f => f.includes('timer'))) {
    return 'timer-performance';
  }
  if (files.some(f => f.includes('components/'))) {
    return 'ui-component';
  }
  if (files.some(f => f.includes('spotify'))) {
    return 'spotify-integration';
  }
  return 'general';
}

const context = detectPRContext(changedFiles);
console.log(context);

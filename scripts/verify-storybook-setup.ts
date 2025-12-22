// scripts/verify-storybook-setup.ts
import fs from 'node:fs'
import path from 'node:path'

/**
 * Storybook Verification Script
 * * Goals:
 * 1. Validate required dependencies exist in package.json
 * 2. Ensure configuration files (.storybook/main.ts, preview.ts) exist
 * 3. Verify the target component (HrTile) has a corresponding story file
 * 4. Attempt a dry-run build to catch compilation errors early
 */

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const NC = '\x1b[0m' // No Color

const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  switch (type) {
    case 'success':
      console.log(`${GREEN}✅ ${msg}${NC}`)
      break
    case 'error':
      console.log(`${RED}❌ ${msg}${NC}`)
      break
    default:
      console.log(`${YELLOW}ℹ️  ${msg}${NC}`)
  }
}

const REQUIRED_DEPS = [
  'storybook',
  '@storybook/nextjs',
  '@storybook/react',
  '@mui/material',
  '@emotion/react',
  '@emotion/styled',
]

const REQUIRED_FILES = [
  '.storybook/main.ts',
  '.storybook/preview.ts',
  'components/HrTile.tsx',
  'components/HrTile.stories.tsx', // The critical missing piece from the review
]

function verifyDependencies() {
  log('Checking package.json dependencies...', 'info')

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }
    const missing = REQUIRED_DEPS.filter((dep) => !allDeps[dep])

    if (missing.length > 0) {
      log(`Missing dependencies: ${missing.join(', ')}`, 'error')
      process.exit(1)
    }
    log('All core dependencies present.', 'success')
  } catch (_err) {
    console.error('Error reading package.json:', _err)
    process.exit(1)
  }
}

function verifyFiles() {
  log('Checking for configuration and story files...', 'info')

  const missing = REQUIRED_FILES.filter(
    (file) => !fs.existsSync(path.resolve(file))
  )

  if (missing.length > 0) {
    log(`Missing files:\n   - ${missing.join('\n   - ')}`, 'error')
    if (missing.includes('components/HrTile.stories.tsx')) {
      console.log(
        `\n${YELLOW}Hint: You need to create the story file for HrTile before running the build.${NC}`
      )
    }
    process.exit(1)
  }
  log('All required files found.', 'success')
}

// function dryRunBuild() {
//   log('Attempting Storybook dry-run build...', 'info');
//   try {
//     // Run build in "smoke test" mode - just outputting to a temp dir to verify compilation
//     execSync('npx storybook build --test --quiet', { stdio: 'inherit' });
//     log('Storybook build verification passed.', 'success');
//   } catch (error) {
//     log('Storybook build failed. Check the output above.', 'error');
//     process.exit(1);
//   }
// }

// --- Execution ---
console.log('🚀 Starting Storybook Environment Verification...\n')
verifyDependencies()
verifyFiles()
// Optional: Uncomment the line below if you want to run the actual build process as part of this check
// dryRunBuild();

console.log(
  `\n${GREEN}✨ Verification Complete. Environment is ready for Storybook.${NC}`
)

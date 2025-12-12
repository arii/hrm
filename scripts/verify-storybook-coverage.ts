
import fs from 'node:fs';
import path from 'node:path';

/**
 * Storybook Verification Script
 * Goals:
 * 1. Validate required dependencies exist in package.json
 * 2. Ensure configuration files (.storybook/main.ts, preview.ts) exist
 * 3. Verify all components have a corresponding story file
 */

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const NC = '\x1b[0m'; // No Color

const log = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
  switch (type) {
    case 'success': console.log(`${GREEN}✅ ${msg}${NC}`); break;
    case 'error': console.log(`${RED}❌ ${msg}${NC}`); break;
    default: console.log(`${YELLOW}ℹ️  ${msg}${NC}`);
  }
};

const REQUIRED_DEPS = [
  'storybook',
  '@storybook/nextjs',
  '@storybook/react',
  '@mui/material',
  '@emotion/react',
  '@emotion/styled'
];

const REQUIRED_FILES = [
  '.storybook/main.ts',
  '.storybook/preview.ts',
];

function verifyDependencies() {
  log('Checking package.json dependencies...', 'info');

  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const missing = REQUIRED_DEPS.filter(dep => !allDeps[dep]);

    if (missing.length > 0) {
      log(`Missing dependencies: ${missing.join(', ')}`, 'error');
      process.exit(1);
    }
    log('All core dependencies present.', 'success');
  } catch (err) {
    log('Could not read package.json', 'error');
    process.exit(1);
  }
}

function verifyConfigFiles() {
  log('Checking for configuration files...', 'info');

  const missing = REQUIRED_FILES.filter(file => !fs.existsSync(path.resolve(file)));

  if (missing.length > 0) {
    log(`Missing files:\n   - ${missing.join('\n   - ')}`, 'error');
    process.exit(1);
  }
  log('All required config files found.', 'success');
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles;
}

function verifyCoverage() {
    log('Checking component coverage...', 'info');
    const componentsDir = path.resolve(process.cwd(), 'components');
    const allFiles = getAllFiles(componentsDir);

    const componentFiles = allFiles.filter(
    (file) =>
        file.endsWith('.tsx') &&
        !file.endsWith('.stories.tsx') &&
        !file.endsWith('.test.tsx') &&
        !file.includes('__tests__')
    );

    const storyFiles = allFiles.filter((file) => file.endsWith('.stories.tsx'));

    const missingStories: string[] = [];

    componentFiles.forEach((componentFile) => {
    const dir = path.dirname(componentFile);
    const name = path.basename(componentFile, '.tsx');
    const storyFile = path.join(dir, `${name}.stories.tsx`);

    if (!fs.existsSync(storyFile)) {
        missingStories.push(path.relative(process.cwd(), componentFile));
    }
    });

    const coverage = ((componentFiles.length - missingStories.length) / componentFiles.length) * 100;

    console.log('\n📊 Storybook Coverage Report');
    console.log('============================');
    console.log(`Total Components: ${componentFiles.length}`);
    console.log(`Total Stories:    ${storyFiles.length}`);
    console.log(`Coverage:         ${coverage.toFixed(1)}%\n`);

    if (missingStories.length > 0) {
    console.log('❌ Missing Stories for:');
    missingStories.forEach((file) => console.log(`   - ${file}`));
    console.log('\nTo scaffold a story, run:');
    console.log(`npm run storybook:scaffold <path-to-component>`);
    process.exit(1);
    } else {
    log('All components have stories!', 'success');
    }
}

// --- Execution ---
console.log('🚀 Starting Storybook Verification...\n');
verifyDependencies();
verifyConfigFiles();
verifyCoverage();

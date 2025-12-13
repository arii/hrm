// tests/integration/jest.global-setup.js
const { execSync } = require('child_process');

module.exports = async () => {
  console.log('\nRunning Jest Global Setup: Building the application...');
  try {
    execSync('pnpm run build', { stdio: 'pipe' });
    console.log('Application build complete.');
  } catch (error) {
    console.error('Failed to build application in global setup:', error);
    process.exit(1);
  }
};

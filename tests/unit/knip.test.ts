import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';

describe('Knip integration', () => {
  it('should run successfully and report issues', () => {
    // Run knip and assert that it reports unused devDependencies
    try {
      execSync('pnpm exec knip');
    } catch (error) {
      const output = error.stdout.toString();
      expect(output).toContain('Unused devDependencies');
    }
  });

  it('should fail the build if it detects new issues', () => {
    // Introduce a temporary unused dependency to package.json
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    packageJson.dependencies['unused-dependency'] = '1.0.0';
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    // Run knip and assert that it exits with a non-zero status code
    expect(() => execSync('pnpm exec knip')).toThrow();

    // Clean up the temporary change to package.json
    delete packageJson.dependencies['unused-dependency'];
    writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
  });
});

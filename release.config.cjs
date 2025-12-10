/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: [
    'leader', // Main production branch
    { name: 'beta', prerelease: true }, // Beta channel
  ],
  plugins: [
    // 1. Analyze commits to determine version (feat->minor, fix->patch, BREAKING->major)
    '@semantic-release/commit-analyzer',

    // 2. Generate release notes
    '@semantic-release/release-notes-generator',

    // 3. Update changelog file
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
      },
    ],

    // 4. Update package.json version
    [
      '@semantic-release/npm',
      {
        npmPublish: false, // Set to true if publishing to npm registry
      },
    ],

    // 5. Commit the version bump and changelog back to the repo
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],

    // 6. Create GitHub Release
    '@semantic-release/github',
  ],
}

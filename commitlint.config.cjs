module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 0 = disable rule. We want to allow Sentence case, lowercase, etc.
    'subject-case': [0],

    // Increase limits to accommodate descriptive AI-generated summaries
    'subject-max-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100],

    // Disable body line length constraints to allow pasting logs/stack traces
    'body-max-line-length': [0],
  },
  helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
}

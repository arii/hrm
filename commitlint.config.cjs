module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce lowercase subject to handle AI-generated commits
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Allow slightly longer subjects for AI-generated descriptive messages
    'subject-max-length': [2, 'always', 100],
  },
}

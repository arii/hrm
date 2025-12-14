// File: tests/unit/custom-resolver.js
module.exports = (testPath) => {
  if (testPath.includes('tests/unit/client')) {
    return 'jsdom';
  }
  return 'node';
};

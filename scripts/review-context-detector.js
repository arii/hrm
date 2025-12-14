// scripts/review-context-detector.js
function detectPRContext(changedFiles) {
  if (changedFiles.some(f => f.includes('timer'))) {
    return 'timer-performance';
  }
  if (changedFiles.some(f => f.includes('components/'))) {
    return 'ui-component';
  }
  if (changedFiles.some(f => f.includes('spotify'))) {
    return 'spotify-integration';
  }
  return 'general';
}

module.exports = { detectPRContext };

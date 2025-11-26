# HRM Testing Guide

## Test Commands Overview

### Development Testing

```bash
# Start development server
npm run dev

# Run visual regression tests (headless)
npm run test:visual

# Run tests with browser visible
npm run test:visual:headed

# Update visual test snapshots after UI changes
npm run test:visual:update
```

### Clean Testing (Restart Server)

```bash
# Kill all processes, start server, run tests
npm run test:clean

# Kill all processes, start server, update snapshots
npm run test:clean:update

# Kill all running processes manually
npm run kill-all
```

### Comprehensive Testing

```bash
# Run full user journey tests with progress tracking
npm run test:comprehensive



# View detailed test report in browser
npm run test:visual:report
```

### Code Quality

```bash
# Run ESLint checks
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Format code with Prettier
npm run format

# Check code formatting
npm run format:check
```

### Integration Testing

```bash
# Test Spotify integration
npm run verify:spotify
```

## Test Use Cases

### 1. Visual Regression Testing

**Purpose**: Ensure UI changes don't break existing layouts
**Command**: `npm run test:visual`
**When to use**: Before committing UI changes

### 2. Snapshot Updates

**Purpose**: Update test snapshots after intentional UI changes
**Command**: `npm run test:visual:update`
**When to use**: After confirming UI changes are correct

### 3. Interactive Testing

**Purpose**: Debug test failures with visible browser
**Command**: `npm run test:visual:headed`
**When to use**: When tests fail and you need to see what's happening

### 4. Clean Environment Testing

**Purpose**: Test with fresh server state
**Command**: `npm run test:clean`
**When to use**: When tests fail due to server state issues

### 5. Comprehensive Assessment

**Purpose**: Full user journey testing with progress tracking
**Command**: `npm run test:comprehensive`
**When to use**: Before releases or major changes

### 6. Process Management

**Purpose**: Clean up stuck processes
**Command**: `npm run kill-all`
**When to use**: When tests hang or server won't start

## Test Structure

### Visual Regression Tests

- **File**: `tests/playwright/visual-regression.spec.ts`
- **Coverage**: Dashboard, control panel, mock HRM, connect page
- **Screenshots**: Stored in `tests/playwright/screenshots/`

### Comprehensive Assessment Tests

- **File**: `tests/playwright/comprehensive-assessment.spec.ts`
- **Coverage**: Complete user journeys, HR zone testing, multi-device coordination
- **Features**: Progress tracking, video recording, stable iframe content

## Test Configuration

### Playwright Config

- **Browser**: Chromium only (1920x1080)
- **Workers**: 1 (prevents server race conditions)
- **Video**: Enabled for comprehensive tests
- **Screenshots**: On failure only

### Page Ready Signals

All pages implement `__TEST_READY__` signals:

- **Dashboard**: 2 second delay
- **Control Panel**: 1.5 second delay
- **Mock HRM**: 1 second delay

## Troubleshooting

### Common Issues

1. **Server not starting**: Run `npm run kill-all` first
2. **Test timeouts**: Use `npm run test:clean` for fresh server
3. **Video recording**: Set `RECORD_VIDEO=true` and use pause points
4. **Snapshot mismatches**: Run `npm run test:visual:update` after confirming changes

### Debug Commands

```bash
# View test report
npm run test:visual:report

# Check server logs
npm run pm2:logs

# Restart server
npm run pm2:restart
```

## Best Practices

1. **Always run clean tests** before committing
2. **Update snapshots carefully** - verify changes are intentional
3. **Use headed mode** for debugging test failures
4. **Kill processes** between test runs to avoid conflicts
5. **Check test reports** for detailed failure information

# HRM Testing Guide

## Test Commands Overview

### Development Testing

```bash
# Start development server
pnpm run dev

# Run visual regression tests (headless)
pnpm run test:visual

# Run tests with browser visible
pnpm run test:visual:headed

# Update visual test snapshots after UI changes
pnpm run test:visual:update
```

### Clean Testing (Restart Server)

```bash
# Kill all processes, start server, run tests
pnpm run test:clean

# Kill all processes, start server, update snapshots
pnpm run test:clean:update

# Kill all running processes manually
pnpm run kill-all
```

### Comprehensive Testing

```bash
# Run full user journey tests with progress tracking
pnpm run test:comprehensive



# View detailed test report in browser
pnpm run test:visual:report
```

### Code Quality

```bash
# Run ESLint checks
pnpm run lint

# Fix ESLint issues automatically
pnpm run lint:fix

# Format code with Prettier
pnpm run format

# Check code formatting
pnpm run format:check
```

### Integration Testing

```bash
# Test Spotify integration
pnpm run verify:spotify
```

## Test Use Cases

### 1. Visual Regression Testing

**Purpose**: Ensure UI changes don't break existing layouts
**Command**: `pnpm run test:visual`
**When to use**: Before committing UI changes

### 2. Snapshot Updates

**Purpose**: Update test snapshots after intentional UI changes
**Command**: `pnpm run test:visual:update`
**When to use**: After confirming UI changes are correct

### 3. Interactive Testing

**Purpose**: Debug test failures with visible browser
**Command**: `pnpm run test:visual:headed`
**When to use**: When tests fail and you need to see what's happening

### 4. Clean Environment Testing

**Purpose**: Test with fresh server state
**Command**: `pnpm run test:clean`
**When to use**: When tests fail due to server state issues

### 5. Comprehensive Assessment

**Purpose**: Full user journey testing with progress tracking
**Command**: `pnpm run test:comprehensive`
**When to use**: Before releases or major changes

### 6. Process Management

**Purpose**: Clean up stuck processes
**Command**: `pnpm run kill-all`
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

1. **Server not starting**: Run `pnpm run kill-all` first
2. **Test timeouts**: Use `pnpm run test:clean` for fresh server
3. **Video recording**: Set `RECORD_VIDEO=true` and use pause points
4. **Snapshot mismatches**: Run `pnpm run test:visual:update` after confirming changes

### Debug Commands

```bash
# View test report
pnpm run test:visual:report

# Check server logs
pnpm run pm2:logs

# Restart server
pnpm run pm2:restart
```

## Best Practices

1. **Always run clean tests** before committing
2. **Update snapshots carefully** - verify changes are intentional
3. **Use headed mode** for debugging test failures
4. **Kill processes** between test runs to avoid conflicts
5. **Check test reports** for detailed failure information

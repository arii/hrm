# Unit Testing Guide

## Running Tests

```bash
# Run all unit tests
npm test
# or
npm run test:unit

# Run tests in watch mode (auto-rerun on file changes)
npm run test:unit:watch

# Run tests with coverage report
npm run test:unit:coverage
```

## Test Organization

Unit tests are located in `tests/unit/` and focus on testing individual services and their interactions:

### TabataTimer Service Tests (`tests/unit/tabataTimer.test.ts`)
- **Initialization**: Verify default state and configuration
- **Mode Switching**: Test STOPWATCH ↔ TABATA transitions
- **Stopwatch Mode**: Count-up functionality, pause/resume, reset
- **Tabata Mode**: Phase transitions (PREPARE → WORK → REST → COOLDOWN), cycle counting
- **Configuration**: Work/rest duration changes, cycle count updates
- **State-Dependent Commands**: START when inactive, PAUSE when running
- **Sound Cues**: Verify audio cues for phase transitions
- **Broadcasting**: State updates sent to clients

### Spotify Service Tests (`tests/unit/spotifyPolling.test.ts`)
- **Initialization**: Default awaiting login state
- **Command Handling**: PLAY, PAUSE, NEXT, PREVIOUS commands
- **Volume Control**: SET_VOLUME command, clamping to 0-100 range
- **Device Management**: List devices, transfer playback
- **Token Management**: Refresh token handling
- **Integration with Timer**: Commands triggered by timer events

### WebSocket Manager Tests (`tests/unit/socketManager.test.ts`)
- **Dashboard Updates**: Timer mode changes, duration changes broadcast to clients
- **State-Dependent UI**: Timer state (active/inactive) reflected in broadcasts
- **Volume Changes**: Beep volume and Spotify volume command handling
- **Service Integration**: Timer and Spotify services work independently
- **Complete Workflows**: Full workout cycle with timer + Spotify integration

## Test Coverage

The unit tests verify:

✅ **Timer Modes**
- Stopwatch functionality
- Tabata timer with configurable work/rest durations

✅ **Timer State Transitions**
- IDLE → PREPARE → WORK → REST → COOLDOWN flow
- Proper phase transitions between cycles

✅ **Configuration Changes**
- Dynamic work duration updates
- Dynamic rest duration updates
- Cycle count changes

✅ **State-Dependent Controls**
- START button enabled when timer inactive
- PAUSE/STOP buttons enabled when timer active

✅ **Spotify Integration**
- Timer start triggers Spotify NEXT command
- Timer stop triggers Spotify PAUSE command

✅ **Volume Control**
- Beep volume changes affect audio playback
- Spotify volume commands sent to API

✅ **Dashboard Updates**
- Mode changes reflected on dashboard
- Duration changes reflected on dashboard
- Real-time timer state broadcasts

## Writing New Tests

### Example Test Structure

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import TabataTimer from '../../services/tabataTimer'

describe('Feature Name', () => {
  let timer: TabataTimer
  let broadcastMock: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    broadcastMock = jest.fn()
    timer = new TabataTimer(broadcastMock)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should do something', () => {
    // Arrange
    timer.setMode('STOPWATCH')
    
    // Act
    timer.handleCommand('START')
    jest.advanceTimersByTime(1000)
    
    // Assert
    const state = timer.getState()
    expect(state.isRunning).toBe(true)
  })
})
```

### Best Practices

1. **Use Fake Timers**: Always use `jest.useFakeTimers()` when testing timer-based code
2. **Clean Up**: Call `jest.useRealTimers()` in `afterEach()` to prevent test interference
3. **Test One Thing**: Each test should verify a single behavior
4. **Descriptive Names**: Test names should clearly describe what they're testing
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases

## Troubleshooting

### Tests Hang or Timeout
- Ensure `afterEach()` properly stops all timers and intervals
- Use `jest.useRealTimers()` to restore normal timer behavior
- Check for unclosed async operations

### Inconsistent Results
- Use `jest.useFakeTimers()` for deterministic time-based testing
- Clear all mocks with `jest.clearAllMocks()` in `beforeEach()`
- Ensure proper cleanup between tests

### Mock Issues
- Verify mocks are reset between tests
- Check that mock implementations match the real service interfaces
- Use `jest.fn()` for simple mocks, `jest.spyOn()` for partial mocks

## Integration with CI/CD

The unit tests run automatically in CI/CD pipelines:

```bash
# In CI
npm install
npm run test:unit
```

Tests must pass before code can be merged to main branch.

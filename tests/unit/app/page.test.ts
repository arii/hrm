import { resolveDashboardProps } from '@/app/page'

describe('resolveDashboardProps', () => {
  const prodEnv = {
    NODE_ENV: 'production',
  }

  it('resolves to the single native renderer (no renderer flags)', () => {
    // The ?native override and NEXT_PUBLIC_USE_NATIVE_TABLE flag are
    // retired: the page always renders WorkoutPhaseGrid over
    // /api/workout, so props carry no renderer selection.
    expect(resolveDashboardProps({}, prodEnv)).toEqual({
      triggerError: false,
    })
  })

  it.each([
    ['legacy ?native=true is ignored', { native: 'true' }, false],
    ['legacy ?native=false is ignored', { native: 'false' }, false],
    ['legacy array value is ignored', { native: ['true', 'false'] }, false],
  ])('%s', (_name, params, _expected) => {
    // Asserting the full shape: the legacy param must not leak into
    // props under its old key either.
    expect(resolveDashboardProps(params, prodEnv)).toEqual({
      triggerError: false,
    })
  })

  it.each([
    ['test-error=true in development', { 'test-error': 'true' }, {}, true],
    ['test-error=true in production', { 'test-error': 'true' }, prodEnv, false],
    ['missing flag in development', {}, {}, false],
    ['flag=false in development', { 'test-error': 'false' }, {}, false],
    [
      'array flag reads the first value',
      { 'test-error': ['true', 'false'] },
      {},
      true,
    ],
  ])('triggerError %s', (_name, params, env, expected) => {
    expect(
      resolveDashboardProps(params, { NODE_ENV: 'development', ...env })
        .triggerError
    ).toBe(expected)
  })

  it.each([
    [{ NEXT_PUBLIC_WS_URL: 'ws://localhost:3000/x' }, true],
    [{ NEXT_PUBLIC_WS_URL: 'wss://prod.example.com/x' }, false],
    [{ CI: 'true' }, true],
    [{ TESTING: 'true' }, true],
    [{}, false],
  ])('testable environments %p trigger: %p', (env, expected) => {
    expect(
      resolveDashboardProps({ 'test-error': 'true' }, { ...prodEnv, ...env })
        .triggerError
    ).toBe(expected)
  })
})

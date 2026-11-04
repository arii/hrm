import { resolveDashboardProps } from '@/app/page'

describe('resolveDashboardProps', () => {
  const prodEnv = {
    NEXT_PUBLIC_USE_NATIVE_TABLE: false,
    NODE_ENV: 'production',
  }

  it('defaults to iframe table with no error in production', () => {
    expect(resolveDashboardProps({}, prodEnv)).toEqual({
      useNativeTable: false,
      triggerError: false,
    })
  })

  it.each([
    ['native=true forces the native table', { native: 'true' }, true],
    ['native=false opts out explicitly', { native: 'false' }, false],
    ['first array value wins', { native: ['true', 'false'] }, true],
    ['missing native follows the env default (off)', {}, false],
  ])('%s', (_name, params, expected) => {
    expect(resolveDashboardProps(params, prodEnv).useNativeTable).toBe(expected)
  })

  it.each([
    ['env default on', {}, true],
    ['explicit false overrides the env default', { native: 'false' }, false],
    ['explicit true with env default on', { native: 'true' }, true],
  ])('native table %s', (_name, params, expected) => {
    expect(
      resolveDashboardProps(params, {
        ...prodEnv,
        NEXT_PUBLIC_USE_NATIVE_TABLE: true,
      }).useNativeTable
    ).toBe(expected)
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

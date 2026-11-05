import { isTabScopedIdPath, resolveClientId } from '../../../utils/clientId'

const memoryStore = (seed: Record<string, string> = {}) => {
  const data = { ...seed }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    snapshot: () => ({ ...data }),
  }
}

describe('clientId', () => {
  const realWindow = (globalThis as { window?: unknown }).window

  let counter = 0

  beforeEach(() => {
    counter = 0
    ;(globalThis as { window?: unknown }).window = {
      crypto: {
        randomUUID: () => {
          counter += 1
          return `generated-tab-id-${counter}`
        },
      },
    }
  })

  afterEach(() => {
    ;(globalThis as { window?: unknown }).window = realWindow
  })

  it('treats mock routes as tab-scoped, with or without a basePath', () => {
    expect(isTabScopedIdPath('/client/mock')).toBe(true)
    expect(isTabScopedIdPath('/hrm/client/mock')).toBe(true)
    expect(isTabScopedIdPath('/mock')).toBe(true)
  })

  it('keeps every other route on the stable browser id', () => {
    expect(isTabScopedIdPath('/')).toBe(false)
    expect(isTabScopedIdPath('/hrm')).toBe(false)
    expect(isTabScopedIdPath('/client/control')).toBe(false)
    expect(isTabScopedIdPath('/hrm/client/control')).toBe(false)
    expect(isTabScopedIdPath('/client/connect')).toBe(false)
  })

  it('gives mock tabs distinct ids even when the browser id is shared', () => {
    const sharedLocal = memoryStore({ clientId: 'browser-id' })
    const tabA = memoryStore()
    const tabB = memoryStore()
    const idA = resolveClientId(
      { local: sharedLocal, session: tabA },
      '/hrm/client/mock'
    )
    const idB = resolveClientId(
      { local: sharedLocal, session: tabB },
      '/hrm/client/mock'
    )
    expect(idA).not.toBe('browser-id')
    expect(idB).not.toBe('browser-id')
    expect(idA).not.toBe(idB)
  })

  it('reuses the tab id within the same tab', () => {
    const tab = memoryStore()
    const stores = { local: memoryStore(), session: tab }
    const first = resolveClientId(stores, '/client/mock')
    expect(resolveClientId(stores, '/client/mock')).toBe(first)
  })

  it('keeps the stable browser id outside mock routes', () => {
    const stores = {
      local: memoryStore({ clientId: 'browser-id' }),
      session: memoryStore(),
    }
    expect(resolveClientId(stores, '/hrm')).toBe('browser-id')
    expect(resolveClientId(stores, '/')).toBe('browser-id')
  })

  it('falls back to an ephemeral id when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(resolveClientId({ local: broken, session: broken }, '/hrm')).toBe(
      'generated-tab-id-1'
    )
  })
})

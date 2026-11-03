/**
 * @jest-environment node
 */
// tests/unit/utils/network.test.ts
import { fetchWithRetry } from '@/utils/network'

describe('fetchWithRetry base path handling', () => {
  const realFetch = global.fetch
  let fetchMock: jest.Mock
  let savedBasePath: string | undefined
  let savedAuthUrl: string | undefined

  beforeEach(() => {
    savedBasePath = process.env.NEXT_PUBLIC_BASE_PATH
    savedAuthUrl = process.env.NEXTAUTH_URL
    delete process.env.NEXT_PUBLIC_BASE_PATH
    delete process.env.NEXTAUTH_URL
    fetchMock = jest.fn().mockResolvedValue({ ok: true })
    global.fetch = fetchMock
  })

  afterEach(() => {
    if (savedBasePath === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH
    else process.env.NEXT_PUBLIC_BASE_PATH = savedBasePath
    if (savedAuthUrl === undefined) delete process.env.NEXTAUTH_URL
    else process.env.NEXTAUTH_URL = savedAuthUrl
    global.fetch = realFetch
  })

  it('prefixes root-absolute URLs when configured', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    await fetchWithRetry('/api/spotify/access-token')
    expect(fetchMock.mock.calls[0][0]).toBe('/hrm/api/spotify/access-token')
  })

  it('leaves URLs alone without a base path', async () => {
    await fetchWithRetry('/api/spotify/access-token')
    expect(fetchMock.mock.calls[0][0]).toBe('/api/spotify/access-token')
  })

  it('passes absolute URLs through untouched', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/hrm'
    await fetchWithRetry('https://api.spotify.com/v1/me')
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.spotify.com/v1/me')
  })
})

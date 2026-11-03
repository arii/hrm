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

describe('fetchWithRetry retry and error classification', () => {
  const realFetch = global.fetch
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = realFetch
  })

  const httpFailure = (status: number) => ({
    ok: false,
    status,
    statusText: 'error',
    text: () => Promise.resolve('body'),
  })

  it('marks 5xx retryable and does not retry 4xx', async () => {
    fetchMock.mockResolvedValue(httpFailure(500))
    const err5xx = await fetchWithRetry('http://x', {}, 1).catch((e) => e)
    expect(err5xx.code).toBe('HTTP_ERROR_500')
    expect(err5xx.retryable).toBe(true)

    fetchMock.mockResolvedValue(httpFailure(404))
    const err4xx = await fetchWithRetry('http://x', {}, 1).catch((e) => e)
    expect(err4xx.code).toBe('HTTP_ERROR_404')
    expect(err4xx.retryable).toBe(false)
  })

  it('retries then returns the successful response', async () => {
    fetchMock
      .mockResolvedValueOnce(httpFailure(500))
      .mockResolvedValueOnce({ ok: true })
    await expect(fetchWithRetry('http://x', {}, 2)).resolves.toEqual({
      ok: true,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reports caller abort without retrying', async () => {
    const controller = new AbortController()
    controller.abort()
    const err = await fetchWithRetry(
      'http://x',
      { signal: controller.signal },
      3
    ).catch((e) => e)
    expect(err.code).toBe('FETCH_ABORTED')
    expect(err.retryable).toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps timeouts and generic failures to retryable errors', async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, opts: RequestInit) =>
        new Promise((_, reject) => {
          opts.signal?.addEventListener('abort', () =>
            reject(opts.signal?.reason)
          )
        })
    )
    const timeoutErr = await fetchWithRetry('http://x', {}, 1, 20).catch(
      (e) => e
    )
    expect(timeoutErr.code).toBe('NETWORK_TIMEOUT')
    expect(timeoutErr.retryable).toBe(true)

    fetchMock.mockRejectedValueOnce(new Error('boom'))
    const netErr = await fetchWithRetry('http://x', {}, 1).catch((e) => e)
    expect(netErr.code).toBe('NETWORK_ERROR')
    expect(netErr.retryable).toBe(true)
  })
})

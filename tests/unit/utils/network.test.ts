import { fetchWithRetry } from '../../../utils/network'

// Mock the global fetch
global.fetch = jest.fn()

describe('fetchWithRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return response on success (200 OK)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
    })

    const response = await fetchWithRetry('https://api.example.com')
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should not retry on client error (400)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
    })

    await expect(fetchWithRetry('https://api.example.com')).rejects.toThrow(
      'HTTP Error: 400'
    )
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should not retry on unauthorized (401)', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
    })

    await expect(fetchWithRetry('https://api.example.com')).rejects.toThrow(
      'HTTP Error: 401'
    )
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should retry on server error (500)', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 500 }) // Fail 1
      .mockResolvedValueOnce({ ok: false, status: 502 }) // Fail 2
      .mockResolvedValueOnce({ ok: true, status: 200 }) // Success

    const promise = fetchWithRetry('https://api.example.com')

    // 1st retry (0): 500ms
    await jest.advanceTimersByTimeAsync(500)
    // 2nd retry (1): 1000ms
    await jest.advanceTimersByTimeAsync(1000)

    const response = await promise
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('should retry on rate limit (429)', async () => {
    ;(global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 429 }) // Fail 1
      .mockResolvedValueOnce({ ok: true, status: 200 }) // Success

    const promise = fetchWithRetry('https://api.example.com')

    // 1st retry (0): 500ms
    await jest.advanceTimersByTimeAsync(500)

    const response = await promise
    expect(response.status).toBe(200)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('should throw last error after exhausting retries', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
    })

    const promise = fetchWithRetry('https://api.example.com', {}, 3)

    // Suppress unhandled rejection warning during timer advancement
    promise.catch(() => {})

    // 1st retry: 500
    await jest.advanceTimersByTimeAsync(500)
    // 2nd retry: 1000
    await jest.advanceTimersByTimeAsync(1000)
    // 3rd attempt happens, fails, throws. No more retries.

    await expect(promise).rejects.toThrow('HTTP Error: 503')
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('should support user-initiated abort', async () => {
    const controller = new AbortController()

    // Mock fetch to simulate pending request that respects signal
    ;(global.fetch as jest.Mock).mockImplementation(() => {
      return new Promise((resolve, reject) => {
        // If already aborted, reject immediately
        if (controller.signal.aborted) {
          return reject(
            new DOMException('This operation was aborted', 'AbortError')
          )
        }
        // Listen for abort
        controller.signal.addEventListener('abort', () => {
          reject(new DOMException('This operation was aborted', 'AbortError'))
        })
      })
    })

    const fetchPromise = fetchWithRetry('https://api.example.com', {
      signal: controller.signal,
    })

    // Trigger abort
    controller.abort()

    // The fetch implementation throws AbortError (DOMException)
    // fetchWithRetry rethrows it.
    // We match roughly on AbortError or message substring "aborted"
    await expect(fetchPromise).rejects.toThrow(/aborted/i)
  })
})
